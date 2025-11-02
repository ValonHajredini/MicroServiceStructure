import { config } from "dotenv";
import { join } from "path";
import { DataSource, DataSourceOptions } from "typeorm";

config({ path: ".env" });

const isDevelopment = process.env.NODE_ENV === "development";

export const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  url: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL
    ? undefined
    : (process.env.DB_HOST ?? "localhost"),
  port: process.env.DATABASE_URL
    ? undefined
    : Number(process.env.DB_PORT ?? 5432),
  username: process.env.DATABASE_URL
    ? undefined
    : (process.env.DB_USER ?? "postgres"),
  password: process.env.DATABASE_URL
    ? undefined
    : (process.env.DB_PASSWORD ?? "postgres"),
  database: process.env.DATABASE_URL
    ? undefined
    : (process.env.DB_NAME ?? "kanban_db"),
  entities: [join(__dirname, "..", "**", "*.entity{.ts,.js}")],
  migrations: [join(__dirname, "migrations", "*{.ts,.js}")],
  synchronize: false,
  logging: isDevelopment,
  migrationsRun: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
