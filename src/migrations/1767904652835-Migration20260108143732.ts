import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration202601081437321767904652835 implements MigrationInterface {
    name = 'Migration202601081437321767904652835'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL`);
    }

}
