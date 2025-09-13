import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration202509122240181757706019080
  implements MigrationInterface
{
  name = 'Migration202509122240181757706019080';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "folders" ADD "description" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "folders" DROP COLUMN "description"`);
  }
}
