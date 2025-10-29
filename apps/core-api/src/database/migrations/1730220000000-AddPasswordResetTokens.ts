import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetTokens1730220000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create password_reset_tokens table
    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create index on token_hash for fast lookups
    await queryRunner.query(`
      CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token_hash)
    `);

    // Create index on user_id
    await queryRunner.query(`
      CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)
    `);

    // Create index on expires_at for cleanup queries
    await queryRunner.query(`
      CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_password_reset_tokens_expires`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_password_reset_tokens_user_id`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_password_reset_tokens_token`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens`);
  }
}
