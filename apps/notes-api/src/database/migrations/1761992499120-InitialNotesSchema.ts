import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialNotesSchema1761992499120 implements MigrationInterface {
    name = 'InitialNotesSchema1761992499120'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "user_id" uuid NOT NULL, "name" character varying(255) NOT NULL, "parent_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8578bd31b0e7f6d6c2480dbbca8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_folders_parent_id" ON "folders" ("parent_id") `);
        await queryRunner.query(`CREATE INDEX "idx_folders_user_id" ON "folders" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_folders_tenant_id" ON "folders" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "note_id" uuid NOT NULL, "file_id" uuid NOT NULL, "deleted_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_attachments_file_id" ON "attachments" ("file_id") `);
        await queryRunner.query(`CREATE INDEX "idx_attachments_note_id" ON "attachments" ("note_id") `);
        await queryRunner.query(`CREATE INDEX "idx_attachments_tenant_id" ON "attachments" ("tenant_id") `);
        await queryRunner.query(`CREATE TABLE "notes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" uuid NOT NULL, "user_id" uuid NOT NULL, "title" character varying(500), "content" text, "folder_id" uuid, "is_pinned" boolean NOT NULL DEFAULT false, "deleted_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_af6206538ea96c4e77e9f400c3d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_notes_deleted_at" ON "notes" ("deleted_at") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_is_pinned" ON "notes" ("is_pinned") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_folder_id" ON "notes" ("folder_id") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_user_id" ON "notes" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_tenant_id" ON "notes" ("tenant_id") `);
        await queryRunner.query(`CREATE INDEX "idx_notes_title_content_fts" ON "notes" USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')))`);
        await queryRunner.query(`ALTER TABLE "folders" ADD CONSTRAINT "FK_938a930768697b6ece215667d8e" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "attachments" ADD CONSTRAINT "FK_ed5d063daa36e150057dcc7f318" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notes" ADD CONSTRAINT "FK_8aa719f42b3c8b23c2d29f799c0" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notes" DROP CONSTRAINT "FK_8aa719f42b3c8b23c2d29f799c0"`);
        await queryRunner.query(`ALTER TABLE "attachments" DROP CONSTRAINT "FK_ed5d063daa36e150057dcc7f318"`);
        await queryRunner.query(`ALTER TABLE "folders" DROP CONSTRAINT "FK_938a930768697b6ece215667d8e"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_title_content_fts"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_tenant_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_folder_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_is_pinned"`);
        await queryRunner.query(`DROP INDEX "public"."idx_notes_deleted_at"`);
        await queryRunner.query(`DROP TABLE "notes"`);
        await queryRunner.query(`DROP INDEX "public"."idx_attachments_tenant_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_attachments_note_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_attachments_file_id"`);
        await queryRunner.query(`DROP TABLE "attachments"`);
        await queryRunner.query(`DROP INDEX "public"."idx_folders_tenant_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_folders_user_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_folders_parent_id"`);
        await queryRunner.query(`DROP TABLE "folders"`);
    }

}
