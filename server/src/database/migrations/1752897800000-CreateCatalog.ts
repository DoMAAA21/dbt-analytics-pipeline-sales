import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCatalog1752897800000 implements MigrationInterface {
  name = 'CreateCatalog1752897800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'name', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'slug', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'parent_id', type: 'uuid', isNullable: true },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'slug', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'path', type: 'varchar', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['parent_id'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'brand_id', type: 'uuid', isNullable: true },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'slug', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'description', type: 'text', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            default: "'draft'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['brand_id'],
            referencedTableName: 'brands',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          { name: 'IDX_products_brand_id', columnNames: ['brand_id'] },
          { name: 'IDX_products_status', columnNames: ['status'] },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'product_categories',
        columns: [
          { name: 'product_id', type: 'uuid', isPrimary: true },
          { name: 'category_id', type: 'uuid', isPrimary: true },
        ],
        foreignKeys: [
          {
            columnNames: ['product_id'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['category_id'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'product_variants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'product_id', type: 'uuid', isNullable: false },
          { name: 'sku', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          {
            name: 'attributes',
            type: 'jsonb',
            default: "'{}'",
            isNullable: false,
          },
          { name: 'price_cents', type: 'int', isNullable: false },
          { name: 'compare_at_price_cents', type: 'int', isNullable: true },
          { name: 'cost_cents', type: 'int', isNullable: true },
          { name: 'weight_grams', type: 'int', isNullable: true },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['product_id'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_product_variants_product_id',
            columnNames: ['product_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'product_images',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'product_id', type: 'uuid', isNullable: false },
          { name: 'variant_id', type: 'uuid', isNullable: true },
          { name: 'url', type: 'varchar', isNullable: false },
          { name: 'position', type: 'int', default: 0, isNullable: false },
          { name: 'alt_text', type: 'varchar', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['product_id'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['variant_id'],
            referencedTableName: 'product_variants',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'wishlist_items',
        columns: [
          { name: 'customer_id', type: 'uuid', isPrimary: true },
          { name: 'product_id', type: 'uuid', isPrimary: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['product_id'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wishlist_items', true);
    await queryRunner.dropTable('product_images', true);
    await queryRunner.dropTable('product_variants', true);
    await queryRunner.dropTable('product_categories', true);
    await queryRunner.dropTable('products', true);
    await queryRunner.dropTable('categories', true);
    await queryRunner.dropTable('brands', true);
  }
}
