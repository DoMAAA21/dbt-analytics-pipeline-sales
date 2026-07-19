import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import { User } from '../users/user.entity';

const users = [
  {
    email: 'user1@dbt.com',
    password: 'password',
    name: ' user1',
  },
  {
    email: 'user2@dbt.com',
    password: 'password',
    name: 'user2',
  },
  {
    email: 'user3@dbt.com',
    password: 'password123',
    name: 'user3',
  },
];

async function seed() {
  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);

  for (const user of users) {
    const existing = await userRepository.findOne({
      where: { email: user.email },
    });

    if (existing) {
      console.log(`Skipping existing user: ${user.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(user.password, 10);
    await userRepository.save(
      userRepository.create({
        email: user.email,
        name: user.name,
        passwordHash,
      }),
    );

    console.log(`Created user: ${user.email}`);
  }

  await dataSource.destroy();
  console.log('Seed completed');
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
