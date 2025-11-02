import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS - support comma-separated origins
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200,http://localhost:4201')
    .split(',')
    .map(origin => origin.trim());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Set global API prefix for versioning
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Notes API')
    .setDescription('Multi-tenant microservice - Notes, Folders & Attachments')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Notes API running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  // Surface bootstrap failures clearly in logs
  console.error('Failed to start notes-api service', error);
  process.exit(1);
});
