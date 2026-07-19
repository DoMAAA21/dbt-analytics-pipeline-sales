select * from {{ source('oltp', 'inventory_levels') }}
