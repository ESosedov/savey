import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration202511040618081762258688650
  implements MigrationInterface
{
  name = 'Migration202511040618081762258688650';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "folders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "is_public" boolean NOT NULL DEFAULT false, "user_id" uuid NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_folder_title_user" UNIQUE ("title", "user_id"), CONSTRAINT "PK_8578bd31b0e7f6d6c2480dbbca8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "password_hash" character varying NOT NULL, "oauth_providers" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "content" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "url" character varying, "domain" character varying, "user_id" uuid NOT NULL, "folder_id" uuid, "favicon" text, "site_name" text, "image" jsonb, "description" text, "type" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a2083913f3647b44f205204e36" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "folders" ADD CONSTRAINT "FK_71af7633de585b66b4db26734c9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD CONSTRAINT "FK_23b0aa9f011580a4737f3a96d6d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD CONSTRAINT "FK_4f85d3a39d0e76744e8866ec41c" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`
            CREATE INDEX "idx_content_user_pagination" 
            ON "content" ("user_id", "created_at" DESC, "id" DESC)
        `);

    await queryRunner.query(`
      CREATE INDEX "idx_content_user_title_pagination"
        ON "content" ("user_id", LOWER("title"), "created_at" DESC, "id" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "content" DROP CONSTRAINT "FK_4f85d3a39d0e76744e8866ec41c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" DROP CONSTRAINT "FK_23b0aa9f011580a4737f3a96d6d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "folders" DROP CONSTRAINT "FK_71af7633de585b66b4db26734c9"`,
    );
    await queryRunner.query(`DROP TABLE "content"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "folders"`);
    await queryRunner.query(`DROP INDEX "idx_content_user_title_pagination"`);
    await queryRunner.query(`DROP INDEX "idx_content_user_pagination"`);
  }
}
