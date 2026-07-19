select * from {{ source('oltp', 'order_items') }}
