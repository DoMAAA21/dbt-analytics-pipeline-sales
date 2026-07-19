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
  randomCity,
  randomName,
  uuid,
} from './utils/random';

export async function seedCustomers(queryRunner: QueryRunner) {
  console.log('\n→ Customers + addresses');

  const current = await countRows(queryRunner, 'customers');
  const toInsert = neededCount(
    seedConfig.customers,
    current,
    seedConfig.incremental,
  );

  if (toInsert === 0) {
    console.log(`  Skipping customers (have ${current.toLocaleString()})`);
    return;
  }

  const batchSize = seedConfig.batchSize;
  let inserted = 0;

  while (inserted < toInsert) {
    const size = Math.min(batchSize, toInsert - inserted);
    const customerRows: unknown[][] = [];
    const addressRows: unknown[][] = [];

    for (let i = 0; i < size; i++) {
      const customerId = uuid();
      const { firstName, lastName } = randomName();
      const city = randomCity();

      customerRows.push([
        customerId,
        null,
        firstName,
        lastName,
        chance(0.6) ? `09${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}` : null,
        chance(0.4) ? `19${70 + Math.floor(Math.random() * 30)}-0${1 + Math.floor(Math.random() * 9)}-15` : null,
        chance(0.55),
        null,
      ]);

      addressRows.push([
        uuid(),
        customerId,
        chance(0.5) ? 'home' : 'work',
        `${100 + Math.floor(Math.random() * 900)} Main St`,
        chance(0.3) ? `Unit ${1 + Math.floor(Math.random() * 40)}` : null,
        city.city,
        city.state,
        city.postal,
        city.country,
        true,
        true,
      ]);
    }

    await insertBatch(
      queryRunner,
      'customers',
      [
        'id',
        'user_id',
        'first_name',
        'last_name',
        'phone',
        'date_of_birth',
        'marketing_opt_in',
        'lifetime_value_cache',
      ],
      customerRows,
    );

    await insertBatch(
      queryRunner,
      'customer_addresses',
      [
        'id',
        'customer_id',
        'label',
        'line1',
        'line2',
        'city',
        'state',
        'postal_code',
        'country_code',
        'is_default_shipping',
        'is_default_billing',
      ],
      addressRows,
    );

    inserted += size;
    logProgress('customers', inserted, toInsert);
  }
}
