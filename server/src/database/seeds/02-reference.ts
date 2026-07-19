import type { QueryRunner } from 'typeorm';
import { countRows, insertBatch } from './utils/batch';
import { uuid } from './utils/random';

export async function seedReference(queryRunner: QueryRunner) {
  console.log('\n→ Reference data');

  if ((await countRows(queryRunner, 'payment_methods')) === 0) {
    await insertBatch(
      queryRunner,
      'payment_methods',
      ['id', 'code', 'name'],
      [
        [uuid(), 'card', 'Credit Card'],
        [uuid(), 'paypal', 'PayPal'],
        [uuid(), 'gcash', 'GCash'],
        [uuid(), 'cod', 'Cash on Delivery'],
      ],
    );
    console.log('  payment_methods: 4');
  } else {
    console.log('  payment_methods: skip');
  }

  if ((await countRows(queryRunner, 'shipping_methods')) === 0) {
    await insertBatch(
      queryRunner,
      'shipping_methods',
      ['id', 'code', 'name', 'base_rate_cents'],
      [
        [uuid(), 'standard', 'Standard Shipping', 499],
        [uuid(), 'express', 'Express Shipping', 999],
        [uuid(), 'same_day', 'Same Day', 1499],
      ],
    );
    console.log('  shipping_methods: 3');
  } else {
    console.log('  shipping_methods: skip');
  }

  if ((await countRows(queryRunner, 'coupons')) === 0) {
    await insertBatch(
      queryRunner,
      'coupons',
      [
        'id',
        'code',
        'discount_type',
        'discount_value',
        'min_order_cents',
        'max_redemptions',
        'is_active',
      ],
      [
        [uuid(), 'WELCOME10', 'percent', 10, 2000, null, true],
        [uuid(), 'SAVE500', 'fixed', 500, 5000, null, true],
        [uuid(), 'FREESHIP', 'fixed', 499, 3000, 10000, true],
        [uuid(), 'VIP20', 'percent', 20, 10000, 1000, true],
      ],
    );
    console.log('  coupons: 4');
  } else {
    console.log('  coupons: skip');
  }
}
