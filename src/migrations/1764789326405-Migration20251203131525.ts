import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration202512031315251764789326405 implements MigrationInterface {
    name = 'Migration202512031315251764789326405'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content" DROP CONSTRAINT "FK_4f85d3a39d0e76744e8866ec41c"`);
        await queryRunner.query(`DROP INDEX "public"."idx_content_user_pagination"`);
        await queryRunner.query(`DROP INDEX "public"."idx_content_user_title_pagination"`);
        await queryRunner.query(`CREATE TABLE "content_folders" ("contentId" uuid NOT NULL, "folderId" uuid NOT NULL, CONSTRAINT "PK_2ddce82d47b8933b9db2510afe8" PRIMARY KEY ("contentId", "folderId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_681acc133ddcb2846a11b0997b" ON "content_folders" ("contentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fea4d7e8d4ae754d23755cd545" ON "content_folders" ("folderId") `);
        await queryRunner.query(`ALTER TABLE "content" DROP COLUMN "folder_id"`);
        await queryRunner.query(`ALTER TABLE "content_folders" ADD CONSTRAINT "FK_681acc133ddcb2846a11b0997bb" FOREIGN KEY ("contentId") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "content_folders" ADD CONSTRAINT "FK_fea4d7e8d4ae754d23755cd5453" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE INDEX "idx_content_user_pagination" ON "content" ("user_id", "created_at" DESC, "id" DESC)`);
        await queryRunner.query(`CREATE INDEX "idx_content_user_title_pagination" ON "content" ("user_id", LOWER("title"), "created_at" DESC, "id" DESC)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_content_user_title_pagination"`);
        await queryRunner.query(`DROP INDEX "public"."idx_content_user_pagination"`);
        await queryRunner.query(`ALTER TABLE "content_folders" DROP CONSTRAINT "FK_fea4d7e8d4ae754d23755cd5453"`);
        await queryRunner.query(`ALTER TABLE "content_folders" DROP CONSTRAINT "FK_681acc133ddcb2846a11b0997bb"`);
        await queryRunner.query(`ALTER TABLE "content" ADD "folder_id" uuid`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fea4d7e8d4ae754d23755cd545"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_681acc133ddcb2846a11b0997b"`);
        await queryRunner.query(`DROP TABLE "content_folders"`);
        await queryRunner.query(`CREATE INDEX "idx_content_user_title_pagination" ON "content" ("user_id", LOWER("title"), "created_at" DESC, "id" DESC)`);
        await queryRunner.query(`CREATE INDEX "idx_content_user_pagination" ON "content" ("user_id", "created_at" DESC, "id" DESC)`);
        await queryRunner.query(`ALTER TABLE "content" ADD CONSTRAINT "FK_4f85d3a39d0e76744e8866ec41c" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
