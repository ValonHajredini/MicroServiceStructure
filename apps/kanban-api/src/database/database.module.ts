import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { join } from "path";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>("DATABASE_URL");
        return {
          type: "postgres",
          host: databaseUrl
            ? undefined
            : config.get<string>("DB_HOST", "localhost"),
          port: databaseUrl
            ? undefined
            : Number(config.get<string>("DB_PORT", "5432")),
          username: databaseUrl
            ? undefined
            : config.get<string>("DB_USER", "postgres"),
          password: databaseUrl
            ? undefined
            : config.get<string>("DB_PASSWORD", "postgres"),
          database: databaseUrl
            ? undefined
            : config.get<string>("DB_NAME", "kanban_db"),
          url: databaseUrl,
          entities: [join(__dirname, "..", "**", "*.entity{.ts,.js}")],
          migrations: [join(__dirname, "migrations", "*{.ts,.js}")],
          synchronize: false,
          logging: config.get<string>("NODE_ENV") === "development",
          migrationsRun: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
