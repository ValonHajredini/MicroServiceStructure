import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply tenant context middleware globally so tenantId is available in request scope
  const tenantMiddleware = app.get(TenantContextMiddleware);
  app.use(tenantMiddleware.use.bind(tenantMiddleware));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3003;
  await app.listen(port);
  Logger.log(`Kanban API listening on port ${port}`, "Bootstrap");
}

bootstrap().catch((error) => {
  Logger.error("Failed to bootstrap Kanban API", error);
  process.exit(1);
});
