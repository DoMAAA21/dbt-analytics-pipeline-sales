import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateReturnsAndReviews1752898200000
  implements MigrationInterface
{
  name = 'CreateReturnsAndReviews1752898200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'returns',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'order_id', type: 'uuid', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            default: "'requested'",
            isNullable: false,
          },
          { name: 'reason', type: 'varchar', isNullable: true },
          {
            name: 'requested_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          { name: 'resolved_at', type: 'timestamptz', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [{ name: 'IDX_returns_order_id', columnNames: ['order_id'] }],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'return_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'return_id', type: 'uuid', isNullable: false },
          { name: 'order_item_id', type: 'uuid', isNullable: false },
          { name: 'quantity', type: 'int', isNullable: false },
          { name: 'condition', type: 'varchar', isNullable: false },
        ],
        foreignKeys: [
          {
            columnNames: ['return_id'],
            referencedTableName: 'returns',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['order_item_id'],
            referencedTableName: 'order_items',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'refunds',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'return_id', type: 'uuid', isNullable: true },
          { name: 'payment_id', type: 'uuid', isNullable: false },
          { name: 'amount_cents', type: 'int', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
            isNullable: false,
          },
          { name: 'refunded_at', type: 'timestamptz', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['return_id'],
            referencedTableName: 'returns',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['payment_id'],
            referencedTableName: 'payments',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'product_reviews',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'product_id', type: 'uuid', isNullable: false },
          { name: 'customer_id', type: 'uuid', isNullable: false },
          { name: 'order_id', type: 'uuid', isNullable: true },
          { name: 'rating', type: 'smallint', isNullable: false },
          { name: 'title', type: 'text', isNullable: true },
          { name: 'body', type: 'text', isNullable: true },
          {
            name: 'is_verified_purchase',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_at',
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
          {
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          {
            name: 'IDX_product_reviews_product_id',
            columnNames: ['product_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      ALTER TABLE product_reviews
      ADD CONSTRAINT CHK_product_reviews_rating
      CHECK (rating BETWEEN 1 AND 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_reviews
      DROP CONSTRAINT IF EXISTS CHK_product_reviews_rating
    `);
    await queryRunner.dropTable('product_reviews', true);
    await queryRunner.dropTable('refunds', true);
    await queryRunner.dropTable('return_items', true);
    await queryRunner.dropTable('returns', true);
  }
}
