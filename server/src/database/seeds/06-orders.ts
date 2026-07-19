import type { QueryRunner } from 'typeorm';
import { seedConfig } from './config';
import {
  countRows,
  insertBatch,
  neededCount,
  logProgress,
} from './utils/batch';
import {
  chance,
  historyWindow,
  orderStatusesWeighted,
  pick,
  randomDateBetween,
  randomIntBetween,
  uuid,
} from './utils/random';

type Variant = { id: string; price_cents: number; sku: string; product_name: string };
type Customer = { id: string };
type Address = { id: string; customer_id: string };
type Method = { id: string };

export async function seedOrders(queryRunner: QueryRunner) {
  console.log('\n→ Orders / items / payments / shipments');

  const currentOrders = await countRows(queryRunner, 'orders');
  const toInsert = neededCount(
    seedConfig.orders,
    currentOrders,
    seedConfig.incremental,
  );

  if (toInsert === 0) {
    console.log(`  Skipping orders (have ${currentOrders.toLocaleString()})`);
    return;
  }

  const customers: Customer[] = await queryRunner.query(
    `SELECT id FROM customers`,
  );
  const addresses: Address[] = await queryRunner.query(
    `SELECT id, customer_id FROM customer_addresses`,
  );
  const variants: Variant[] = await queryRunner.query(`
    SELECT
      v.id,
      v.price_cents,
      v.sku,
      p.name AS product_name
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
  `);
  const paymentMethods: Method[] = await queryRunner.query(
    `SELECT id FROM payment_methods`,
  );
  const shippingMethods: Method[] = await queryRunner.query(
    `SELECT id FROM shipping_methods`,
  );
  const warehouses: Method[] = await queryRunner.query(
    `SELECT id FROM warehouses`,
  );
  const coupons: Array<{ id: string; discount_type: string; discount_value: number }> =
    await queryRunner.query(
      `SELECT id, discount_type, discount_value FROM coupons WHERE is_active = true`,
    );

  if (
    customers.length === 0 ||
    variants.length === 0 ||
    paymentMethods.length === 0 ||
    shippingMethods.length === 0
  ) {
    throw new Error(
      'Missing prerequisites (customers/variants/payment_methods/shipping_methods). Run earlier seeds first.',
    );
  }

  const addressesByCustomer = new Map<string, string[]>();
  for (const address of addresses) {
    const list = addressesByCustomer.get(address.customer_id) ?? [];
    list.push(address.id);
    addressesByCustomer.set(address.customer_id, list);
  }

  const { start, end } = historyWindow(seedConfig.historyMonths);
  const batchSize = Math.min(seedConfig.batchSize, 500);
  let inserted = 0;
  let orderNumberOffset = currentOrders;

  while (inserted < toInsert) {
    const size = Math.min(batchSize, toInsert - inserted);

    const orderRows: unknown[][] = [];
    const itemRows: unknown[][] = [];
    const statusRows: unknown[][] = [];
    const paymentRows: unknown[][] = [];
    const shipmentRows: unknown[][] = [];
    const shipmentItemRows: unknown[][] = [];
    const redemptionRows: unknown[][] = [];

    for (let i = 0; i < size; i++) {
      const customer = pick(customers);
      const customerAddresses = addressesByCustomer.get(customer.id) ?? [];
      const addressId =
        customerAddresses.length > 0 ? pick(customerAddresses) : null;
      const placedAt = randomDateBetween(start, end);
      const status = orderStatusesWeighted();
      const orderId = uuid();
      orderNumberOffset += 1;
      const orderNumber = `ORD-${String(orderNumberOffset).padStart(8, '0')}`;

      const itemCount = Math.max(
        1,
        Math.round(
          seedConfig.avgItemsPerOrder + (Math.random() - 0.5) * 2,
        ),
      );

      let subtotal = 0;
      const lineIds: string[] = [];

      for (let line = 0; line < itemCount; line++) {
        const variant = pick(variants);
        const qty = randomIntBetween(1, 4);
        const discount = chance(0.15) ? Math.round(variant.price_cents * 0.1) : 0;
        const lineTotal = variant.price_cents * qty - discount;
        subtotal += lineTotal;
        const orderItemId = uuid();
        lineIds.push(orderItemId);

        itemRows.push([
          orderItemId,
          orderId,
          variant.id,
          variant.product_name,
          variant.sku,
          qty,
          variant.price_cents,
          discount,
          Math.round(lineTotal * 0.08),
          lineTotal,
        ]);
      }

      let discountCents = 0;
      if (chance(seedConfig.couponRedemptionRate) && coupons.length > 0) {
        const coupon = pick(coupons);
        discountCents =
          coupon.discount_type === 'percent'
            ? Math.round(subtotal * (coupon.discount_value / 100))
            : coupon.discount_value;
        discountCents = Math.min(discountCents, subtotal);
        redemptionRows.push([
          uuid(),
          coupon.id,
          orderId,
          customer.id,
          discountCents,
          placedAt,
        ]);
      }

      const shippingCents =
        status === 'cancelled' ? 0 : pick([499, 999, 1499]);
      const taxCents = Math.round((subtotal - discountCents) * 0.08);
      const totalCents = Math.max(
        0,
        subtotal - discountCents + shippingCents + taxCents,
      );

      orderRows.push([
        orderId,
        orderNumber,
        customer.id,
        null,
        status,
        seedConfig.currency,
        subtotal,
        discountCents,
        shippingCents,
        taxCents,
        totalCents,
        addressId,
        addressId,
        placedAt,
      ]);

      statusRows.push([
        uuid(),
        orderId,
        null,
        status,
        placedAt,
        'seed',
      ]);

      if (status !== 'cancelled') {
        const paidAt =
          status === 'pending'
            ? null
            : new Date(placedAt.getTime() + 1000 * 60 * 30);
        paymentRows.push([
          uuid(),
          orderId,
          pick(paymentMethods).id,
          totalCents,
          status === 'pending' ? 'pending' : status === 'refunded' ? 'refunded' : 'succeeded',
          `pay_${orderNumber}`,
          paidAt,
        ]);
      }

      if (status === 'fulfilled' || status === 'refunded') {
        const shipmentId = uuid();
        const shippedAt = new Date(
          placedAt.getTime() + 1000 * 60 * 60 * 24 * randomIntBetween(1, 5),
        );
        const deliveredAt = new Date(
          shippedAt.getTime() + 1000 * 60 * 60 * 24 * randomIntBetween(1, 7),
        );
        shipmentRows.push([
          shipmentId,
          orderId,
          pick(shippingMethods).id,
          warehouses.length ? pick(warehouses).id : null,
          `TRK${orderNumberOffset}${randomIntBetween(1000, 9999)}`,
          'delivered',
          shippedAt,
          deliveredAt,
        ]);

        for (const lineId of lineIds) {
          shipmentItemRows.push([
            uuid(),
            shipmentId,
            lineId,
            randomIntBetween(1, 2),
          ]);
        }
      }
    }

    await insertBatch(
      queryRunner,
      'orders',
      [
        'id',
        'order_number',
        'customer_id',
        'cart_id',
        'status',
        'currency_code',
        'subtotal_cents',
        'discount_cents',
        'shipping_cents',
        'tax_cents',
        'total_cents',
        'shipping_address_id',
        'billing_address_id',
        'placed_at',
      ],
      orderRows,
    );
    await insertBatch(
      queryRunner,
      'order_items',
      [
        'id',
        'order_id',
        'variant_id',
        'product_name_snapshot',
        'sku_snapshot',
        'quantity',
        'unit_price_cents',
        'discount_cents',
        'tax_cents',
        'line_total_cents',
      ],
      itemRows,
    );
    await insertBatch(
      queryRunner,
      'order_status_history',
      ['id', 'order_id', 'from_status', 'to_status', 'changed_at', 'changed_by'],
      statusRows,
    );
    await insertBatch(
      queryRunner,
      'payments',
      [
        'id',
        'order_id',
        'payment_method_id',
        'amount_cents',
        'status',
        'provider_ref',
        'paid_at',
      ],
      paymentRows,
    );
    await insertBatch(
      queryRunner,
      'shipments',
      [
        'id',
        'order_id',
        'shipping_method_id',
        'warehouse_id',
        'tracking_number',
        'status',
        'shipped_at',
        'delivered_at',
      ],
      shipmentRows,
    );
    await insertBatch(
      queryRunner,
      'shipment_items',
      ['id', 'shipment_id', 'order_item_id', 'quantity'],
      shipmentItemRows,
    );
    await insertBatch(
      queryRunner,
      'coupon_redemptions',
      [
        'id',
        'coupon_id',
        'order_id',
        'customer_id',
        'discount_cents',
        'redeemed_at',
      ],
      redemptionRows,
    );

    inserted += size;
    logProgress('orders', inserted, toInsert);
  }
}
