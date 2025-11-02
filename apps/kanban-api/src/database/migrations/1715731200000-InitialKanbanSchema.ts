import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialKanbanSchema1715731200000 implements MigrationInterface {
  name = "InitialKanbanSchema1715731200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "boards" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "owner_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_boards_tenant_id" ON "boards" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_boards_owner_id" ON "boards" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_boards_status" ON "boards" ("status")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "columns" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "board_id" uuid NOT NULL REFERENCES "boards"("id") ON DELETE CASCADE,
        "title" character varying(255) NOT NULL,
        "position" integer NOT NULL,
        "wip_limit" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_columns_tenant_id" ON "columns" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_columns_board_id" ON "columns" ("board_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_columns_board_position" ON "columns" ("board_id", "position")`,
    );

    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "task_priority_enum" AS ENUM ('high', 'medium', 'low')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "column_id" uuid NOT NULL REFERENCES "columns"("id") ON DELETE CASCADE,
        "board_id" uuid NOT NULL,
        "title" character varying(500) NOT NULL,
        "description" text,
        "assigned_to" uuid,
        "priority" "task_priority_enum" NOT NULL DEFAULT 'medium',
        "due_date" TIMESTAMP WITH TIME ZONE,
        "position" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_tenant_id" ON "tasks" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_column_id" ON "tasks" ("column_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_board_id" ON "tasks" ("board_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_to" ON "tasks" ("assigned_to")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_column_position" ON "tasks" ("column_id", "position")`,
    );

    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD CONSTRAINT "FK_tasks_board" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_comments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_comments_tenant_id" ON "task_comments" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_comments_task_id" ON "task_comments" ("task_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_comments_user_id" ON "task_comments" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_task_comments_user_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_task_comments_task_id"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_task_comments_tenant_id"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "task_comments"');

    await queryRunner.query(
      'ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "FK_tasks_board"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "idx_tasks_column_position"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_tasks_assigned_to"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_tasks_board_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_tasks_column_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_tasks_tenant_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "tasks"');
    await queryRunner.query('DROP TYPE IF EXISTS "task_priority_enum"');

    await queryRunner.query(
      'DROP INDEX IF EXISTS "idx_columns_board_position"',
    );
    await queryRunner.query('DROP INDEX IF EXISTS "idx_columns_board_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_columns_tenant_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "columns"');

    await queryRunner.query('DROP INDEX IF EXISTS "idx_boards_status"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_boards_owner_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_boards_tenant_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "boards"');
  }
}
