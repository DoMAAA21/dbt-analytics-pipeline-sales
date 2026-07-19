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

Close any DuckDB UI/CLI on `dev.duckdb` before `dbt run` (file lock).

Warehouse file: **`dbt-analytics/dev.duckdb`** (not the repo root).

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
