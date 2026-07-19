select
    id as review_id,
    product_id,
    customer_id,
    order_id,
    rating,
    nullif(trim(title), '') as review_title,
    nullif(trim(body), '') as review_body,
    coalesce(is_verified_purchase, false) as is_verified_purchase,
    created_at,
    cast(created_at as date) as review_date,
    rating between 1 and 5 as is_valid_rating
from {{ ref('bronze_oltp__product_reviews') }}
where rating between 1 and 5
