select * from {{ source('oltp', 'cart_items') }}
