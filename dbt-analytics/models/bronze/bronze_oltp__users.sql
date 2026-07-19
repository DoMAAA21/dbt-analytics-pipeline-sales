select * from {{ source('oltp', 'users') }}
