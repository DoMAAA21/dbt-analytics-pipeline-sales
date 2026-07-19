with bounds as (
    select
        min(cast(placed_at as date)) as start_date,
        max(cast(placed_at as date)) as end_date
    from {{ ref('bronze_oltp__orders') }}
),

spine as (
    select date_day
    from bounds,
        generate_series(start_date, end_date, interval '1 day') as t(date_day)
)

select
    cast(date_day as date) as date_day,
    extract(year from date_day)::int as year_number,
    extract(quarter from date_day)::int as quarter_number,
    extract(month from date_day)::int as month_number,
    extract(day from date_day)::int as day_of_month,
    extract(dow from date_day)::int as day_of_week, -- 0=Sunday in DuckDB
    strftime(date_day, '%Y-%m') as year_month,
    strftime(date_day, '%Y')
        || '-Q'
        || cast(extract(quarter from date_day) as varchar) as year_quarter,
    strftime(date_day, '%A') as day_name,
    strftime(date_day, '%B') as month_name,
    extract(dow from date_day) in (0, 6) as is_weekend
from spine
