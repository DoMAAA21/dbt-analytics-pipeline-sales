# Benchmark — Bronze vs Silver (Products Analytics)

Measured locally on DuckDB (`dbt-analytics/dev.duckdb`) to compare the Nest products analytics query shape when reading **bronze** (raw joins) vs **silver** (cleaned facts/dims).

## Setup

| Item | Value |
|---|---|
| Date range | `2026-05-19` → `2026-07-19` (60 days) |
| Engine | DuckDB (read-only file open) |
| Runs | 7 per query (1 warm-up discarded; fresh connection each timed run) |
| Machine | Local macOS (same host as Nest / dbt) |
| Warehouse size | ~1.4–1.5 GiB `dev.duckdb` |

**Workload slice (both layers, same totals):**

- ~197,683 revenue orders  
- ~582,591 order lines  
- Gross `15,166,002,261` cents · Net `14,715,023,994` · Refunds `450,978,267` · COGS `7,240,992,688`  
- 10,000 products  

Totals matched exactly between bronze and silver for this window.

## Results

| Query | Bronze (avg) | Silver (avg) | Speedup |
|---|---:|---:|---:|
| Summary KPIs | 87.8 ms | 36.2 ms | **2.4×** |
| Daily series | 86.7 ms | 29.4 ms | **3.0×** |
| Top 15 products | 78.1 ms | 31.9 ms | **2.4×** |
| **3-query bundle** (summary + daily + top15) | **239.0 ms** | **87.2 ms** | **2.7×** |

p50 / min / max (ms):

| Query | Bronze p50 (min–max) | Silver p50 (min–max) |
|---|---|---|
| Summary | 87.7 (85.1–93.6) | 36.1 (34.2–39.1) |
| Daily | 86.6 (85.0–88.8) | 29.3 (28.8–30.2) |
| Top 15 | 78.1 (76.5–79.5) | 30.9 (30.6–37.9) |
| 3-query bundle | 238.8 (237.0–242.0) | 87.1 (86.6–87.9) |

**Net:** silver saved ~**152 ms** on the 3-query bundle (~**2.7×** faster) for the same numbers.

## What each side does

### Bronze (API-style)

Re-joins on every request:

`orders` → `order_items` → `product_variants` → `products`  
+ `payments` → `refunds`  
then allocates refunds by line share and aggregates.

### Silver (current Nest path)

Reads pre-joined / cleaned models:

- `silver.silver_fct_order_items` (`is_revenue_order`, COGS, product attrs)  
- `silver.silver_fct_refunds` (`is_completed`, `order_id`)  
- (reviews) `silver.silver_fct_reviews`  

Less join work at request time; dbt already paid that cost at transform time.

## Why silver is faster (here)

1. **Fewer joins at query time** — variants/products/status flags already on the fact.  
2. **Cheaper filters** — `order_date` + `is_revenue_order` vs scanning/joining raw timestamps + status strings across several bronze tables.  
3. **Same DuckDB file** — difference is model shape, not network.

This is **not** “GB scanned” (cloud warehouse billing). Locally we measure wall time + plan/row counts (`EXPLAIN ANALYZE`).

## How to reproduce

Stop Nest / `duckdb -ui` first (file lock), then from `dbt-analytics/` with the venv active, run a timed comparison in Python/DuckDB or:

```sql
-- Silver path (example summary filter)
EXPLAIN ANALYZE
SELECT COUNT(*), SUM(line_total_cents)
FROM silver.silver_fct_order_items
WHERE order_date BETWEEN DATE '2026-05-19' AND DATE '2026-07-19'
  AND is_revenue_order = true;
```

```sql
-- Bronze path (example: date-filtered orders only)
EXPLAIN ANALYZE
SELECT COUNT(*)
FROM bronze.bronze_oltp__orders
WHERE placed_at >= DATE '2026-05-19'
  AND placed_at < DATE '2026-07-20'
  AND status IN ('paid', 'fulfilled', 'refunded');
```

For Nest end-to-end latency, time `GET /api/v1/analytics/products?from=2026-05-19&to=2026-07-19` (includes HTTP + several parallel DuckDB queries). Expect DuckDB work in the same ballpark as the bundle above; full HTTP will be higher.

## Expected next step (Gold)

Gold marts (e.g. daily product sales) should widen the gap further: Nest reads **pre-aggregated** day/product rows instead of re-aggregating ~580k lines per request.

## Related

- Products API: `server/src/analytics/products-analytics.service.ts` (queries **silver**)  
- Silver models: `dbt-analytics/models/silver/`  
- Commands: [`COMMANDS.md`](./COMMANDS.md)  
- Layer plan: [`ANALYTICS.md`](./ANALYTICS.md)  
