with revenue_lines as (
    select *
    from {{ ref('silver_fct_order_items') }}
    where is_revenue_order = true
),

order_refunds as (
    select
        order_id,
        sum(refund_cents)::bigint as refund_cents
    from {{ ref('silver_fct_refunds') }}
    where is_completed = true
    group by order_id
),

allocated as (
    select
        l.order_date,
        l.order_id,
        l.product_id,
        l.product_name,
        l.variant_id,
        l.sku,
        l.quantity,
        l.line_total_cents,
        l.discount_cents,
        l.cogs_cents,
        l.gross_margin_cents,
        sum(l.line_total_cents) over (partition by l.order_id) as order_lines_total,
        coalesce(r.refund_cents, 0) as order_refund_cents
    from revenue_lines l
    left join order_refunds r
        on r.order_id = l.order_id
),

lines as (
    select
        order_date,
        order_id,
        product_id,
        product_name,
        variant_id,
        sku,
        quantity,
        line_total_cents,
        discount_cents,
        cogs_cents,
        gross_margin_cents,
        case
            when order_lines_total > 0 then
                cast(
                    round(order_refund_cents * (line_total_cents::double / order_lines_total))
                    as bigint
                )
            else 0
        end as refund_cents
    from allocated
)

select
    order_date,
    product_id,
    any_value(product_name) as product_name,
    count(distinct variant_id)::bigint as sku_count,
    count(distinct order_id)::bigint as order_count,
    sum(quantity)::bigint as units_sold,
    sum(line_total_cents)::bigint as gross_revenue_cents,
    sum(refund_cents)::bigint as refund_cents,
    sum(line_total_cents - refund_cents)::bigint as net_revenue_cents,
    sum(discount_cents)::bigint as discount_cents,
    sum(cogs_cents)::bigint as cogs_cents,
    sum(gross_margin_cents)::bigint as gross_margin_cents,
    case
        when sum(line_total_cents) > 0
            then sum(gross_margin_cents)::double / sum(line_total_cents)
        else null
    end as gross_margin_pct
from lines
group by order_date, product_id
