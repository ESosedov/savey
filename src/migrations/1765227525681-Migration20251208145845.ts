import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration202512081458451765227525681 implements MigrationInterface {
    name = 'Migration202512081458451765227525681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "similar-content" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "url" character varying, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "content_id" uuid, CONSTRAINT "PK_33605d19f5b86f0ba8b374c872c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "similar-content" ADD CONSTRAINT "FK_3babae751c477ffeecfb8c6b876" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "similar-content" DROP CONSTRAINT "FK_3babae751c477ffeecfb8c6b876"`);
        await queryRunner.query(`DROP TABLE "similar-content"`);
    }

}
