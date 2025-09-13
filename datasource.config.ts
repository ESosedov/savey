import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required`);
  }

  return value;
}

export default new DataSource({
  type: 'postgres',
  host: requireEnv('DB_HOST'),
  port: parseInt(requireEnv('DB_PORT')),
  username: requireEnv('DB_USERNAME'),
  password: requireEnv('DB_PASSWORD'),
  database: requireEnv('DB_DATABASE'),
  entities: ['src/**/entities/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
});
