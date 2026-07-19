select * from {{ source('oltp', 'product_reviews') }}
