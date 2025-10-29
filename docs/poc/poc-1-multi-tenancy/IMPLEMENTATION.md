# POC #1: Complete Implementation Guide

This document contains all source code files needed for POC #1.

---

## File Structure

```
poc-1-multi-tenancy/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── entities/
│   │   └── note.entity.ts
│   ├── middleware/
│   │   └── tenant-context.middleware.ts
│   └── notes/
│       ├── notes.module.ts
│       ├── notes.controller.ts
│       ├── notes.service.ts
│       └── dto/
│           └── create-note.dto.ts
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

---

## Source Code Files

### 1. src/main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation pipes globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 POC #1 Multi-Tenancy is running on: http://localhost:${port}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET  http://localhost:${port}/notes`);
  console.log(`   POST http://localhost:${port}/notes`);
  console.log(`   GET  http://localhost:${port}/notes/:id`);
  console.log(`\n⚠️  Remember to include 'x-tenant-id' header in all requests!`);
}

bootstrap();
```

### 2. src/app.module.ts

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesModule } from './notes/notes.module';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { Note } from './entities/note.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      username: process.env.DATABASE_USER || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'poc_db',
      entities: [Note],
      synchronize: true, // Only for POC! Don't use in production
      logging: true, // See SQL queries in console
    }),
    NotesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
```

### 3. src/entities/note.entity.ts

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // CRITICAL: Every table must have tenant_id
  @Column('uuid')
  tenant_id: string;

  @Column({ length: 500 })
  title: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### 4. src/middleware/tenant-context.middleware.ts

```typescript
import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from header
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant ID is required. Please include x-tenant-id header.',
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException(
        'Invalid tenant ID format. Must be a valid UUID.',
      );
    }

    // Attach tenant ID to request object
    (req as any).tenantId = tenantId;

    console.log(`[Tenant Context] Request from tenant: ${tenantId}`);

    next();
  }
}
```

### 5. src/notes/dto/create-note.dto.ts

```typescript
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
```

### 6. src/notes/notes.service.ts

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Note } from '../entities/note.entity';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note)
    private notesRepository: Repository<Note>,
  ) {}

  /**
   * Find all notes for a specific tenant
   * CRITICAL: Always filter by tenant_id
   */
  async findAll(tenantId: string): Promise<Note[]> {
    const notes = await this.notesRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });

    console.log(`[Notes Service] Found ${notes.length} notes for tenant ${tenantId}`);
    return notes;
  }

  /**
   * Create a new note for a specific tenant
   * CRITICAL: Always set tenant_id
   */
  async create(createNoteDto: CreateNoteDto, tenantId: string): Promise<Note> {
    const note = this.notesRepository.create({
      ...createNoteDto,
      tenant_id: tenantId, // Inject tenant ID automatically
    });

    const savedNote = await this.notesRepository.save(note);
    console.log(`[Notes Service] Created note ${savedNote.id} for tenant ${tenantId}`);
    return savedNote;
  }

  /**
   * Find a specific note by ID for a tenant
   * CRITICAL: Always filter by both id AND tenant_id
   */
  async findOne(id: string, tenantId: string): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: {
        id,
        tenant_id: tenantId, // This prevents cross-tenant access
      },
    });

    if (!note) {
      console.log(`[Notes Service] Note ${id} not found for tenant ${tenantId}`);
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    console.log(`[Notes Service] Found note ${id} for tenant ${tenantId}`);
    return note;
  }

  /**
   * Delete a note (soft delete in production, hard delete for POC)
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const note = await this.findOne(id, tenantId); // Reuse findOne for tenant check
    await this.notesRepository.remove(note);
    console.log(`[Notes Service] Deleted note ${id} for tenant ${tenantId}`);
  }
}
```

### 7. src/notes/notes.controller.ts

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { Note } from '../entities/note.entity';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async findAll(@Req() req: any): Promise<Note[]> {
    // Extract tenant from middleware
    const tenantId = req.tenantId;
    return this.notesService.findAll(tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createNoteDto: CreateNoteDto,
    @Req() req: any,
  ): Promise<Note> {
    const tenantId = req.tenantId;
    return this.notesService.create(createNoteDto, tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Note> {
    const tenantId = req.tenantId;
    return this.notesService.findOne(id, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    const tenantId = req.tenantId;
    return this.notesService.remove(id, tenantId);
  }
}
```

### 8. src/notes/notes.module.ts

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { Note } from '../entities/note.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Note])],
  controllers: [NotesController],
  providers: [NotesService],
})
export class NotesModule {}
```

### 9. tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
```

---

## Step-by-Step Implementation

### Phase 1: Project Setup (15 minutes)

```bash
# 1. Start PostgreSQL
cd /Applications/MAMP/htdocs/Projects/MicroServiceStructure/docs/poc
docker-compose -f docker-compose.poc.yml up -d

# 2. Create POC project
cd poc-1-multi-tenancy
nest new . --skip-git --package-manager npm

# 3. Install dependencies
npm install @nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer

# 4. Copy .env
cp .env.example .env
```

### Phase 2: Create Files (20 minutes)

Create all files listed above in the correct directories:
- `src/main.ts`
- `src/app.module.ts`
- `src/entities/note.entity.ts`
- `src/middleware/tenant-context.middleware.ts`
- `src/notes/dto/create-note.dto.ts`
- `src/notes/notes.service.ts`
- `src/notes/notes.controller.ts`
- `src/notes/notes.module.ts`

### Phase 3: Run & Test (10 minutes)

```bash
# Start application
npm run start:dev

# In another terminal, run tests
chmod +x test-api.sh
./test-api.sh
```

---

## Expected Output

When running `npm run start:dev`:

```
🚀 POC #1 Multi-Tenancy is running on: http://localhost:3000
📊 Available endpoints:
   GET  http://localhost:3000/notes
   POST http://localhost:3000/notes
   GET  http://localhost:3000/notes/:id

⚠️  Remember to include 'x-tenant-id' header in all requests!
```

When creating a note:

```
[Tenant Context] Request from tenant: 11111111-1111-1111-1111-111111111111
[Notes Service] Created note abc-123-uuid for tenant 11111111-1111-1111-1111-111111111111
```

When fetching notes:

```
[Tenant Context] Request from tenant: 11111111-1111-1111-1111-111111111111
query: SELECT * FROM "notes" WHERE "tenant_id" = $1 ORDER BY "created_at" DESC
[Notes Service] Found 3 notes for tenant 11111111-1111-1111-1111-111111111111
```

---

## Key Learnings

### ✅ What Works Well

1. **Middleware Pattern**: Extracting tenant from headers works cleanly
2. **TypeORM Filtering**: `where: { tenant_id: tenantId }` is simple and effective
3. **Service Layer**: Passing `tenantId` to all service methods enforces tenant scoping
4. **Validation**: UUID validation in middleware catches errors early

### ⚠️ Important Patterns

1. **Always filter by tenant_id**: Every query MUST include `tenant_id` in WHERE clause
2. **Inject tenant automatically**: Service layer adds `tenant_id` when creating entities
3. **Middleware is mandatory**: Apply to ALL routes without exception
4. **Logging**: Log tenant context for debugging and audit trails

### 🔄 Improvements for Production

1. **JWT instead of headers**: Extract tenant from JWT token (POC #2)
2. **Custom decorator**: Create `@CurrentTenant()` decorator
3. **Global query scope**: Consider TypeORM interceptor for automatic filtering
4. **Comprehensive tests**: Unit + integration tests for tenant isolation
5. **Error handling**: Standardized error responses

---

## Next Steps

After completing POC #1:

1. ✅ Run automated tests (`./test-api.sh`)
2. ✅ Verify all test cases pass
3. ✅ Document any issues or discoveries
4. 📝 Review with team (30-minute meeting)
5. ➡️ Proceed to POC #2 (JWT SSO)

---

## Troubleshooting Common Issues

### Issue: "Cannot connect to database"

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.poc.yml ps

# Check logs
docker-compose -f docker-compose.poc.yml logs postgres-poc

# Restart if needed
docker-compose -f docker-compose.poc.yml restart
```

### Issue: "Column tenant_id does not exist"

```bash
# TypeORM synchronize should create it automatically
# If not, check app.module.ts has synchronize: true

# Manually create table if needed:
docker exec -it postgres-poc psql -U postgres -d poc_db

CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    title VARCHAR(500),
    content TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Issue: "Validation failed"

Check that request body matches CreateNoteDto:
```json
{
  "title": "Required string, max 500 chars",
  "content": "Required string"
}
```

---

**POC #1 Implementation Complete!** 🎉

This POC proves that shared-schema multi-tenancy with `tenant_id` filtering works effectively. The pattern is ready to be applied to the Core Service in Week 3.
