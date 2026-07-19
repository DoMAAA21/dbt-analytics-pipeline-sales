# Analytics Plan — Bronze / Silver / Gold + Charts

End-to-end analytics design for this ecommerce showcase.

- **OLTP schema:** see [`SCHEMA.md`](./SCHEMA.md)
- **Stack intent:** Postgres (source) → **dbt** (DuckDB or warehouse) → Nest API → React charts

---

## Pipeline goal

```text
OLTP (Postgres ecommerce tables)
        │
        ▼
   ┌─────────┐
   │ BRONZE  │  raw / lightly typed mirrors of source
   └────┬────┘
        ▼
   ┌─────────┐
   │ SILVER  │  cleaned, conformed, tested business entities
   └────┬────┘
        ▼
   ┌─────────┐
   │  GOLD   │  marts / KPIs shaped for charts & APIs
   └────┬────┘
        ▼
   Nest reads gold  →  Client dashboards
```

| Layer | dbt folder (suggested) | Audience | Rule |
|---|---|---|---|
| **Bronze** | `models/bronze/` | Data engineers | 1:1 with source, minimal logic |
| **Silver** | `models/silver/` | Analytics engineers | Clean entities + shared dims/facts |
| **Gold** | `models/gold/` | Product / BI / API | Chart-ready marts & KPIs |

---

## Layer contracts

### Bronze — “as landed”

**Purpose:** preserve source truth for audit + reprocessing.

**Patterns**
- `bronze_<source>__<table>` e.g. `bronze_oltp__orders`
- Select from `source('oltp', 'orders')`
- Cast types, rename to snake_case only if needed
- Add metadata: `_loaded_at`, `_source_system`
- **No** joins, **no** business filters (keep cancelled rows)

**Tables to bronze (from SCHEMA.md)**

| Domain | Bronze models |
|---|---|
| Identity | `bronze_oltp__users`, `bronze_oltp__customers`, `bronze_oltp__customer_addresses` |
| Catalog | `bronze_oltp__brands`, `bronze_oltp__categories`, `bronze_oltp__products`, `bronze_oltp__product_variants`, `bronze_oltp__product_categories`, `bronze_oltp__product_images`, `bronze_oltp__product_reviews` |
| Inventory | `bronze_oltp__warehouses`, `bronze_oltp__inventory_levels`, `bronze_oltp__suppliers`, `bronze_oltp__purchase_orders`, `bronze_oltp__purchase_order_items` |
| Commerce | `bronze_oltp__carts`, `bronze_oltp__cart_items`, `bronze_oltp__orders`, `bronze_oltp__order_items`, `bronze_oltp__order_status_history`, `bronze_oltp__payments`, `bronze_oltp__payment_methods`, `bronze_oltp__shipments`, `bronze_oltp__shipment_items`, `bronze_oltp__shipping_methods` |
| Promos | `bronze_oltp__coupons`, `bronze_oltp__coupon_redemptions` |
| Returns | `bronze_oltp__returns`, `bronze_oltp__return_items`, `bronze_oltp__refunds` |

**Tests:** `not_null` on PKs, `unique` on natural keys where safe.

---

### Silver — “business ready”

**Purpose:** one clean version of each entity / process.

**Patterns**
- `silver_<entity>` or `silver_fct_*` / `silver_dim_*`
- Deduplicate, standardize statuses, money → dollars or keep cents consistently
- Soft business rules: valid emails, rating 1–5, positive quantities
- Conformed dimensions shared across facts
- Light joins only when defining the entity (e.g. variant + product name)

**Core silver models**

| Model | Grain | Notes |
|---|---|---|
| `silver_dim_customers` | 1 row / customer | geo from default address optional |
| `silver_dim_products` | 1 row / product | brand + primary category |
| `silver_dim_variants` | 1 row / SKU | price, cost, attributes |
| `silver_dim_categories` | 1 row / category | parent + flattened path |
| `silver_dim_dates` | 1 row / day | calendar attributes |
| `silver_dim_payment_methods` | 1 row / method | |
| `silver_dim_warehouses` | 1 row / warehouse | |
| `silver_fct_orders` | 1 row / order | totals, status, customer_id, placed_at |
| `silver_fct_order_items` | 1 row / order line | qty, revenue, cost, margin |
| `silver_fct_payments` | 1 row / payment | success/fail |
| `silver_fct_shipments` | 1 row / shipment | lead time metrics |
| `silver_fct_returns` | 1 row / return | |
| `silver_fct_refunds` | 1 row / refund | |
| `silver_fct_carts` | 1 row / cart | abandoned vs converted |
| `silver_fct_inventory` | 1 row / warehouse×variant | on-hand, reserved, available |
| `silver_fct_reviews` | 1 row / review | |

**Tests:** relationships (FK integrity), accepted values for statuses, `unique` + `not_null` on grains.

---

### Gold — “chart & API ready”

**Purpose:** wide, denormalized, pre-aggregated marts Nest can query cheaply.

**Patterns**
- `gold_mart_*` or `gold_kpi_*`
- Aggregations by day / week / month
- Dashboard-specific shapes (few columns, clear metrics)

---

## Gold marts → charts map

### Dashboard A — Executive overview (home)

| Chart | Type | Gold model | Metrics / dims |
|---|---|---|---|
| Gross Merchandise Value (GMV) | KPI tile | `gold_mart_daily_sales` | `sum(gmv_cents)` |
| Orders | KPI tile | `gold_mart_daily_sales` | `count_orders` |
| AOV | KPI tile | `gold_mart_daily_sales` | `gmv / orders` |
| Refund rate | KPI tile | `gold_mart_daily_sales` | `refund_cents / gmv` |
| Revenue over time | Line | `gold_mart_daily_sales` | date × gmv |
| Orders over time | Bar / line | `gold_mart_daily_sales` | date × orders |
| GMV by status mix | Stacked bar | `gold_mart_orders_by_status` | status × count |

**Gold models**
- `gold_mart_daily_sales` — day grain: gmv, net_revenue, orders, aov, discount, tax, shipping, refunds
- `gold_mart_orders_by_status` — day × status

---

### Dashboard B — Product performance

| Chart | Type | Gold model | Metrics / dims |
|---|---|---|---|
| Top 10 products by revenue | Horizontal bar | `gold_mart_product_sales` | product_name × revenue |
| Top SKUs by units | Horizontal bar | `gold_mart_variant_sales` | sku × units |
| Revenue by category | Treemap / bar | `gold_mart_category_sales` | category_path × revenue |
| Revenue by brand | Pie / bar | `gold_mart_brand_sales` | brand × revenue |
| Margin by category | Grouped bar | `gold_mart_category_sales` | revenue vs cost / margin % |
| Slow movers | Table | `gold_mart_product_sales` | low units last 90d |

**Gold models**
- `gold_mart_product_sales` — product × period
- `gold_mart_variant_sales` — variant × period
- `gold_mart_category_sales` — category × period
- `gold_mart_brand_sales` — brand × period

---

### Dashboard C — Customers

| Chart | Type | Gold model | Metrics / dims |
|---|---|---|---|
| New vs returning buyers | Stacked area | `gold_mart_customer_activity` | day × new/returning |
| Customers by country/region | Bar / map | `gold_mart_geo_sales` | region × customers / gmv |
| Cohort retention | Heatmap | `gold_mart_customer_cohorts` | cohort_month × period_number |
| Top customers by LTV | Table | `gold_mart_customer_ltv` | customer × ltv, orders |
| Orders per customer distribution | Histogram | `gold_mart_customer_ltv` | order_count buckets |

**Gold models**
- `gold_mart_customer_activity`
- `gold_mart_customer_cohorts`
- `gold_mart_customer_ltv`
- `gold_mart_geo_sales`

---

### Dashboard D — Funnel & marketing

| Chart | Type | Gold model | Metrics / dims |
|---|---|---|---|
| Cart → order conversion | Funnel | `gold_mart_funnel_daily` | carts_created → carts_with_items → orders |
| Abandoned cart rate | KPI + line | `gold_mart_funnel_daily` | abandoned / carts |
| Coupon usage | Bar | `gold_mart_promo_performance` | coupon_code × redemptions |
| Discount $ vs GMV | Dual axis | `gold_mart_promo_performance` | discount_cents, gmv influenced |
| Review rating distribution | Bar | `gold_mart_review_stats` | rating 1–5 counts |
| Avg product rating trend | Line | `gold_mart_review_stats` | week × avg_rating |

**Gold models**
- `gold_mart_funnel_daily`
- `gold_mart_promo_performance`
- `gold_mart_review_stats`

---

### Dashboard E — Operations (payments, ship, inventory, returns)

| Chart | Type | Gold model | Metrics / dims |
|---|---|---|---|
| Payment method mix | Donut | `gold_mart_payments` | method × amount / count |
| Payment success rate | KPI + line | `gold_mart_payments` | succeeded / total |
| Avg ship time (order→shipped) | Line | `gold_mart_fulfillment` | day × avg_hours |
| On-time delivery % | KPI | `gold_mart_fulfillment` | delivered within SLA |
| Stockout SKUs | Table | `gold_mart_inventory_health` | available <= 0 |
| Inventory by warehouse | Stacked bar | `gold_mart_inventory_health` | warehouse × on_hand |
| Return rate by category | Bar | `gold_mart_returns` | category × return_rate |
| Refund $ over time | Line | `gold_mart_returns` | day × refund_cents |
| Return reasons | Pie | `gold_mart_returns` | reason × count |

**Gold models**
- `gold_mart_payments`
- `gold_mart_fulfillment`
- `gold_mart_inventory_health`
- `gold_mart_returns`

---

## Chart priority (build order)

Ship dashboards in this order so the showcase feels complete early:

| Priority | Dashboard | Why |
|---|---|---|
| P0 | **A — Executive** | Instant “wow” KPIs + revenue trend |
| P0 | **B — Product** | Classic ecommerce analytics |
| P1 | **C — Customers** | Cohorts look great on resume/demo |
| P1 | **E — Returns + payments** | Shows ops maturity |
| P2 | **D — Funnel + promos** | Needs solid cart seed data |
| P2 | **E — Inventory / shipping** | Nice extras |

**Minimum viable demo charts (8):**
1. GMV KPI  
2. Orders KPI  
3. AOV KPI  
4. Revenue over time (line)  
5. Top products (bar)  
6. Revenue by category (bar)  
7. Payment method mix (donut)  
8. Return rate KPI + refund trend  

---

## Example gold model sketches

### `gold_mart_daily_sales`
Grain: `order_date`

| Column | Source idea |
|---|---|
| order_date | `date_trunc('day', placed_at)` |
| gmv_cents | sum order totals (paid/fulfilled) |
| net_revenue_cents | gmv − refunds |
| order_count | count distinct orders |
| aov_cents | gmv / order_count |
| discount_cents | sum discounts |
| new_customer_orders | first-order flag |
| returning_customer_orders | remainder |

### `gold_mart_product_sales`
Grain: `period_start` + `product_id`

| Column | Source idea |
|---|---|
| units_sold | sum qty |
| revenue_cents | sum line totals |
| cogs_cents | sum qty × cost |
| margin_cents | revenue − cogs |
| margin_pct | margin / revenue |
| brand_name / category_name | from silver dims |

### `gold_mart_customer_cohorts`
Grain: `cohort_month` + `period_number`

| Column | Source idea |
|---|---|
| cohort_month | month of first order |
| period_number | months since first order |
| active_customers | customers with order in that period |
| retention_pct | active / cohort_size |

---

## dbt project layout (suggested)

```text
dbt-analytics/
  dbt_project.yml
  profiles.yml
  models/
    sources.yml                 # oltp postgres sources
    bronze/
      _bronze__models.yml
      bronze_oltp__orders.sql
      ...
    silver/
      _silver__models.yml
      silver_dim_customers.sql
      silver_fct_orders.sql
      ...
    gold/
      _gold__models.yml
      gold_mart_daily_sales.sql
      gold_mart_product_sales.sql
      ...
  tests/
  macros/
  seeds/                        # dim_dates optional
```

Materializations (typical):
- Bronze: `view` or `table`
- Silver: `table` / `incremental` on large facts
- Gold: `table` (API-friendly)

---

## How this hits the UI

```text
Client chart  →  GET /api/v1/analytics/...  →  Nest reads gold_*  →  DuckDB/Postgres analytics
```

Suggested API endpoints (later):

| Endpoint | Feeds |
|---|---|
| `GET /analytics/overview` | Dashboard A KPIs + daily sales |
| `GET /analytics/products` | Top products / categories |
| `GET /analytics/customers` | Cohorts + LTV |
| `GET /analytics/funnel` | Cart conversion |
| `GET /analytics/operations` | Payments, returns, inventory |

---

## Definition of done (showcase)

- [ ] All ecommerce OLTP tables seeded with 12+ months history  
- [ ] dbt `source` → bronze → silver → gold builds clean  
- [ ] Tests pass on PKs, relationships, accepted statuses  
- [ ] P0 dashboards live in the client  
- [ ] README explains the medallion path with 1 diagram  

---

## Related docs

- OLTP tables & ERD: [`SCHEMA.md`](./SCHEMA.md)
- App repos: [`README.md`](./README.md)
