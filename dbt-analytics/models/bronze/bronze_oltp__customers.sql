select * from {{ source('oltp', 'customers') }}
