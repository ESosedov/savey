import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration202601031958251767491905882 implements MigrationInterface {
    name = 'Migration202601031958251767491905882'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verification_token" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verification_token_expiry" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verification_token_expiry"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verification_token"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified"`);
    }

}
