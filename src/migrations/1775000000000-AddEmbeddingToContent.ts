import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmbeddingToContent1775000000000 implements MigrationInterface {
  name = 'AddEmbeddingToContent1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(
      `ALTER TABLE "content" ADD COLUMN "embedding" vector(3072)`,
    );
    // Index not created: pgvector limits HNSW/IVFFlat to 2000 dims, our embeddings are 3072
    // Future: upgrade to pgvector 0.7+ and use halfvec index
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No index to drop
    await queryRunner.query(
      `ALTER TABLE "content" DROP COLUMN "embedding"`,
    );
  }
}