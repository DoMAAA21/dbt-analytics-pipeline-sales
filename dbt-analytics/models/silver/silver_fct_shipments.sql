select
    s.id as shipment_id,
    s.order_id,
    o.customer_id,
    o.order_date,
    o.placed_at,
    s.shipping_method_id,
    s.warehouse_id,
    s.tracking_number,
    lower(trim(s.status)) as shipment_status,
    s.status = 'delivered' as is_delivered,
    s.shipped_at,
    s.delivered_at,
    s.created_at,
    case
        when s.shipped_at is not null
            then date_diff('hour', o.placed_at, s.shipped_at)
        else null
    end as hours_order_to_ship,
    case
        when s.delivered_at is not null and s.shipped_at is not null
            then date_diff('hour', s.shipped_at, s.delivered_at)
        else null
    end as hours_ship_to_deliver,
    case
        when s.delivered_at is not null
            then date_diff('hour', o.placed_at, s.delivered_at)
        else null
    end as hours_order_to_deliver
from {{ ref('bronze_oltp__shipments') }} s
inner join {{ ref('silver_fct_orders') }} o
    on o.order_id = s.order_id
