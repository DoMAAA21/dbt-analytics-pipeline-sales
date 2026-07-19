select
    c.id as cart_id,
    c.customer_id,
    lower(trim(c.status)) as cart_status,
    upper(trim(c.currency_code)) as currency_code,
    c.created_at,
    c.updated_at,
    cast(c.created_at as date) as cart_date,
    o.order_id as converted_order_id,
    o.order_id is not null as is_converted,
    case
        when o.order_id is not null then false
        when lower(trim(c.status)) in ('abandoned', 'expired') then true
        else true
    end as is_abandoned,
    (
        select coalesce(sum(ci.quantity), 0)
        from {{ ref('bronze_oltp__cart_items') }} ci
        where ci.cart_id = c.id
    ) as item_quantity,
    (
        select coalesce(sum(ci.quantity * ci.unit_price_cents), 0)
        from {{ ref('bronze_oltp__cart_items') }} ci
        where ci.cart_id = c.id
    ) as cart_value_cents
from {{ ref('bronze_oltp__carts') }} c
left join {{ ref('silver_fct_orders') }} o
    on o.cart_id = c.id
