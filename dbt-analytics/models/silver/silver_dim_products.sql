select
    id as product_id,
    brand_id,
    trim(name) as product_name,
    lower(trim(slug)) as product_slug,
    description,
    lower(trim(status)) as product_status,
    status in ('active', 'published') as is_active,
    created_at,
    updated_at
from {{ ref('bronze_oltp__products') }}
