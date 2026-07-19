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
  pick,
  randomIntBetween,
  uuid,
} from './utils/random';

const RETURN_REASONS = [
  'too_small',
  'too_large',
  'damaged',
  'not_as_described',
  'changed_mind',
  'wrong_item',
];

const CONDITIONS = ['unopened', 'used', 'damaged'];

export async function seedReturnsAndReviews(queryRunner: QueryRunner) {
  console.log('\n→ Returns / refunds / reviews');

  const returnTarget = Math.round(seedConfig.orders * seedConfig.returnRate);
  const currentReturns = await countRows(queryRunner, 'returns');
  const returnsToInsert = neededCount(
    returnTarget,
    currentReturns,
    seedConfig.incremental,
  );

  if (returnsToInsert > 0) {
    // Sample candidate orders without loading the full table into Node
    const sampleSize = Math.min(returnsToInsert * 3, 50_000);
    const candidates: Array<{
      order_id: string;
      customer_id: string;
      placed_at: Date;
      order_item_id: string;
      quantity: number;
      payment_id: string | null;
      amount_cents: number | null;
    }> = await queryRunner.query(
      `
      SELECT
        o.id AS order_id,
        o.customer_id,
        o.placed_at,
        oi.id AS order_item_id,
        oi.quantity,
        p.id AS payment_id,
        p.amount_cents
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN payments p
        ON p.order_id = o.id
       AND p.status IN ('succeeded', 'refunded')
      WHERE o.status IN ('fulfilled', 'refunded', 'paid')
      ORDER BY random()
      LIMIT $1
      `,
      [sampleSize],
    );

    if (candidates.length === 0) {
      console.log('  returns: no candidate orders yet');
    } else {
      let inserted = 0;
      const batchSize = Math.min(seedConfig.batchSize, 500);

      while (inserted < returnsToInsert) {
        const size = Math.min(batchSize, returnsToInsert - inserted);
        const returnRows: unknown[][] = [];
        const returnItemRows: unknown[][] = [];
        const refundRows: unknown[][] = [];

        for (let i = 0; i < size; i++) {
          const row = pick(candidates);
          const returnId = uuid();
          const requestedAt = new Date(
            new Date(row.placed_at).getTime() +
              1000 * 60 * 60 * 24 * randomIntBetween(3, 30),
          );
          const status = pick([
            'requested',
            'approved',
            'received',
            'rejected',
          ]);

          returnRows.push([
            returnId,
            row.order_id,
            status,
            pick(RETURN_REASONS),
            requestedAt,
            status === 'requested' ? null : requestedAt,
          ]);

          returnItemRows.push([
            uuid(),
            returnId,
            row.order_item_id,
            Math.max(1, Math.min(row.quantity, randomIntBetween(1, 2))),
            pick(CONDITIONS),
          ]);

          if (
            row.payment_id &&
            row.amount_cents &&
            status !== 'rejected' &&
            chance(0.8)
          ) {
            refundRows.push([
              uuid(),
              returnId,
              row.payment_id,
              Math.round(row.amount_cents * (0.3 + Math.random() * 0.7)),
              'completed',
              requestedAt,
            ]);
          }
        }

        await insertBatch(
          queryRunner,
          'returns',
          ['id', 'order_id', 'status', 'reason', 'requested_at', 'resolved_at'],
          returnRows,
        );
        await insertBatch(
          queryRunner,
          'return_items',
          ['id', 'return_id', 'order_item_id', 'quantity', 'condition'],
          returnItemRows,
        );
        await insertBatch(
          queryRunner,
          'refunds',
          [
            'id',
            'return_id',
            'payment_id',
            'amount_cents',
            'status',
            'refunded_at',
          ],
          refundRows,
        );

        inserted += size;
        logProgress('returns', inserted, returnsToInsert);
      }
    }
  } else {
    console.log(`  returns: skip (have ${currentReturns.toLocaleString()})`);
  }

  const reviewTarget = Math.round(seedConfig.orders * seedConfig.reviewRate);
  const currentReviews = await countRows(queryRunner, 'product_reviews');
  const reviewsToInsert = neededCount(
    reviewTarget,
    currentReviews,
    seedConfig.incremental,
  );

  if (reviewsToInsert > 0) {
    const sampleSize = Math.min(reviewsToInsert * 3, 50_000);
    const candidates: Array<{
      order_id: string;
      customer_id: string;
      placed_at: Date;
      product_id: string;
    }> = await queryRunner.query(
      `
      SELECT
        o.id AS order_id,
        o.customer_id,
        o.placed_at,
        p.id AS product_id
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN product_variants pv ON pv.id = oi.variant_id
      JOIN products p ON p.id = pv.product_id
      WHERE o.status IN ('fulfilled', 'refunded', 'paid')
      ORDER BY random()
      LIMIT $1
      `,
      [sampleSize],
    );

    if (candidates.length === 0) {
      console.log('  reviews: no candidate orders yet');
      return;
    }

    let inserted = 0;
    const batchSize = Math.min(seedConfig.batchSize, 500);

    while (inserted < reviewsToInsert) {
      const size = Math.min(batchSize, reviewsToInsert - inserted);
      const rows: unknown[][] = [];

      for (let i = 0; i < size; i++) {
        const row = pick(candidates);
        const rating = randomIntBetween(1, 5);
        rows.push([
          uuid(),
          row.product_id,
          row.customer_id,
          chance(0.7) ? row.order_id : null,
          rating,
          rating >= 4 ? 'Great product' : 'Okay',
          rating >= 4
            ? 'Would buy again. Solid quality for the price.'
            : 'Mixed feelings, shipping was fine though.',
          chance(0.65),
          row.placed_at,
        ]);
      }

      await insertBatch(
        queryRunner,
        'product_reviews',
        [
          'id',
          'product_id',
          'customer_id',
          'order_id',
          'rating',
          'title',
          'body',
          'is_verified_purchase',
          'created_at',
        ],
        rows,
      );

      inserted += size;
      logProgress('reviews', inserted, reviewsToInsert);
    }
  } else {
    console.log(`  reviews: skip (have ${currentReviews.toLocaleString()})`);
  }
}
