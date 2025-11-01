import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config();

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations', '*{.ts,.js}')],
  synchronize: false, // Never use true in production - use migrations
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: false, // Run migrations manually
};

// DataSource for TypeORM CLI
const dataSource = new DataSource(typeOrmConfig);

export default dataSource;
