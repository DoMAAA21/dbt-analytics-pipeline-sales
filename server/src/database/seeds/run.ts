import dataSource from '../data-source';
import { estimateRows, seedConfig } from './config';
import { seedAuthUsers } from './01-auth-users';
import { seedReference } from './02-reference';
import { seedCustomers } from './03-customers';
import { seedCatalog } from './04-catalog';
import { seedInventory } from './05-inventory';
import { seedOrders } from './06-orders';
import { seedReturnsAndReviews } from './07-returns-reviews';

async function main() {
  const estimate = estimateRows();

  console.log('═══════════════════════════════════════════');
  console.log(' Ecommerce seed');
  console.log('═══════════════════════════════════════════');
  console.log(` Profile:      ${seedConfig.profile}`);
  console.log(` Incremental:  ${seedConfig.incremental}`);
  console.log(` Batch size:   ${seedConfig.batchSize}`);
  console.log(` Targets:`);
  console.log(`   customers:  ${seedConfig.customers.toLocaleString()}`);
  console.log(`   products:   ${seedConfig.products.toLocaleString()}`);
  console.log(`   orders:     ${seedConfig.orders.toLocaleString()}`);
  console.log(
    ` Rough total rows (estimate): ${estimate.roughTotal.toLocaleString()}`,
  );
  console.log('═══════════════════════════════════════════');

  if (seedConfig.profile === 'mega') {
    console.log(
      '\n⚠ mega profile can take hours and use many GB of disk. Prefer SEED_INCREMENTAL=true and resume if interrupted.\n',
    );
  }

  await dataSource.initialize();

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  const started = Date.now();

  try {
    await seedAuthUsers(queryRunner);
    await seedReference(queryRunner);
    await seedCustomers(queryRunner);
    await seedCatalog(queryRunner);
    await seedInventory(queryRunner);
    await seedOrders(queryRunner);
    await seedReturnsAndReviews(queryRunner);

    const elapsedMin = ((Date.now() - started) / 60000).toFixed(1);
    console.log('\n✓ Seed completed');
    console.log(`  Elapsed: ${elapsedMin} minutes`);
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

main().catch(async (error) => {
  console.error('\n✗ Seed failed:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
