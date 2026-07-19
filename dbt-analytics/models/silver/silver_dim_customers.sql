with customers as (
    select * from {{ ref('bronze_oltp__customers') }}
),

default_shipping as (
    select
        customer_id,
        city,
        state,
        postal_code,
        country_code
    from {{ ref('bronze_oltp__customer_addresses') }}
    where is_default_shipping = true
    qualify row_number() over (
        partition by customer_id
        order by updated_at desc, id
    ) = 1
)

select
    c.id as customer_id,
    c.user_id,
    trim(c.first_name) as first_name,
    trim(c.last_name) as last_name,
    nullif(trim(c.first_name) || ' ' || trim(c.last_name), ' ') as full_name,
    c.phone,
    c.date_of_birth,
    coalesce(c.marketing_opt_in, false) as marketing_opt_in,
    c.lifetime_value_cache,
    ds.city as default_city,
    ds.state as default_state,
    ds.postal_code as default_postal_code,
    ds.country_code as default_country_code,
    c.created_at,
    c.updated_at
from customers c
left join default_shipping ds
    on ds.customer_id = c.id
