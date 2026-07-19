select
    v.id as variant_id,
    v.product_id,
    p.product_name,
    p.product_status,
    upper(trim(v.sku)) as sku,
    trim(v.name) as variant_name,
    v.attributes,
    v.price_cents,
    v.compare_at_price_cents,
    coalesce(v.cost_cents, 0) as cost_cents,
    v.weight_grams,
    coalesce(v.is_active, false) as is_active,
    case
        when v.price_cents > 0
            then (v.price_cents - coalesce(v.cost_cents, 0))::double / v.price_cents
        else null
    end as list_margin_pct,
    v.created_at,
    v.updated_at
from {{ ref('bronze_oltp__product_variants') }} v
inner join {{ ref('silver_dim_products') }} p
    on p.product_id = v.product_id
