# Commands

Typical flow: **Postgres up → migrate → seed → dbt bronze → inspect DuckDB**.

| Piece | Path |
|---|---|
| Env | `.env` (repo root) |
| Postgres | Docker Compose |
| API / migrations / seeds | `server/` |
| Frontend | `client/` |
| dbt / DuckDB | `dbt-analytics/` (`dev.duckdb`) |

---

## Postgres (Docker)

From repo root:

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgres
docker compose down          # stop (keep volume)
docker compose down -v       # stop + wipe DB volume
```

Health check:

```bash
docker exec dbt-analytics-postgres pg_isready -U postgres -d dbt_analytics
```

---

## Server setup

```bash
cd server
pnpm install
```

Ensure `.env` at repo root (or `DATABASE_URL`) points at Postgres, e.g.:

```text
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dbt_analytics
```

### Dev server

```bash
cd server
pnpm start:dev          # Nest on :5004
```

Health check (Postgres + DuckDB):

```bash
curl -s http://localhost:5004/api/v1/health
# { "status":"ok", "database":"connected", "duckdb":"connected", ... }
```

Products analytics (JWT cookie required; gold marts; default last **60 days**):

```bash
# after login (cookie jar)
curl -s -c cookies.txt -X POST http://localhost:5004/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"secret"}'

curl -s -b cookies.txt \
  'http://localhost:5004/api/v1/analytics/products?from=2026-05-19&to=2026-07-19&limit=15'
```

`DUCKDB_PATH` (in `.env`) points Nest at `dbt-analytics/dev.duckdb` in **read-only** mode. Close `duckdb -ui` / finish `dbt run` if the server fails to open the file (lock).

---

## Migrations (TypeORM)

Run from `server/`:

```bash
cd server

pnpm migration:show     # which migrations applied / pending
pnpm migration:run      # apply pending migrations
pnpm migration:revert   # undo last migration

# Scaffold (rare)
pnpm migration:create
pnpm migration:generate
```

Migrations live in `server/src/database/migrations/`.

---

## Seeds (OLTP demo data)

Run from `server/` after migrations. Seeds are **incremental** (safe to re-run; skips rows already present).

```bash
cd server

pnpm seed:demo          # small (~20k orders) — first try
pnpm seed:large         # medium (~500k orders)
pnpm seed:mega          # large (~2M orders; long run)

pnpm seed               # default profile = large (see seeds/config.ts)

pnpm seed:clear         # truncate ecommerce tables (keeps schema)
```

Optional overrides via env (see `server/src/database/seeds/config.ts`):

```bash
SEED_PROFILE=demo pnpm seed
SEED_BATCH_SIZE=2000 pnpm seed:large
```

After seeding (or changing OLTP data), refresh DuckDB bronze:

```bash
cd ../dbt-analytics && source .venv/bin/activate && dbt run --select path:models/bronze
```

---

## Client

```bash
cd client
pnpm install
pnpm dev                # Vite on :5001 (proxies /api → :5004)
```

---

## dbt setup

```bash
cd dbt-analytics
python3 -m venv .venv
source .venv/bin/activate
pip install dbt-core dbt-duckdb

# One-time: copy profiles.yml.example → ~/.dbt/profiles.yml
# (DuckDB path + Postgres attach as alias `oltp`)
```

---

## dbt (Bronze / Postgres → DuckDB)

```bash
cd dbt-analytics
source .venv/bin/activate

dbt debug
dbt run --select path:models/bronze

# Specific models
dbt run --select bronze_oltp__product_reviews bronze_oltp__coupon_redemptions
```

Close any DuckDB UI/CLI **and stop Nest** (`pnpm start:dev`) before `dbt run` — both lock `dev.duckdb`.

Warehouse file: **`dbt-analytics/dev.duckdb`** (not the repo root).

---

## dbt (Silver — cleaned dims / facts)

Build after bronze. Models live under `models/silver/`.

```bash
cd dbt-analytics
source .venv/bin/activate

# Compile / see graph (optional)
dbt ls --select path:models/silver
dbt compile --select path:models/silver

# Run all silver models (depends on bronze)
dbt run --select path:models/silver

# Or: bronze + silver in one go
dbt run --select path:models/bronze path:models/silver

# Run tests (unique / not_null / relationships)
dbt test --select path:models/silver
```

Inspect in DuckDB:

```sql
SHOW TABLES FROM silver;
SELECT * FROM silver.silver_fct_orders LIMIT 10;
SELECT order_status, count(*) FROM silver.silver_fct_orders GROUP BY 1;
SELECT * FROM silver.silver_dim_dates LIMIT 10;
```

Skipped for now (no bronze source yet): `silver_dim_payment_methods`, `silver_dim_warehouses`, `silver_fct_returns`.

---

## dbt (Gold — chart / API marts)

Build after silver. **Only 2 gold tables** (different grains — don’t mash into one):

| Mart | Grain | Use |
|---|---|---|
| `gold_mart_daily_sales` | 1 row / day | KPIs, order counts, refunds, reviews |
| `gold_mart_product_sales` | 1 row / day × product | Products charts / portfolio |

```bash
cd dbt-analytics
source .venv/bin/activate

# Stop Nest + duckdb UI first (file lock)

dbt run --select path:models/gold
dbt test --select path:models/gold
```

Inspect:

```sql
SHOW TABLES FROM gold;
SELECT * FROM gold.gold_mart_daily_sales ORDER BY order_date DESC LIMIT 14;
SELECT * FROM gold.gold_mart_product_sales
WHERE order_date BETWEEN DATE '2026-05-19' AND DATE '2026-07-19'
ORDER BY gross_revenue_cents DESC LIMIT 15;
```

Optional cleanup of old unused gold tables left in DuckDB from earlier runs:

```sql
DROP TABLE IF EXISTS gold.gold_mart_orders_by_status;
DROP TABLE IF EXISTS gold.gold_mart_variant_sales;
DROP TABLE IF EXISTS gold.gold_mart_customer_activity;
DROP TABLE IF EXISTS gold.gold_mart_customer_ltv;
DROP TABLE IF EXISTS gold.gold_mart_customer_cohorts;
DROP TABLE IF EXISTS gold.gold_mart_geo_sales;
DROP TABLE IF EXISTS gold.gold_mart_funnel_daily;
DROP TABLE IF EXISTS gold.gold_mart_review_stats;
DROP TABLE IF EXISTS gold.gold_mart_payments;
DROP TABLE IF EXISTS gold.gold_mart_fulfillment;
DROP TABLE IF EXISTS gold.gold_mart_inventory_health;
DROP TABLE IF EXISTS gold.gold_mart_refunds;
```

---

## Inspect data in DuckDB

```bash
cd dbt-analytics
duckdb -ui dev.duckdb
# or
duckdb dev.duckdb
```

```sql
SHOW DATABASES;
SHOW TABLES FROM bronze;

SELECT * FROM bronze.bronze_oltp__orders LIMIT 10;
SELECT COUNT(*) FROM bronze.bronze_oltp__orders;
```

---

## Troubleshooting

### DuckDB file lock

```bash
lsof dbt-analytics/dev.duckdb
kill <PID>              # stop duckdb -ui / CLI holding the lock
```

### Wrong / empty `dev.duckdb`

Opening `duckdb -ui dev.duckdb` from the **repo root** creates an empty file. Always `cd dbt-analytics` first.

```bash
rm ./dev.duckdb         # only if accidental empty root file (~12KB)
```
