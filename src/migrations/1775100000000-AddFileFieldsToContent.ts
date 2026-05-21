import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileFieldsToContent1775100000000 implements MigrationInterface {
  name = 'AddFileFieldsToContent1775100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "content_type" varchar DEFAULT 'link'`,
    );
    await queryRunner.query(
      `UPDATE "content" SET "content_type" = 'link' WHERE "content_type" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "file_key" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "file_size" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "mime_type" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "storage_used" bigint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "storage_used"`);
    await queryRunner.query(`ALTER TABLE "content" DROP COLUMN IF EXISTS "mime_type"`);
    await queryRunner.query(`ALTER TABLE "content" DROP COLUMN IF EXISTS "file_size"`);
    await queryRunner.query(`ALTER TABLE "content" DROP COLUMN IF EXISTS "file_key"`);
    await queryRunner.query(`ALTER TABLE "content" DROP COLUMN IF EXISTS "content_type"`);
  }
}
