import { randomInt, randomUUID } from 'node:crypto';

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn',
  'Sam', 'Jamie', 'Cameron', 'Drew', 'Harper', 'Reese', 'Skyler', 'Rowan',
  'Kai', 'Noah', 'Mia', 'Liam', 'Emma', 'Olivia', 'Sophia', 'Isabella',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
];

const CITIES = [
  { city: 'Manila', state: 'NCR', postal: '1000', country: 'PH' },
  { city: 'Cebu', state: 'Central Visayas', postal: '6000', country: 'PH' },
  { city: 'Davao', state: 'Davao', postal: '8000', country: 'PH' },
  { city: 'Makati', state: 'NCR', postal: '1200', country: 'PH' },
  { city: 'Quezon City', state: 'NCR', postal: '1100', country: 'PH' },
  { city: 'Singapore', state: 'SG', postal: '018956', country: 'SG' },
  { city: 'Tokyo', state: 'Tokyo', postal: '100-0001', country: 'JP' },
  { city: 'Sydney', state: 'NSW', postal: '2000', country: 'AU' },
  { city: 'Los Angeles', state: 'CA', postal: '90001', country: 'US' },
  { city: 'New York', state: 'NY', postal: '10001', country: 'US' },
];

const PRODUCT_ADJECTIVES = [
  'Classic', 'Premium', 'Urban', 'Trail', 'Studio', 'Everyday', 'Pro', 'Lite',
  'Nova', 'Apex', 'Soft', 'Bold', 'Essential', 'Signature', 'Flex',
];

const PRODUCT_NOUNS = [
  'Tee', 'Hoodie', 'Sneaker', 'Backpack', 'Bottle', 'Watch', 'Jacket', 'Jeans',
  'Cap', 'Socks', 'Headphones', 'Charger', 'Lamp', 'Mug', 'Notebook', 'Mouse',
];

const COLORS = ['black', 'white', 'navy', 'red', 'olive', 'sand', 'grey', 'blue'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export function uuid() {
  return randomUUID();
}

export function pick<T>(items: T[]): T {
  return items[randomInt(items.length)];
}

export function chance(probability: number) {
  return Math.random() < probability;
}

export function randomName() {
  return {
    firstName: pick(FIRST_NAMES),
    lastName: pick(LAST_NAMES),
  };
}

export function randomCity() {
  return pick(CITIES);
}

export function randomProductName(index: number) {
  return `${pick(PRODUCT_ADJECTIVES)} ${pick(PRODUCT_NOUNS)} ${index}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function randomVariantAttrs() {
  return {
    color: pick(COLORS),
    size: pick(SIZES),
  };
}

export function randomDateBetween(start: Date, end: Date) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return new Date(startMs + Math.random() * (endMs - startMs));
}

export function historyWindow(months: number) {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  return { start, end };
}

export function randomIntBetween(min: number, max: number) {
  return randomInt(min, max + 1);
}

export function orderStatusesWeighted() {
  const roll = Math.random();
  if (roll < 0.05) return 'pending';
  if (roll < 0.12) return 'cancelled';
  if (roll < 0.2) return 'refunded';
  if (roll < 0.55) return 'fulfilled';
  return 'paid';
}
