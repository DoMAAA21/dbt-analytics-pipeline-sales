import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePromotions1752898100000 implements MigrationInterface {
  name = 'CreatePromotions1752898100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'coupons',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'code', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'discount_type', type: 'varchar', isNullable: false },
          { name: 'discount_value', type: 'int', isNullable: false },
          { name: 'min_order_cents', type: 'int', isNullable: true },
          { name: 'max_redemptions', type: 'int', isNullable: true },
          { name: 'starts_at', type: 'timestamptz', isNullable: true },
          { name: 'ends_at', type: 'timestamptz', isNullable: true },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'coupon_redemptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'coupon_id', type: 'uuid', isNullable: false },
          { name: 'order_id', type: 'uuid', isUnique: true, isNullable: false },
          { name: 'customer_id', type: 'uuid', isNullable: false },
          { name: 'discount_cents', type: 'int', isNullable: false },
          {
            name: 'redeemed_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['coupon_id'],
            referencedTableName: 'coupons',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('coupon_redemptions', true);
    await queryRunner.dropTable('coupons', true);
  }
}
