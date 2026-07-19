select
    warehouse_id,
    variant_id,
    quantity_on_hand,
    quantity_reserved,
    greatest(quantity_on_hand - quantity_reserved, 0) as quantity_available,
    reorder_point,
    quantity_on_hand <= coalesce(reorder_point, 0) as is_below_reorder_point,
    quantity_on_hand - quantity_reserved <= 0 as is_stockout,
    updated_at
from {{ ref('bronze_oltp__inventory_levels') }}
where quantity_on_hand >= 0
  and quantity_reserved >= 0
