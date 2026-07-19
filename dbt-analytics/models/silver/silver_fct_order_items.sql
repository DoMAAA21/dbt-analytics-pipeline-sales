select
    oi.id as order_item_id,
    oi.order_id,
    o.customer_id,
    o.order_date,
    o.placed_at,
    o.order_status,
    o.is_revenue_order,
    oi.variant_id,
    v.product_id,
    v.product_name,
    v.sku,
    coalesce(nullif(trim(oi.product_name_snapshot), ''), v.product_name) as product_name_snapshot,
    upper(trim(oi.sku_snapshot)) as sku_snapshot,
    oi.quantity,
    oi.unit_price_cents,
    oi.discount_cents,
    oi.tax_cents,
    oi.line_total_cents,
    v.cost_cents as unit_cost_cents,
    (oi.quantity * v.cost_cents) as cogs_cents,
    (oi.line_total_cents - (oi.quantity * v.cost_cents)) as gross_margin_cents,
    case
        when oi.line_total_cents > 0
            then (oi.line_total_cents - (oi.quantity * v.cost_cents))::double / oi.line_total_cents
        else null
    end as gross_margin_pct
from {{ ref('bronze_oltp__order_items') }} oi
inner join {{ ref('silver_fct_orders') }} o
    on o.order_id = oi.order_id
inner join {{ ref('silver_dim_variants') }} v
    on v.variant_id = oi.variant_id
where oi.quantity > 0
  and oi.line_total_cents >= 0
