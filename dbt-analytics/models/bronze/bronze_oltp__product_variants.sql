select * from {{ source('oltp', 'product_variants') }}
