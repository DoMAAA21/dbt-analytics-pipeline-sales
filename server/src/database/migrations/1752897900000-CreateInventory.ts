import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateInventory1752897900000 implements MigrationInterface {
  name = 'CreateInventory1752897900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'warehouses',
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
          { name: 'city', type: 'varchar', isNullable: false },
          {
            name: 'country_code',
            type: 'char',
            length: '2',
            isNullable: false,
          },
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
        name: 'inventory_levels',
        columns: [
          { name: 'warehouse_id', type: 'uuid', isPrimary: true },
          { name: 'variant_id', type: 'uuid', isPrimary: true },
          {
            name: 'quantity_on_hand',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'quantity_reserved',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'reorder_point',
            type: 'int',
            default: 0,
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
            columnNames: ['warehouse_id'],
            referencedTableName: 'warehouses',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['variant_id'],
            referencedTableName: 'product_variants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        indices: [
          {
            name: 'IDX_inventory_levels_on_hand',
            columnNames: ['quantity_on_hand'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'email', type: 'varchar', isNullable: true },
          { name: 'phone', type: 'varchar', isNullable: true },
          {
            name: 'country_code',
            type: 'char',
            length: '2',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'purchase_orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'supplier_id', type: 'uuid', isNullable: false },
          { name: 'warehouse_id', type: 'uuid', isNullable: false },
          {
            name: 'status',
            type: 'varchar',
            default: "'draft'",
            isNullable: false,
          },
          { name: 'ordered_at', type: 'timestamptz', isNullable: true },
          { name: 'received_at', type: 'timestamptz', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
            isNullable: false,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['supplier_id'],
            referencedTableName: 'suppliers',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['warehouse_id'],
            referencedTableName: 'warehouses',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'purchase_order_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'purchase_order_id', type: 'uuid', isNullable: false },
          { name: 'variant_id', type: 'uuid', isNullable: false },
          { name: 'quantity_ordered', type: 'int', isNullable: false },
          {
            name: 'quantity_received',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          { name: 'unit_cost_cents', type: 'int', isNullable: false },
        ],
        foreignKeys: [
          {
            columnNames: ['purchase_order_id'],
            referencedTableName: 'purchase_orders',
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('purchase_order_items', true);
    await queryRunner.dropTable('purchase_orders', true);
    await queryRunner.dropTable('suppliers', true);
    await queryRunner.dropTable('inventory_levels', true);
    await queryRunner.dropTable('warehouses', true);
  }
}
