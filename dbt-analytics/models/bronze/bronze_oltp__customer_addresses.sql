select * from {{ source('oltp', 'customer_addresses') }}
