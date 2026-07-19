import * as bcrypt from 'bcrypt';
import type { QueryRunner } from 'typeorm';
import { countRows, insertBatch } from './utils/batch';
import { uuid } from './utils/random';

const AUTH_USERS = [
  { email: 'user1@dbt.com', password: 'password', name: 'user1' },
  { email: 'user2@dbt.com', password: 'password', name: 'user2' },
  { email: 'admin@dbt.com', password: 'password', name: 'Admin' },
];

export async function seedAuthUsers(queryRunner: QueryRunner) {
  console.log('\n→ Auth users');
  const existing = await countRows(queryRunner, 'users');
  if (existing >= AUTH_USERS.length) {
    console.log(`  Skipping (already have ${existing} users)`);
    return;
  }

  const passwordHash = await bcrypt.hash('password', 10);
  const rows = AUTH_USERS.map((user) => [
    uuid(),
    user.email,
    passwordHash,
    user.name,
  ]);

  await insertBatch(
    queryRunner,
    'users',
    ['id', 'email', 'password_hash', 'name'],
    rows,
  );
  console.log(`  Inserted ${rows.length} auth users`);
}
