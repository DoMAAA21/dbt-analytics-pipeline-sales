export type SeedProfile = 'demo' | 'large' | 'mega';

const profile = (process.env.SEED_PROFILE ?? 'large') as SeedProfile;

const profiles: Record<
  SeedProfile,
  {
    customers: number;
    products: number;
    variantsPerProduct: number;
    warehouses: number;
    orders: number;
    avgItemsPerOrder: number;
    returnRate: number;
    reviewRate: number;
    couponRedemptionRate: number;
  }
> = {
  // ~200k–400k total rows — good first run
  demo: {
    customers: 5_000,
    products: 500,
    variantsPerProduct: 3,
    warehouses: 3,
    orders: 20_000,
    avgItemsPerOrder: 2.5,
    returnRate: 0.08,
    reviewRate: 0.12,
    couponRedemptionRate: 0.15,
  },
  // ~2M–4M total rows — laptop-friendly overnight / long lunch
  large: {
    customers: 80_000,
    products: 4_000,
    variantsPerProduct: 3,
    warehouses: 5,
    orders: 500_000,
    avgItemsPerOrder: 2.8,
    returnRate: 0.07,
    reviewRate: 0.1,
    couponRedemptionRate: 0.12,
  },
  // ~8M–12M+ total rows — expect hours; use incremental resumes
  mega: {
    customers: 250_000,
    products: 10_000,
    variantsPerProduct: 4,
    warehouses: 8,
    orders: 2_000_000,
    avgItemsPerOrder: 3,
    returnRate: 0.06,
    reviewRate: 0.08,
    couponRedemptionRate: 0.1,
  },
};

const selected = profiles[profile] ?? profiles.large;

export const seedConfig = {
  profile,
  batchSize: Number(process.env.SEED_BATCH_SIZE ?? 1_000),
  /** If true, only insert (target - currentCount) rows per table */
  incremental: (process.env.SEED_INCREMENTAL ?? 'true') === 'true',
  historyMonths: Number(process.env.SEED_HISTORY_MONTHS ?? 18),
  currency: 'USD',
  ...selected,
  // Allow env overrides on top of profile
  customers: Number(process.env.SEED_CUSTOMERS ?? selected.customers),
  products: Number(process.env.SEED_PRODUCTS ?? selected.products),
  orders: Number(process.env.SEED_ORDERS ?? selected.orders),
};

export function estimateRows() {
  const variants = seedConfig.products * seedConfig.variantsPerProduct;
  const orderItems = Math.round(seedConfig.orders * seedConfig.avgItemsPerOrder);
  const returns = Math.round(seedConfig.orders * seedConfig.returnRate);
  const reviews = Math.round(seedConfig.orders * seedConfig.reviewRate);

  return {
    customers: seedConfig.customers,
    products: seedConfig.products,
    variants,
    inventoryLevels: variants * seedConfig.warehouses,
    orders: seedConfig.orders,
    orderItems,
    payments: seedConfig.orders,
    shipments: Math.round(seedConfig.orders * 0.9),
    returns,
    reviews,
    roughTotal:
      seedConfig.customers +
      seedConfig.products +
      variants +
      variants * seedConfig.warehouses +
      seedConfig.orders +
      orderItems +
      seedConfig.orders +
      Math.round(seedConfig.orders * 0.9) +
      returns +
      reviews,
  };
}
