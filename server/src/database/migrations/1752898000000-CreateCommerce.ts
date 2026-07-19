import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCommerce1752898000000 implements MigrationInterface {
  name = 'CreateCommerce1752898000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'code', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'shipping_methods',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'code', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'base_rate_cents', type: 'int', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'carts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'customer_id', type: 'uuid', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'currency_code',
            type: 'char',
            length: '3',
            default: "'USD'",
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
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          { name: 'IDX_carts_customer_id', columnNames: ['customer_id'] },
          { name: 'IDX_carts_status', columnNames: ['status'] },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'cart_id', type: 'uuid', isNullable: false },
          { name: 'variant_id', type: 'uuid', isNullable: false },
          { name: 'quantity', type: 'int', isNullable: false },
          { name: 'unit_price_cents', type: 'int', isNullable: false },
        ],
        uniques: [
          {
            name: 'UQ_cart_items_cart_variant',
            columnNames: ['cart_id', 'variant_id'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['cart_id'],
            referencedTableName: 'carts',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['variant_id'],
            referencedTableName: 'product_variants',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'order_number',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          { name: 'customer_id', type: 'uuid', isNullable: false },
          { name: 'cart_id', type: 'uuid', isNullable: true, isUnique: true },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'currency_code',
            type: 'char',
            length: '3',
            default: "'USD'",
            isNullable: false,
          },
          { name: 'subtotal_cents', type: 'int', isNullable: false },
          {
            name: 'discount_cents',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'shipping_cents',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          { name: 'tax_cents', type: 'int', default: 0, isNullable: false },
          { name: 'total_cents', type: 'int', isNullable: false },
          { name: 'shipping_address_id', type: 'uuid', isNullable: true },
          { name: 'billing_address_id', type: 'uuid', isNullable: true },
          { name: 'placed_at', type: 'timestamptz', isNullable: false },
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
            columnNames: ['customer_id'],
            referencedTableName: 'customers',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['cart_id'],
            referencedTableName: 'carts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['shipping_address_id'],
            referencedTableName: 'customer_addresses',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['billing_address_id'],
            referencedTableName: 'customer_addresses',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          { name: 'IDX_orders_customer_id', columnNames: ['customer_id'] },
          { name: 'IDX_orders_placed_at', columnNames: ['placed_at'] },
          { name: 'IDX_orders_status', columnNames: ['status'] },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'order_id', type: 'uuid', isNullable: false },
          { name: 'variant_id', type: 'uuid', isNullable: false },
          {
            name: 'product_name_snapshot',
            type: 'varchar',
            isNullable: false,
          },
          { name: 'sku_snapshot', type: 'varchar', isNullable: false },
          { name: 'quantity', type: 'int', isNullable: false },
          { name: 'unit_price_cents', type: 'int', isNullable: false },
          {
            name: 'discount_cents',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          { name: 'tax_cents', type: 'int', default: 0, isNullable: false },
          { name: 'line_total_cents', type: 'int', isNullable: false },
        ],
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['variant_id'],
            referencedTableName: 'product_variants',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
        indices: [
          { name: 'IDX_order_items_order_id', columnNames: ['order_id'] },
          { name: 'IDX_order_items_variant_id', columnNames: ['variant_id'] },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_status_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'order_id', type: 'uuid', isNullable: false },
          { name: 'from_status', type: 'varchar', isNullable: true },
          { name: 'to_status', type: 'varchar', isNullable: false },
          {
            name: 'changed_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
          { name: 'changed_by', type: 'varchar', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_order_status_history_order_id',
            columnNames: ['order_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'payments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'order_id', type: 'uuid', isNullable: false },
          { name: 'payment_method_id', type: 'uuid', isNullable: false },
          { name: 'amount_cents', type: 'int', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
            isNullable: false,
          },
          { name: 'provider_ref', type: 'varchar', isNullable: true },
          { name: 'paid_at', type: 'timestamptz', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['payment_method_id'],
            referencedTableName: 'payment_methods',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
        indices: [
          { name: 'IDX_payments_order_id', columnNames: ['order_id'] },
          { name: 'IDX_payments_status', columnNames: ['status'] },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'shipments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'order_id', type: 'uuid', isNullable: false },
          { name: 'shipping_method_id', type: 'uuid', isNullable: false },
          { name: 'warehouse_id', type: 'uuid', isNullable: true },
          { name: 'tracking_number', type: 'varchar', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            default: "'pending'",
            isNullable: false,
          },
          { name: 'shipped_at', type: 'timestamptz', isNullable: true },
          { name: 'delivered_at', type: 'timestamptz', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['shipping_method_id'],
            referencedTableName: 'shipping_methods',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['warehouse_id'],
            referencedTableName: 'warehouses',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        indices: [
          { name: 'IDX_shipments_order_id', columnNames: ['order_id'] },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'shipment_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'shipment_id', type: 'uuid', isNullable: false },
          { name: 'order_item_id', type: 'uuid', isNullable: false },
          { name: 'quantity', type: 'int', isNullable: false },
        ],
        foreignKeys: [
          {
            columnNames: ['shipment_id'],
            referencedTableName: 'shipments',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('shipment_items', true);
    await queryRunner.dropTable('shipments', true);
    await queryRunner.dropTable('payments', true);
    await queryRunner.dropTable('order_status_history', true);
    await queryRunner.dropTable('order_items', true);
    await queryRunner.dropTable('orders', true);
    await queryRunner.dropTable('cart_items', true);
    await queryRunner.dropTable('carts', true);
    await queryRunner.dropTable('shipping_methods', true);
    await queryRunner.dropTable('payment_methods', true);
  }
}
