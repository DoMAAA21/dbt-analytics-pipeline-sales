import type { QueryRunner } from 'typeorm';
import { seedConfig } from './config';
import { countRows, insertBatch, neededCount } from './utils/batch';
import { randomIntBetween, uuid } from './utils/random';

const WAREHOUSES = [
  ['MNL-01', 'Manila DC', 'Manila', 'PH'],
  ['CEB-01', 'Cebu DC', 'Cebu', 'PH'],
  ['SGP-01', 'Singapore Hub', 'Singapore', 'SG'],
  ['TYO-01', 'Tokyo Hub', 'Tokyo', 'JP'],
  ['LAX-01', 'LA West', 'Los Angeles', 'US'],
  ['SYD-01', 'Sydney Hub', 'Sydney', 'AU'],
  ['DAV-01', 'Davao DC', 'Davao', 'PH'],
  ['QZN-01', 'QC Overflow', 'Quezon City', 'PH'],
];

export async function seedInventory(queryRunner: QueryRunner) {
  console.log('\n→ Inventory');

  const warehouseTarget = seedConfig.warehouses;
  const existingWarehouses: Array<{ code: string }> = await queryRunner.query(
    `SELECT code FROM warehouses`,
  );
  const existingCodes = new Set(existingWarehouses.map((w) => w.code));
  const desired = WAREHOUSES.slice(0, warehouseTarget).filter(
    ([code]) => !existingCodes.has(code),
  );

  if (desired.length > 0) {
    await insertBatch(
      queryRunner,
      'warehouses',
      ['id', 'code', 'name', 'city', 'country_code', 'is_active'],
      desired.map(([code, name, city, country]) => [
        uuid(),
        code,
        name,
        city,
        country,
        true,
      ]),
    );
    console.log(
      `  warehouses: +${desired.length} (now ${existingCodes.size + desired.length})`,
    );
  } else {
    console.log(`  warehouses: skip (${existingCodes.size})`);
  }

  if ((await countRows(queryRunner, 'suppliers')) === 0) {
    await insertBatch(
      queryRunner,
      'suppliers',
      ['id', 'name', 'email', 'phone', 'country_code'],
      [
        [uuid(), 'Pacific Supply Co', 'ops@pacific.example', null, 'PH'],
        [uuid(), 'Nippon Parts', 'sales@nippon.example', null, 'JP'],
        [uuid(), 'West Coast Goods', 'hello@wcg.example', null, 'US'],
      ],
    );
    console.log('  suppliers: 3');
  }

  const warehouses: Array<{ id: string }> = await queryRunner.query(
    `SELECT id FROM warehouses`,
  );
  const variants: Array<{ id: string }> = await queryRunner.query(
    `SELECT id FROM product_variants`,
  );

  const targetLevels = warehouses.length * variants.length;
  const currentLevels = await countRows(queryRunner, 'inventory_levels');
  const toInsert = neededCount(
    targetLevels,
    currentLevels,
    seedConfig.incremental,
  );

  if (toInsert === 0 || variants.length === 0) {
    console.log(
      `  inventory_levels: skip (have ${currentLevels.toLocaleString()})`,
    );
    return;
  }

  // Build missing pairs only when incremental and some exist
  const existing = new Set<string>();
  if (currentLevels > 0) {
    const pairs: Array<{ warehouse_id: string; variant_id: string }> =
      await queryRunner.query(
        `SELECT warehouse_id, variant_id FROM inventory_levels`,
      );
    for (const pair of pairs) {
      existing.add(`${pair.warehouse_id}:${pair.variant_id}`);
    }
  }

  const rows: unknown[][] = [];
  for (const warehouse of warehouses) {
    for (const variant of variants) {
      const key = `${warehouse.id}:${variant.id}`;
      if (existing.has(key)) continue;
      rows.push([
        warehouse.id,
        variant.id,
        randomIntBetween(0, 500),
        randomIntBetween(0, 40),
        randomIntBetween(10, 80),
      ]);
    }
  }

  const batchSize = seedConfig.batchSize;
  for (let i = 0; i < rows.length; i += batchSize) {
    await insertBatch(
      queryRunner,
      'inventory_levels',
      [
        'warehouse_id',
        'variant_id',
        'quantity_on_hand',
        'quantity_reserved',
        'reorder_point',
      ],
      rows.slice(i, i + batchSize),
    );
    process.stdout.write(
      `\r  inventory_levels: ${Math.min(i + batchSize, rows.length).toLocaleString()}/${rows.length.toLocaleString()}`,
    );
  }
  process.stdout.write('\n');
}
