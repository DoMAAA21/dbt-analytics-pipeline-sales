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

/**
 * Shared CTE over silver facts/dims.
 * Refunds allocated to products by line revenue share of the order.
 */
const LINES_CTE = `
WITH params AS (
  SELECT ?::DATE AS start_date, ?::DATE AS end_date
),
eligible_lines AS (
  SELECT
    oi.order_item_id AS line_id,
    oi.order_id,
    oi.placed_at,
    oi.order_date,
    oi.product_id,
    oi.variant_id,
    oi.product_name,
    oi.quantity::BIGINT AS quantity,
    oi.line_total_cents::BIGINT AS line_total_cents,
    oi.discount_cents::BIGINT AS discount_cents,
    oi.cogs_cents::BIGINT AS cogs_cents
  FROM silver.silver_fct_order_items oi
  CROSS JOIN params p
  WHERE oi.order_date >= p.start_date
    AND oi.order_date <= p.end_date
    AND oi.is_revenue_order = true
),
order_refunds AS (
  SELECT
    r.order_id,
    COALESCE(SUM(r.refund_cents), 0)::BIGINT AS refund_cents
  FROM silver.silver_fct_refunds r
  WHERE r.is_completed = true
    AND r.order_id IN (SELECT DISTINCT order_id FROM eligible_lines)
  GROUP BY r.order_id
),
raw_lines AS (
  SELECT
    el.*,
    SUM(el.line_total_cents) OVER (PARTITION BY el.order_id)::BIGINT AS order_lines_total,
    COALESCE(orf.refund_cents, 0)::BIGINT AS order_refund_cents
  FROM eligible_lines el
  LEFT JOIN order_refunds orf ON orf.order_id = el.order_id
),
lines AS (
  SELECT
    line_id,
    order_id,
    placed_at,
    order_date,
    product_id,
    variant_id,
    product_name,
    quantity,
    line_total_cents,
    discount_cents,
    cogs_cents,
    CASE
      WHEN order_lines_total > 0 THEN
        CAST(ROUND(order_refund_cents * (line_total_cents::DOUBLE / order_lines_total)) AS BIGINT)
      ELSE 0
    END AS refund_cents
  FROM raw_lines
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
      `products analytics ${range.from} → ${range.to} (limit=${limit})`,
    );

    const [summaryRow, series, topProducts, portfolioRows, reimbursements] =
      await Promise.all([
        this.fetchSummary(params),
        this.fetchRevenueOverTime(params),
        this.fetchTopProducts(params, limit),
        this.fetchPortfolioRanks(params),
        this.fetchReimbursements(params, limit),
      ]);

    const summary = this.mapSummary(summaryRow);
    const portfolio = this.buildPortfolio(portfolioRows);

    return {
      meta: {
        from: range.from,
        to: range.to,
        defaultRangeDays: DEFAULT_RANGE_DAYS,
        source: 'silver',
        note: 'Queries silver facts/dims (cleaned). Refunds allocated by line revenue share. Gold marts not used yet.',
      },
      summary,
      revenueOverTime: series,
      topProducts,
      portfolio,
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
      ${LINES_CTE}
      , reviews AS (
        SELECT
          AVG(rating)::DOUBLE AS avg_rating,
          COUNT(*)::BIGINT AS review_count
        FROM silver.silver_fct_reviews rv
        CROSS JOIN params p
        WHERE rv.review_date >= p.start_date
          AND rv.review_date <= p.end_date
      )
      SELECT
        COALESCE(SUM(l.line_total_cents), 0) AS gross_revenue_cents,
        COALESCE(SUM(l.line_total_cents - l.refund_cents), 0) AS net_revenue_cents,
        COALESCE(SUM(l.refund_cents), 0) AS refund_cents,
        COALESCE(SUM(l.discount_cents), 0) AS discount_cents,
        COALESCE(SUM(l.cogs_cents), 0) AS cogs_cents,
        COALESCE(SUM(l.quantity), 0) AS units_sold,
        COUNT(DISTINCT l.order_id) AS order_count,
        COUNT(*) AS line_item_count,
        COUNT(DISTINCT l.product_id) AS product_count,
        (SELECT avg_rating FROM reviews) AS avg_rating,
        (SELECT review_count FROM reviews) AS review_count
      FROM lines l
    `;

    const rows = await this.duckDb.queryWithParams(sql, [...params]);
    return rows[0] ?? {};
  }

  private async fetchRevenueOverTime(
    params: readonly [string, string],
  ): Promise<ProductsRevenuePoint[]> {
    const sql = `
      ${LINES_CTE}
      SELECT
        CAST(l.order_date AS DATE) AS date,
        COALESCE(SUM(l.line_total_cents), 0) AS gross_revenue_cents,
        COALESCE(SUM(l.line_total_cents - l.refund_cents), 0) AS net_revenue_cents,
        COALESCE(SUM(l.refund_cents), 0) AS refund_cents,
        COALESCE(SUM(l.discount_cents), 0) AS discount_cents,
        COALESCE(SUM(l.quantity), 0) AS units_sold,
        COUNT(DISTINCT l.order_id) AS order_count
      FROM lines l
      GROUP BY 1
      ORDER BY 1
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
      ${LINES_CTE}
      , product_agg AS (
        SELECT
          l.product_id,
          ANY_VALUE(l.product_name) AS product_name,
          COUNT(DISTINCT l.variant_id) AS sku_count,
          SUM(l.line_total_cents) AS gross_revenue_cents,
          SUM(l.line_total_cents - l.refund_cents) AS net_revenue_cents,
          SUM(l.refund_cents) AS refund_cents,
          SUM(l.discount_cents) AS discount_cents,
          SUM(l.cogs_cents) AS cogs_cents,
          SUM(l.quantity) AS units_sold,
          COUNT(DISTINCT l.order_id) AS order_count
        FROM lines l
        GROUP BY l.product_id
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
      ${LINES_CTE}
      , product_rev AS (
        SELECT
          l.product_id,
          SUM(l.line_total_cents)::BIGINT AS gross_revenue_cents
        FROM lines l
        GROUP BY l.product_id
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
      ${LINES_CTE}
      SELECT
        COALESCE(SUM(l.refund_cents), 0) AS refund_cents,
        COUNT(DISTINCT CASE WHEN l.refund_cents > 0 THEN l.order_id END) AS refunded_order_count,
        COALESCE(SUM(l.line_total_cents), 0) AS gross_revenue_cents
      FROM lines l
    `;

    const overTimeSql = `
      ${LINES_CTE}
      SELECT
        CAST(l.order_date AS DATE) AS date,
        COALESCE(SUM(l.refund_cents), 0) AS refund_cents,
        COUNT(DISTINCT CASE WHEN l.refund_cents > 0 THEN l.order_id END) AS refunded_order_count
      FROM lines l
      GROUP BY 1
      ORDER BY 1
    `;

    const byProductSql = `
      ${LINES_CTE}
      , product_refunds AS (
        SELECT
          l.product_id,
          ANY_VALUE(l.product_name) AS product_name,
          SUM(l.refund_cents) AS refund_cents,
          SUM(l.quantity) AS units_sold
        FROM lines l
        GROUP BY l.product_id
        HAVING SUM(l.refund_cents) > 0
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
