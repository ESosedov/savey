import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentIndexes1756838780633 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(`DROP INDEX "idx_content_user_title_pagination"`);
    await queryRunner.query(`DROP INDEX "idx_content_user_pagination"`);
  }
}
