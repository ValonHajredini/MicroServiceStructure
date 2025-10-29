import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for POC client access
  app.enableCors({
    origin: '*', // For POC only - restrict in production
    credentials: true,
  });

  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`POC Resource Service running on http://localhost:${port}`);
}
bootstrap();
