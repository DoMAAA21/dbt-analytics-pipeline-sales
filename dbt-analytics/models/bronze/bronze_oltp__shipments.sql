select * from {{ source('oltp', 'shipments') }}
