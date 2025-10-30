import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateFileMetadataTable1730300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create file_metadata table
    await queryRunner.createTable(
      new Table({
        name: 'file_metadata',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'uploaded_by_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'mime_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'storage_key',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'storage_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'service',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'file_metadata',
      new TableIndex({
        name: 'idx_file_metadata_tenant_id',
        columnNames: ['tenant_id'],
      }),
    );

    await queryRunner.createIndex(
      'file_metadata',
      new TableIndex({
        name: 'idx_file_metadata_uploaded_by',
        columnNames: ['uploaded_by_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'file_metadata',
      new TableIndex({
        name: 'idx_file_metadata_service',
        columnNames: ['service'],
      }),
    );

    await queryRunner.createIndex(
      'file_metadata',
      new TableIndex({
        name: 'idx_file_metadata_status',
        columnNames: ['status'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'file_metadata',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'file_metadata',
      new TableForeignKey({
        columnNames: ['uploaded_by_user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('file_metadata');
    if (!table) {
      return;
    }

    const tenantForeignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('tenant_id') !== -1,
    );
    const userForeignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('uploaded_by_user_id') !== -1,
    );

    if (tenantForeignKey) {
      await queryRunner.dropForeignKey('file_metadata', tenantForeignKey);
    }
    if (userForeignKey) {
      await queryRunner.dropForeignKey('file_metadata', userForeignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('file_metadata', 'idx_file_metadata_tenant_id');
    await queryRunner.dropIndex(
      'file_metadata',
      'idx_file_metadata_uploaded_by',
    );
    await queryRunner.dropIndex('file_metadata', 'idx_file_metadata_service');
    await queryRunner.dropIndex('file_metadata', 'idx_file_metadata_status');

    // Drop table
    await queryRunner.dropTable('file_metadata');
  }
}
