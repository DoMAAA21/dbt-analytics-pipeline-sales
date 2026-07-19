select * from {{ source('oltp', 'products') }}
