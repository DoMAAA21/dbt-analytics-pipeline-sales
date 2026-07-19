select
    p.id as payment_id,
    p.order_id,
    o.customer_id,
    o.order_date,
    p.payment_method_id,
    p.amount_cents,
    lower(trim(p.status)) as payment_status,
    p.status = 'succeeded' as is_succeeded,
    p.status = 'refunded' as is_refunded,
    p.status = 'pending' as is_pending,
    p.provider_ref,
    p.paid_at,
    cast(coalesce(p.paid_at, p.created_at) as date) as payment_date,
    p.created_at
from {{ ref('bronze_oltp__payments') }} p
inner join {{ ref('silver_fct_orders') }} o
    on o.order_id = p.order_id
where p.amount_cents >= 0
