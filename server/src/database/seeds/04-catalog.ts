import type { QueryRunner } from 'typeorm';
import { seedConfig } from './config';
import {
  countRows,
  insertBatch,
  neededCount,
  logProgress,
} from './utils/batch';
import {
  randomIntBetween,
  randomProductName,
  randomVariantAttrs,
  slugify,
  uuid,
} from './utils/random';

const BRANDS = [
  ['Northpeak', 'northpeak'],
  ['Silkroad', 'silkroad'],
  ['Volt Labs', 'volt-labs'],
  ['Harbor Co', 'harbor-co'],
  ['Nimbus', 'nimbus'],
  ['Cedar & Co', 'cedar-co'],
  ['PixelForge', 'pixelforge'],
  ['AquaForm', 'aquaform'],
];

type CategorySeed = [name: string, slug: string, parentSlug: string | null];

const CATEGORIES: CategorySeed[] = [
  ['Apparel', 'apparel', null],
  ['Electronics', 'electronics', null],
  ['Home', 'home', null],
  ['T-Shirts', 't-shirts', 'apparel'],
  ['Outerwear', 'outerwear', 'apparel'],
  ['Footwear', 'footwear', 'apparel'],
  ['Audio', 'audio', 'electronics'],
  ['Accessories', 'accessories', 'electronics'],
  ['Kitchen', 'kitchen', 'home'],
  ['Desk', 'desk', 'home'],
];

export async function seedCatalog(queryRunner: QueryRunner) {
  console.log('\n→ Catalog');

  // Brands
  if ((await countRows(queryRunner, 'brands')) === 0) {
    await insertBatch(
      queryRunner,
      'brands',
      ['id', 'name', 'slug', 'description', 'is_active'],
      BRANDS.map(([name, slug]) => [
        uuid(),
        name,
        slug,
        `${name} official brand`,
        true,
      ]),
    );
    console.log(`  brands: ${BRANDS.length}`);
  }

  // Categories (two-pass for parents)
  if ((await countRows(queryRunner, 'categories')) === 0) {
    const idBySlug = new Map<string, string>();
    const roots = CATEGORIES.filter(
      (category): category is [string, string, null] => category[2] === null,
    );
    const children = CATEGORIES.filter(
      (category): category is [string, string, string] => category[2] !== null,
    );

    for (const [name, slug] of roots) {
      const id = uuid();
      idBySlug.set(slug, id);
      await insertBatch(
        queryRunner,
        'categories',
        ['id', 'parent_id', 'name', 'slug', 'path'],
        [[id, null, name, slug, slug]],
      );
    }

    for (const [name, slug, parentSlug] of children) {
      const id = uuid();
      const parentId = idBySlug.get(parentSlug);
      if (!parentId) {
        throw new Error(`Missing parent category for slug: ${parentSlug}`);
      }
      idBySlug.set(slug, id);
      await insertBatch(
        queryRunner,
        'categories',
        ['id', 'parent_id', 'name', 'slug', 'path'],
        [[id, parentId, name, slug, `${parentSlug}/${slug}`]],
      );
    }
    console.log(`  categories: ${CATEGORIES.length}`);
  }

  const brandRows: Array<{ id: string }> = await queryRunner.query(
    `SELECT id FROM brands`,
  );
  const categoryRows: Array<{ id: string }> = await queryRunner.query(
    `SELECT id FROM categories WHERE parent_id IS NOT NULL`,
  );
  const leafCategories =
    categoryRows.length > 0
      ? categoryRows
      : await queryRunner.query(`SELECT id FROM categories`);

  const currentProducts = await countRows(queryRunner, 'products');
  const toInsert = neededCount(
    seedConfig.products,
    currentProducts,
    seedConfig.incremental,
  );

  if (toInsert === 0) {
    console.log(`  Skipping products (have ${currentProducts.toLocaleString()})`);
    return;
  }

  let inserted = 0;
  const batchSize = Math.min(seedConfig.batchSize, 200);

  while (inserted < toInsert) {
    const size = Math.min(batchSize, toInsert - inserted);
    const productRows: unknown[][] = [];
    const variantRows: unknown[][] = [];
    const productCategoryRows: unknown[][] = [];
    const imageRows: unknown[][] = [];

    for (let i = 0; i < size; i++) {
      const globalIndex = currentProducts + inserted + i + 1;
      const productId = uuid();
      const name = randomProductName(globalIndex);
      const brand = brandRows[Math.floor(Math.random() * brandRows.length)];
      const category =
        leafCategories[Math.floor(Math.random() * leafCategories.length)];

      productRows.push([
        productId,
        brand.id,
        name,
        `${slugify(name)}-${globalIndex}`,
        `High quality ${name} for everyday use.`,
        'active',
      ]);

      productCategoryRows.push([productId, category.id]);

      const variantCount = seedConfig.variantsPerProduct;
      for (let v = 0; v < variantCount; v++) {
        const attrs = randomVariantAttrs();
        const price = randomIntBetween(999, 19999);
        const cost = Math.round(price * (0.35 + Math.random() * 0.25));
        const variantId = uuid();

        variantRows.push([
          variantId,
          productId,
          `SKU-${globalIndex}-${v + 1}`,
          `${attrs.color} / ${attrs.size}`,
          JSON.stringify(attrs),
          price,
          Math.round(price * 1.2),
          cost,
          randomIntBetween(100, 2500),
          true,
        ]);

        if (v === 0) {
          imageRows.push([
            uuid(),
            productId,
            variantId,
            `https://picsum.photos/seed/${globalIndex}/600/600`,
            0,
            name,
          ]);
        }
      }
    }

    await insertBatch(
      queryRunner,
      'products',
      ['id', 'brand_id', 'name', 'slug', 'description', 'status'],
      productRows,
    );
    await insertBatch(
      queryRunner,
      'product_categories',
      ['product_id', 'category_id'],
      productCategoryRows,
    );
    await insertBatch(
      queryRunner,
      'product_variants',
      [
        'id',
        'product_id',
        'sku',
        'name',
        'attributes',
        'price_cents',
        'compare_at_price_cents',
        'cost_cents',
        'weight_grams',
        'is_active',
      ],
      variantRows,
    );
    await insertBatch(
      queryRunner,
      'product_images',
      ['id', 'product_id', 'variant_id', 'url', 'position', 'alt_text'],
      imageRows,
    );

    inserted += size;
    logProgress('products', inserted, toInsert);
  }
}
