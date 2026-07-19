# Benchmark — Bronze vs Silver vs Gold (Products Analytics)

Measured locally on DuckDB (`dbt-analytics/dev.duckdb`) to compare Nest-style products analytics when reading:

| Layer | What the API scans |
|---|---|
| **Bronze** | Raw OLTP mirrors + joins every request |
| **Silver** | Cleaned facts/dims + refund allocation every request |
| **Gold** | Pre-aggregated marts (`gold_mart_product_sales`, `gold_mart_daily_sales`, …) |

## Setup

| Item | Value |
|---|---|
| Date range | `2026-05-19` → `2026-07-19` (60 days) |
| Engine | DuckDB (read-only file open) |
| Runs | 7 per query (1 warm-up discarded; fresh connection each timed run) |
| Machine | Local macOS (same host as Nest / dbt) |
| Warehouse size | ~1.4–1.5 GiB `dev.duckdb` |
| Nest path today | **Gold** (`server/src/analytics/products-analytics.service.ts`) |

**Workload slice (all layers, same totals):**

- ~197,683 revenue orders  
- Gross `15,166,002,261` cents · Net `14,715,023,994` · Refunds `450,978,267` · COGS `7,240,992,688`  
- 10,000 products  

Totals matched exactly across bronze / silver / gold for this window.

## Results

### Per query (avg ms)

| Query | Bronze | Silver | Gold | vs bronze | vs silver |
|---|---:|---:|---:|---:|---:|
| Summary KPIs | 86.7 | 37.3 | **7.7** | **11.3×** | **4.8×** |
| Daily series | 86.4 | 29.3 | **4.9** | **17.6×** | **6.0×** |
| Top 15 products | 76.3 | 30.7 | **5.5** | **13.9×** | **5.6×** |
| **3-query bundle** | **233.1** | **87.1** | **16.3** | **14.3×** | **5.3×** |

### p50 / min / max (ms)

| Query | Bronze | Silver | Gold |
|---|---|---|---|
| Summary | 87.4 (84.7–88.3) | 35.2 (34.0–42.8) | 7.7 (7.5–8.0) |
| Daily | 86.2 (85.1–89.2) | 29.3 (28.7–30.2) | 4.9 (4.7–5.2) |
| Top 15 | 76.4 (74.9–77.7) | 30.5 (30.2–31.2) | 5.5 (5.4–5.6) |
| 3-query bundle | 232.7 (232.1–234.5) | 87.0 (86.6–87.8) | 16.3 (16.1–16.6) |

### Headline

| Comparison | Bundle | Saved |
|---|---|---|
| Silver vs bronze | **~2.7×** faster | ~146 ms |
| **Gold vs bronze** | **~14×** faster | ~217 ms |
| **Gold vs silver** | **~5.3×** faster | ~71 ms |

```text
bronze ████████████████████████████████████████  233 ms
silver ███████████████                           87 ms
gold   ███                                       16 ms
```

## What each side does

### Bronze

Re-joins on every request:

`orders` → `order_items` → `product_variants` → `products`  
+ `payments` → `refunds`  
then allocates refunds by line share and aggregates.

### Silver

Reads cleaned models (`silver_fct_order_items`, `silver_fct_refunds`, …) with flags/COGS already present, but still allocates refunds and aggregates ~580k lines per request.

### Gold (current Nest path)

Reads pre-aggregated marts (**2 tables**):

- `gold.gold_mart_daily_sales` — day grain (orders, GMV, refunds, reviews)  
- `gold.gold_mart_product_sales` — day × product (revenue, refunds, margin, units)  

API mostly `SUM` / `GROUP BY` over a small day×product slice (~60 days × products with sales), not raw line joins.

## Why gold wins here

1. **dbt paid the join/allocation cost at transform time**  
2. **Fewer rows scanned** — day×product mart vs hundreds of thousands of order lines  
3. **Same DuckDB file** — difference is model shape, not network  

This is **not** cloud “GB scanned.” Locally we measure wall time (+ optional `EXPLAIN ANALYZE`).

## How to reproduce

Stop Nest / `duckdb -ui` first (file lock). From `dbt-analytics/` with the venv active, time comparable queries or:

```sql
EXPLAIN ANALYZE
SELECT SUM(gross_revenue_cents), COUNT(DISTINCT product_id)
FROM gold.gold_mart_product_sales
WHERE order_date BETWEEN DATE '2026-05-19' AND DATE '2026-07-19';
```

```sql
EXPLAIN ANALYZE
SELECT SUM(line_total_cents), COUNT(DISTINCT product_id)
FROM silver.silver_fct_order_items
WHERE order_date BETWEEN DATE '2026-05-19' AND DATE '2026-07-19'
  AND is_revenue_order = true;
```

For Nest end-to-end latency, time:

`GET /api/v1/analytics/products?from=2026-05-19&to=2026-07-19`

(HTTP + several parallel DuckDB queries; DuckDB work should land near the gold bundle above).

## Related

- Products API (gold): `server/src/analytics/products-analytics.service.ts`  
- Models: `dbt-analytics/models/{bronze,silver,gold}/`  
- Commands: [`COMMANDS.md`](./COMMANDS.md)  
- Layer plan: [`ANALYTICS.md`](./ANALYTICS.md)  
