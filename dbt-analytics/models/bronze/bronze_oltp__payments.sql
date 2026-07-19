select * from {{ source('oltp', 'payments') }}
