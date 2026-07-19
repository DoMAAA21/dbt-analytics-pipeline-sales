select
    r.id as refund_id,
    r.return_id,
    r.payment_id,
    p.order_id,
    p.customer_id,
    p.order_date,
    r.amount_cents as refund_cents,
    lower(trim(r.status)) as refund_status,
    r.status = 'completed' as is_completed,
    r.refunded_at,
    cast(coalesce(r.refunded_at, r.created_at) as date) as refund_date,
    r.created_at
from {{ ref('bronze_oltp__refunds') }} r
inner join {{ ref('silver_fct_payments') }} p
    on p.payment_id = r.payment_id
where r.amount_cents >= 0
