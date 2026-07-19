import dataSource from '../data-source';

/**
 * Clears transactional ecommerce tables (keeps users + migrations).
 * Reference rows are also cleared so the next seed can recreate them.
 */
async function clear() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  console.log('Clearing ecommerce seed tables...');

  await qr.query('SET session_replication_role = replica');

  const tables = [
    'product_reviews',
    'refunds',
    'return_items',
    'returns',
    'coupon_redemptions',
    'coupons',
    'shipment_items',
    'shipments',
    'payments',
    'order_status_history',
    'order_items',
    'orders',
    'cart_items',
    'carts',
    'shipping_methods',
    'payment_methods',
    'purchase_order_items',
    'purchase_orders',
    'suppliers',
    'inventory_levels',
    'warehouses',
    'wishlist_items',
    'product_images',
    'product_variants',
    'product_categories',
    'products',
    'categories',
    'brands',
    'customer_addresses',
    'customers',
  ];

  for (const table of tables) {
    await qr.query(`TRUNCATE TABLE ${table} CASCADE`);
    console.log(`  truncated ${table}`);
  }

  await qr.query('SET session_replication_role = DEFAULT');
  await qr.release();
  await dataSource.destroy();
  console.log('✓ Seed data cleared (users kept)');
}

clear().catch(async (error) => {
  console.error('Clear failed:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
