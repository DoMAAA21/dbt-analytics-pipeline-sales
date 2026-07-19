select
    id as order_id,
    order_number,
    customer_id,
    cart_id,
    lower(trim(status)) as order_status,
    upper(trim(currency_code)) as currency_code,
    subtotal_cents,
    discount_cents,
    shipping_cents,
    tax_cents,
    total_cents,
    shipping_address_id,
    billing_address_id,
    placed_at,
    cast(placed_at as date) as order_date,
    status in ('paid', 'fulfilled', 'refunded') as is_revenue_order,
    status = 'cancelled' as is_cancelled,
    status = 'refunded' as is_refunded,
    status = 'fulfilled' as is_fulfilled,
    created_at,
    updated_at
from {{ ref('bronze_oltp__orders') }}
where customer_id is not null
  and placed_at is not null
  and total_cents >= 0
