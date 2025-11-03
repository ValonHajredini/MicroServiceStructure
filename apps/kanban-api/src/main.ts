import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { TenantContextMiddleware } from "./common/middleware/tenant-context.middleware";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend (kanban-ui on port 4202)
  app.enableCors({
    origin: ['http://localhost:4200', 'http://localhost:4201', 'http://localhost:4202'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Apply tenant context middleware globally so tenantId is available in request scope
  const tenantMiddleware = app.get(TenantContextMiddleware);
  app.use(tenantMiddleware.use.bind(tenantMiddleware));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Apply global transform interceptor for standard response format
  app.useGlobalInterceptors(new TransformInterceptor());

  // Apply global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle("Kanban API")
    .setDescription(
      "The Kanban Board API provides endpoints for managing boards, columns, tasks, and comments in a multi-tenant environment. All endpoints require JWT authentication with tenant context.",
    )
    .setVersion("1.0")
    .addTag("boards", "Board management endpoints")
    .addTag("columns", "Column management endpoints")
    .addTag("tasks", "Task management endpoints")
    .addTag("comments", "Task comment endpoints")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token from login",
        in: "header",
      },
      "JWT-auth",
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "Kanban API Documentation",
    customfavIcon: "https://nestjs.com/img/logo_text.svg",
    customCss: ".swagger-ui .topbar { display: none }",
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3003;
  await app.listen(port);
  Logger.log(`Kanban API listening on port ${port}`, "Bootstrap");
  Logger.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
    "Bootstrap",
  );
}

bootstrap().catch((error) => {
  Logger.error("Failed to bootstrap Kanban API", error);
  process.exit(1);
});
