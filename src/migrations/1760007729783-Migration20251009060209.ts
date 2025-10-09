import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration202510090602091760007729783
  implements MigrationInterface
{
  name = 'Migration202510090602091760007729783';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "oauth_providers" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "oauth_providers"`,
    );
  }
}
