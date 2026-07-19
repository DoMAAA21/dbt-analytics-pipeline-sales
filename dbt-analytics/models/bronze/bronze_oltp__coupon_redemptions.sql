select * from {{ source('oltp', 'coupon_redemptions') }}
