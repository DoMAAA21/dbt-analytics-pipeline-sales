select
    id as category_id,
    parent_id,
    trim(name) as category_name,
    lower(trim(slug)) as category_slug,
    path as category_path,
    parent_id is null as is_root,
    created_at,
    updated_at
from {{ ref('bronze_oltp__categories') }}
