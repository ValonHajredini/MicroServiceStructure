import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJoinRequestsTable1730240000000
  implements MigrationInterface
{
  name = 'CreateJoinRequestsTable1730240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create join_requests table
    await queryRunner.query(`
      CREATE TABLE join_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'pending',
        message TEXT,
        admin_response TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create unique index for pending requests (prevent duplicate pending requests)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_join_requests_unique_pending
      ON join_requests(tenant_id, user_id)
      WHERE status = 'pending'
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX idx_join_requests_tenant_id ON join_requests(tenant_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_join_requests_user_id ON join_requests(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_join_requests_status ON join_requests(status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_join_requests_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_join_requests_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_join_requests_tenant_id`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_join_requests_unique_pending`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS join_requests`);
  }
}
