with revenue_orders as (
    select *
    from {{ ref('silver_fct_orders') }}
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

daily_orders as (
    select
        o.order_date,
        count(*)::bigint as order_count,
        sum(o.total_cents)::bigint as gmv_cents,
        sum(o.subtotal_cents)::bigint as subtotal_cents,
        sum(o.discount_cents)::bigint as discount_cents,
        sum(o.shipping_cents)::bigint as shipping_cents,
        sum(o.tax_cents)::bigint as tax_cents,
        sum(coalesce(r.refund_cents, 0))::bigint as refund_cents,
        count(distinct case when coalesce(r.refund_cents, 0) > 0 then o.order_id end)::bigint
            as refunded_order_count
    from revenue_orders o
    left join order_refunds r
        on r.order_id = o.order_id
    group by o.order_date
),

daily_reviews as (
    select
        review_date as order_date,
        count(*)::bigint as review_count,
        avg(rating)::double as avg_rating
    from {{ ref('silver_fct_reviews') }}
    group by review_date
)

select
    d.order_date,
    d.order_count,
    d.gmv_cents,
    (d.gmv_cents - d.refund_cents)::bigint as net_revenue_cents,
    d.refund_cents,
    d.refunded_order_count,
    d.subtotal_cents,
    d.discount_cents,
    d.shipping_cents,
    d.tax_cents,
    case
        when d.order_count > 0 then (d.gmv_cents::double / d.order_count)
        else null
    end as aov_cents,
    case
        when d.gmv_cents > 0 then d.refund_cents::double / d.gmv_cents
        else 0
    end as refund_rate,
    coalesce(rv.review_count, 0)::bigint as review_count,
    rv.avg_rating
from daily_orders d
left join daily_reviews rv
    on rv.order_date = d.order_date
