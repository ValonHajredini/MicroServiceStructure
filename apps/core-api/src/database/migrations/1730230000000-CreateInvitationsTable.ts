import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInvitationsTable1730230000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create invitations table
    await queryRunner.query(`
      CREATE TABLE invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        invited_by_user_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on token for fast lookup
    await queryRunner.query(`
      CREATE INDEX idx_invitations_token ON invitations(token)
    `);

    // Create index on tenant_id for tenant-scoped queries
    await queryRunner.query(`
      CREATE INDEX idx_invitations_tenant_id ON invitations(tenant_id)
    `);

    // Create index on email for lookup
    await queryRunner.query(`
      CREATE INDEX idx_invitations_email ON invitations(email)
    `);

    // Create index on status for filtering
    await queryRunner.query(`
      CREATE INDEX idx_invitations_status ON invitations(status)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invitations_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invitations_email`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invitations_tenant_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_invitations_token`);
    await queryRunner.query(`DROP TABLE IF EXISTS invitations`);
  }
}
