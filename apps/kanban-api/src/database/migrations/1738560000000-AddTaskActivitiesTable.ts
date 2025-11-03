import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTaskActivitiesTable1738560000000 implements MigrationInterface {
  name = "AddTaskActivitiesTable1738560000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create task action type enum
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "task_action_type_enum" AS ENUM ('created', 'assigned', 'moved', 'completed', 'updated')
    `);

    // Create task_activities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_activities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL,
        "action_type" "task_action_type_enum" NOT NULL,
        "old_value" text,
        "new_value" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_activities_tenant_id" ON "task_activities" ("tenant_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_activities_task_id" ON "task_activities" ("task_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_task_activities_created_at" ON "task_activities" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "idx_task_activities_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_task_activities_task_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "idx_task_activities_tenant_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "task_activities"');
    await queryRunner.query('DROP TYPE IF EXISTS "task_action_type_enum"');
  }
}
