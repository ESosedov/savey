import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { EmbeddingModule } from '../embedding/embedding.module';
import { EmbeddingService } from '../embedding/embedding.service';
import { Injectable } from '@nestjs/common';

@Injectable()
class ReindexService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async run(): Promise<void> {
    const rows: { id: string; title: string; description: string | null }[] =
      await this.dataSource.query(
        `SELECT id, title, description FROM content WHERE title IS NOT NULL AND title != url`,
      );

    console.log(`Found ${rows.length} records to reindex`);

    let success = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const embedding = await this.embeddingService.generateForContent(
          row.title,
          row.description,
        );
        const vectorStr = `[${embedding.join(',')}]`;
        await this.dataSource.query(
          `UPDATE content SET embedding = $1::vector WHERE id = $2`,
          [vectorStr, row.id],
        );
        console.log(`✓ ${row.title.slice(0, 60)}`);
        success++;
      } catch (err) {
        console.error(`✗ ${row.id}: ${err}`);
        skipped++;
      }
      // 1 request/sec — stays under free tier limit (100 RPM)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`\nDone: ${success} updated, ${skipped} failed`);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        namingStrategy: new SnakeNamingStrategy(),
      }),
      inject: [ConfigService],
    }),
    EmbeddingModule,
  ],
  providers: [ReindexService],
})
class ReindexModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ReindexModule, {
    logger: ['error', 'warn'],
  });

  const service = app.get(ReindexService);
  await service.run();
  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
