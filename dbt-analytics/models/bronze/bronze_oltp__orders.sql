select * from {{ source('oltp', 'orders') }}
