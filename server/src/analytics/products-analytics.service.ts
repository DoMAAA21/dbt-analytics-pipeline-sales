import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DuckDbService } from '../duckdb/duckdb.service';
import type { ProductsAnalyticsQueryDto } from './dto/products-analytics-query.dto';
import type {
  DateRange,
  ProductPerformanceRow,
  ProductsAnalyticsResponse,
  ProductsAnalyticsSummary,
  ProductsPortfolio,
  ProductsReimbursements,
  ProductsRevenuePoint,
  ReimbursementPoint,
  ReimbursementProductRow,
} from './analytics.types';

const DEFAULT_RANGE_DAYS = 60;

/** Date-bounded product mart rows (pre-aggregated day × product). */
const PRODUCT_RANGE_CTE = `
WITH params AS (
  SELECT ?::DATE AS start_date, ?::DATE AS end_date
),
product_days AS (
  SELECT
    ps.order_date,
    ps.product_id,
    ps.product_name,
    ps.sku_count,
    ps.order_count,
    ps.units_sold,
    ps.gross_revenue_cents,
    ps.refund_cents,
    ps.net_revenue_cents,
    ps.discount_cents,
    ps.cogs_cents,
    ps.gross_margin_cents
  FROM gold.gold_mart_product_sales ps
  CROSS JOIN params p
  WHERE ps.order_date >= p.start_date
    AND ps.order_date <= p.end_date
)
`;

@Injectable()
export class ProductsAnalyticsService {
  private readonly logger = new Logger(ProductsAnalyticsService.name);

  constructor(private readonly duckDb: DuckDbService) {}

  async getProductsAnalytics(
    query: ProductsAnalyticsQueryDto,
  ): Promise<ProductsAnalyticsResponse> {
    const range = this.resolveDateRange(query.from, query.to);
    const limit = query.limit ?? 15;
    const params = [range.from, range.to] as const;

    this.logger.debug(
      `products analytics (gold) ${range.from} → ${range.to} (limit=${limit})`,
    );

    const [summaryRow, series, topProducts, portfolioRows, reimbursements] =
      await Promise.all([
        this.fetchSummary(params),
        this.fetchRevenueOverTime(params),
        this.fetchTopProducts(params, limit),
        this.fetchPortfolioRanks(params),
        this.fetchReimbursements(params, limit),
      ]);

    return {
      meta: {
        from: range.from,
        to: range.to,
        defaultRangeDays: DEFAULT_RANGE_DAYS,
        source: 'gold',
        note: 'Queries 2 gold marts: gold_mart_daily_sales + gold_mart_product_sales.',
      },
      summary: this.mapSummary(summaryRow),
      revenueOverTime: series,
      topProducts,
      portfolio: this.buildPortfolio(portfolioRows),
      reimbursements,
    };
  }

  private resolveDateRange(from?: string, to?: string): DateRange {
    const end = to ? this.parseDateOnly(to) : this.utcToday();
    const start = from
      ? this.parseDateOnly(from)
      : this.addDays(end, -(DEFAULT_RANGE_DAYS - 1));

    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('`from` must be on or before `to`');
    }

    return {
      from: this.formatDate(start),
      to: this.formatDate(end),
    };
  }

  private async fetchSummary(params: readonly [string, string]) {
    const sql = `
      ${PRODUCT_RANGE_CTE}
      , daily AS (
        SELECT
          COALESCE(SUM(order_count), 0) AS order_count,
          COALESCE(SUM(review_count), 0) AS review_count,
          CASE
            WHEN SUM(review_count) > 0
            THEN SUM(avg_rating * review_count)::DOUBLE / SUM(review_count)
            ELSE NULL
          END AS avg_rating
        FROM gold.gold_mart_daily_sales ds
        CROSS JOIN params p
        WHERE ds.order_date >= p.start_date
          AND ds.order_date <= p.end_date
      )
      SELECT
        COALESCE(SUM(pd.gross_revenue_cents), 0) AS gross_revenue_cents,
        COALESCE(SUM(pd.net_revenue_cents), 0) AS net_revenue_cents,
        COALESCE(SUM(pd.refund_cents), 0) AS refund_cents,
        COALESCE(SUM(pd.discount_cents), 0) AS discount_cents,
        COALESCE(SUM(pd.cogs_cents), 0) AS cogs_cents,
        COALESCE(SUM(pd.units_sold), 0) AS units_sold,
        (SELECT order_count FROM daily) AS order_count,
        0 AS line_item_count,
        COUNT(DISTINCT pd.product_id) AS product_count,
        (SELECT avg_rating FROM daily) AS avg_rating,
        (SELECT review_count FROM daily) AS review_count
      FROM product_days pd
    `;

    const rows = await this.duckDb.queryWithParams(sql, [...params]);
    return rows[0] ?? {};
  }

  private async fetchRevenueOverTime(
    params: readonly [string, string],
  ): Promise<ProductsRevenuePoint[]> {
    const sql = `
      ${PRODUCT_RANGE_CTE}
      , by_day AS (
        SELECT
          pd.order_date AS date,
          COALESCE(SUM(pd.gross_revenue_cents), 0) AS gross_revenue_cents,
          COALESCE(SUM(pd.net_revenue_cents), 0) AS net_revenue_cents,
          COALESCE(SUM(pd.refund_cents), 0) AS refund_cents,
          COALESCE(SUM(pd.discount_cents), 0) AS discount_cents,
          COALESCE(SUM(pd.units_sold), 0) AS units_sold
        FROM product_days pd
        GROUP BY pd.order_date
      )
      SELECT
        b.date,
        b.gross_revenue_cents,
        b.net_revenue_cents,
        b.refund_cents,
        b.discount_cents,
        b.units_sold,
        COALESCE(ds.order_count, 0) AS order_count
      FROM by_day b
      LEFT JOIN gold.gold_mart_daily_sales ds
        ON ds.order_date = b.date
      ORDER BY b.date
    `;

    const rows = await this.duckDb.queryWithParams(sql, [...params]);

    return rows.map((row) => ({
      date: String(row.date).slice(0, 10),
      grossRevenueCents: num(row.gross_revenue_cents),
      netRevenueCents: num(row.net_revenue_cents),
      refundCents: num(row.refund_cents),
      discountCents: num(row.discount_cents),
      unitsSold: num(row.units_sold),
      orderCount: num(row.order_count),
    }));
  }

  private async fetchTopProducts(
    params: readonly [string, string],
    limit: number,
  ): Promise<ProductPerformanceRow[]> {
    const sql = `
      ${PRODUCT_RANGE_CTE}
      , product_agg AS (
        SELECT
          pd.product_id,
          ANY_VALUE(pd.product_name) AS product_name,
          MAX(pd.sku_count) AS sku_count,
          SUM(pd.gross_revenue_cents) AS gross_revenue_cents,
          SUM(pd.net_revenue_cents) AS net_revenue_cents,
          SUM(pd.refund_cents) AS refund_cents,
          SUM(pd.discount_cents) AS discount_cents,
          SUM(pd.cogs_cents) AS cogs_cents,
          SUM(pd.units_sold) AS units_sold,
          SUM(pd.order_count) AS order_count
        FROM product_days pd
        GROUP BY pd.product_id
      ),
      totals AS (
        SELECT COALESCE(SUM(gross_revenue_cents), 0) AS total_gross FROM product_agg
      )
      SELECT
        pa.product_id,
        pa.product_name,
        pa.sku_count,
        pa.gross_revenue_cents,
        pa.net_revenue_cents,
        pa.refund_cents,
        pa.discount_cents,
        pa.cogs_cents,
        pa.units_sold,
        pa.order_count,
        CASE
          WHEN t.total_gross > 0
          THEN (pa.gross_revenue_cents::DOUBLE / t.total_gross) * 100
          ELSE 0
        END AS revenue_share_pct,
        CASE
          WHEN pa.units_sold > 0
          THEN pa.gross_revenue_cents::DOUBLE / pa.units_sold
          ELSE 0
        END AS avg_unit_price_cents
      FROM product_agg pa
      CROSS JOIN totals t
      ORDER BY pa.gross_revenue_cents DESC
      LIMIT ?
    `;

    const rows = await this.duckDb.queryWithParams(sql, [...params, limit]);

    return rows.map((row) => {
      const gross = num(row.gross_revenue_cents);
      const cogs = num(row.cogs_cents);
      const margin = gross - cogs;

      return {
        productId: String(row.product_id),
        productName: String(row.product_name),
        skuCount: num(row.sku_count),
        grossRevenueCents: gross,
        netRevenueCents: num(row.net_revenue_cents),
        refundCents: num(row.refund_cents),
        discountCents: num(row.discount_cents),
        cogsCents: cogs,
        grossMarginCents: margin,
        grossMarginPct: gross > 0 ? round2((margin / gross) * 100) : 0,
        unitsSold: num(row.units_sold),
        orderCount: num(row.order_count),
        revenueSharePct: round2(num(row.revenue_share_pct)),
        avgUnitPriceCents: Math.round(num(row.avg_unit_price_cents)),
      };
    });
  }

  private async fetchPortfolioRanks(params: readonly [string, string]) {
    const sql = `
      ${PRODUCT_RANGE_CTE}
      , product_rev AS (
        SELECT
          pd.product_id,
          SUM(pd.gross_revenue_cents)::BIGINT AS gross_revenue_cents
        FROM product_days pd
        GROUP BY pd.product_id
      ),
      ranked AS (
        SELECT
          product_id,
          gross_revenue_cents,
          ROW_NUMBER() OVER (ORDER BY gross_revenue_cents DESC) AS revenue_rank,
          SUM(gross_revenue_cents) OVER () AS total_gross,
          COUNT(*) OVER () AS product_count
        FROM product_rev
      )
      SELECT
        product_id,
        gross_revenue_cents,
        revenue_rank,
        total_gross,
        product_count,
        CASE
          WHEN total_gross > 0
          THEN (gross_revenue_cents::DOUBLE / total_gross)
          ELSE 0
        END AS share
      FROM ranked
      ORDER BY revenue_rank
    `;

    return this.duckDb.queryWithParams(sql, [...params]);
  }

  private buildPortfolio(
    rows: Array<Record<string, unknown>>,
  ): ProductsPortfolio {
    if (rows.length === 0) {
      return {
        herfindahlIndex: 0,
        top10RevenueSharePct: 0,
        top50RevenueSharePct: 0,
        buckets: [
          emptyBucket('top10', 'Top 10 products'),
          emptyBucket('next40', 'Next 40 products'),
          emptyBucket('longTail', 'Long tail'),
        ],
      };
    }

    const totalGross = num(rows[0].total_gross);
    let hhi = 0;
    let top10 = 0;
    let top50 = 0;

    const buckets = {
      top10: { count: 0, revenue: 0 },
      next40: { count: 0, revenue: 0 },
      longTail: { count: 0, revenue: 0 },
    };

    for (const row of rows) {
      const rank = num(row.revenue_rank);
      const revenue = num(row.gross_revenue_cents);
      const share = num(row.share);
      hhi += share * share;

      if (rank <= 10) top10 += revenue;
      if (rank <= 50) top50 += revenue;

      if (rank <= 10) {
        buckets.top10.count += 1;
        buckets.top10.revenue += revenue;
      } else if (rank <= 50) {
        buckets.next40.count += 1;
        buckets.next40.revenue += revenue;
      } else {
        buckets.longTail.count += 1;
        buckets.longTail.revenue += revenue;
      }
    }

    const sharePct = (cents: number) =>
      totalGross > 0 ? round2((cents / totalGross) * 100) : 0;

    return {
      herfindahlIndex: round4(hhi),
      top10RevenueSharePct: sharePct(top10),
      top50RevenueSharePct: sharePct(top50),
      buckets: [
        {
          tier: 'top10',
          label: 'Top 10 products',
          productCount: buckets.top10.count,
          grossRevenueCents: buckets.top10.revenue,
          revenueSharePct: sharePct(buckets.top10.revenue),
        },
        {
          tier: 'next40',
          label: 'Next 40 products',
          productCount: buckets.next40.count,
          grossRevenueCents: buckets.next40.revenue,
          revenueSharePct: sharePct(buckets.next40.revenue),
        },
        {
          tier: 'longTail',
          label: 'Long tail',
          productCount: buckets.longTail.count,
          grossRevenueCents: buckets.longTail.revenue,
          revenueSharePct: sharePct(buckets.longTail.revenue),
        },
      ],
    };
  }

  private async fetchReimbursements(
    params: readonly [string, string],
    limit: number,
  ): Promise<ProductsReimbursements> {
    const summarySql = `
      ${PRODUCT_RANGE_CTE}
      , refund_orders AS (
        SELECT COALESCE(SUM(refunded_order_count), 0) AS refunded_order_count
        FROM gold.gold_mart_daily_sales ds
        CROSS JOIN params p
        WHERE ds.order_date >= p.start_date
          AND ds.order_date <= p.end_date
      )
      SELECT
        COALESCE(SUM(pd.refund_cents), 0) AS refund_cents,
        (SELECT refunded_order_count FROM refund_orders) AS refunded_order_count,
        COALESCE(SUM(pd.gross_revenue_cents), 0) AS gross_revenue_cents
      FROM product_days pd
    `;

    const overTimeSql = `
      ${PRODUCT_RANGE_CTE}
      SELECT
        pd.order_date AS date,
        COALESCE(SUM(pd.refund_cents), 0) AS refund_cents,
        COALESCE(MAX(ds.refunded_order_count), 0) AS refunded_order_count
      FROM product_days pd
      LEFT JOIN gold.gold_mart_daily_sales ds
        ON ds.order_date = pd.order_date
      GROUP BY pd.order_date
      ORDER BY 1
    `;

    const byProductSql = `
      ${PRODUCT_RANGE_CTE}
      , product_refunds AS (
        SELECT
          pd.product_id,
          ANY_VALUE(pd.product_name) AS product_name,
          SUM(pd.refund_cents) AS refund_cents,
          SUM(pd.units_sold) AS units_sold
        FROM product_days pd
        GROUP BY pd.product_id
        HAVING SUM(pd.refund_cents) > 0
      ),
      totals AS (
        SELECT COALESCE(SUM(refund_cents), 0) AS total_refunds FROM product_refunds
      )
      SELECT
        pr.product_id,
        pr.product_name,
        pr.refund_cents,
        pr.units_sold,
        CASE
          WHEN t.total_refunds > 0
          THEN (pr.refund_cents::DOUBLE / t.total_refunds) * 100
          ELSE 0
        END AS refund_share_pct
      FROM product_refunds pr
      CROSS JOIN totals t
      ORDER BY pr.refund_cents DESC
      LIMIT ?
    `;

    const [summaryRows, overTimeRows, byProductRows] = await Promise.all([
      this.duckDb.queryWithParams(summarySql, [...params]),
      this.duckDb.queryWithParams(overTimeSql, [...params]),
      this.duckDb.queryWithParams(byProductSql, [...params, limit]),
    ]);

    const summary = summaryRows[0] ?? {};
    const refundCents = num(summary.refund_cents);
    const gross = num(summary.gross_revenue_cents);

    const overTime: ReimbursementPoint[] = overTimeRows.map((row) => ({
      date: String(row.date).slice(0, 10),
      refundCents: num(row.refund_cents),
      refundedOrderCount: num(row.refunded_order_count),
    }));

    const byProduct: ReimbursementProductRow[] = byProductRows.map((row) => {
      const units = num(row.units_sold);
      const refund = num(row.refund_cents);

      return {
        productId: String(row.product_id),
        productName: String(row.product_name),
        refundCents: refund,
        refundSharePct: round2(num(row.refund_share_pct)),
        unitsSold: units,
        refundPerUnitCents: units > 0 ? Math.round(refund / units) : 0,
      };
    });

    return {
      refundCents,
      refundedOrderCount: num(summary.refunded_order_count),
      refundRate: gross > 0 ? round4(refundCents / gross) : 0,
      overTime,
      byProduct,
    };
  }

  private mapSummary(row: Record<string, unknown>): ProductsAnalyticsSummary {
    const gross = num(row.gross_revenue_cents);
    const refund = num(row.refund_cents);
    const cogs = num(row.cogs_cents);
    const orders = num(row.order_count);
    const margin = gross - cogs;
    const avgRating =
      row.avg_rating == null || row.avg_rating === ''
        ? null
        : round2(num(row.avg_rating));

    return {
      grossRevenueCents: gross,
      netRevenueCents: num(row.net_revenue_cents),
      refundCents: refund,
      discountCents: num(row.discount_cents),
      cogsCents: cogs,
      grossMarginCents: margin,
      grossMarginPct: gross > 0 ? round2((margin / gross) * 100) : 0,
      unitsSold: num(row.units_sold),
      orderCount: orders,
      lineItemCount: num(row.line_item_count),
      productCount: num(row.product_count),
      aovCents: orders > 0 ? Math.round(gross / orders) : 0,
      refundRate: gross > 0 ? round4(refund / gross) : 0,
      avgRating,
      reviewCount: num(row.review_count),
    };
  }

  private parseDateOnly(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(
        `Invalid date '${value}'. Use YYYY-MM-DD.`,
      );
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date '${value}'.`);
    }

    return date;
  }

  private utcToday(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}

function num(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function emptyBucket(
  tier: 'top10' | 'next40' | 'longTail',
  label: string,
) {
  return {
    tier,
    label,
    productCount: 0,
    grossRevenueCents: 0,
    revenueSharePct: 0,
  };
}
