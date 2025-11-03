import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusColumns1738560100000 implements MigrationInterface {
  name = "AddStatusColumns1738560100000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add status column to columns table if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "columns"
      ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'
    `);

    // Create index for columns status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_columns_status" ON "columns" ("status")`,
    );

    // Add status column to tasks table if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'
    `);

    // Create index for tasks status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" ("status")`,
    );

    // Add status column to task_comments table if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "task_comments"
      ADD COLUMN IF NOT EXISTS "status" character varying(20) NOT NULL DEFAULT 'active'
    `);

    // Create index for task_comments status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_comments_status" ON "task_comments" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_task_comments_status"');
    await queryRunner.query('ALTER TABLE "task_comments" DROP COLUMN IF EXISTS "status"');

    await queryRunner.query('DROP INDEX IF EXISTS "idx_tasks_status"');
    await queryRunner.query('ALTER TABLE "tasks" DROP COLUMN IF EXISTS "status"');

    await queryRunner.query('DROP INDEX IF EXISTS "idx_columns_status"');
    await queryRunner.query('ALTER TABLE "columns" DROP COLUMN IF EXISTS "status"');
  }
}
