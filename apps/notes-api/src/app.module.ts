import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { NotesModule } from './notes/notes.module';
import { FoldersModule } from './folders/folders.module';
import { FilesModule } from './files/files.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute in milliseconds
        limit: 10, // 10 requests per minute (default for most endpoints)
      },
    ]),
    DatabaseModule,
    AuthModule,
    NotesModule,
    FoldersModule,
    FilesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply request ID middleware first for audit trail
    consumer.apply(RequestIdMiddleware).forRoutes('*');
    // Then apply tenant context middleware
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
