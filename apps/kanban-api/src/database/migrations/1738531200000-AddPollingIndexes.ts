import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPollingIndexes1738531200000 implements MigrationInterface {
  name = "AddPollingIndexes1738531200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add composite indexes for polling query optimization
    // These indexes support queries filtering by board_id and ordering by created_at/updated_at

    // Index on tasks table for efficient polling queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_board_id_created_at"
      ON "tasks" ("board_id", "created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_board_id_updated_at"
      ON "tasks" ("board_id", "updated_at");
    `);

    // Index on columns table for efficient polling queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_columns_board_id_created_at"
      ON "columns" ("board_id", "created_at");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_columns_board_id_updated_at"
      ON "columns" ("board_id", "updated_at");
    `);

    // Index on task_comments table for efficient polling queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_comments_task_id_created_at"
      ON "task_comments" ("task_id", "created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes in reverse order
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_task_comments_task_id_created_at";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_columns_board_id_updated_at";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_columns_board_id_created_at";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_tasks_board_id_updated_at";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_tasks_board_id_created_at";
    `);
  }
}
