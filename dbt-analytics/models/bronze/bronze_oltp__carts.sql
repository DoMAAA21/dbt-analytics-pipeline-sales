select * from {{ source('oltp', 'carts') }}
