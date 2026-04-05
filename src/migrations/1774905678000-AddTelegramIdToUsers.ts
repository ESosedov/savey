import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramIdToUsers1774905678000 implements MigrationInterface {
  name = 'AddTelegramIdToUsers1774905678000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "telegram_id" bigint`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_users_telegram_id" UNIQUE ("telegram_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_users_telegram_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "telegram_id"`,
    );
  }
}
