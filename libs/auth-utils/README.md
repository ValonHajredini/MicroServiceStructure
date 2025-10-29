# @microservice/auth-utils

Authentication and tenant scoping utilities for multi-tenant microservices built with NestJS and TypeORM.

## Overview

This library provides production-ready utilities for implementing secure multi-tenant data isolation using:
- **AsyncLocalStorage** for request-scoped tenant context
- **TenantScopedRepository** for automatic query filtering
- **Middleware** for tenant extraction from headers/JWT
- **Decorators** for easy tenant access in controllers

## Installation

This library is part of the monorepo workspace. To use it in your service:

```json
// package.json dependencies
{
  "dependencies": {
    "@microservice/auth-utils": "workspace:*"
  }
}
```

Then run:
```bash
npm install
```

## Quick Start

### 1. Import TenantContextModule

Add the global module to your AppModule:

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TenantContextModule, TenantContextMiddleware } from '@microservice/auth-utils';

@Module({
  imports: [
    TenantContextModule, // Import globally
    TypeOrmModule.forRoot({...}),
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant middleware to all routes
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
```

### 2. Add tenant_id to Your Entities

Every entity must have a `tenant_id` column:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('notes')
@Index('idx_notes_tenant_id', ['tenant_id']) // Important for performance
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string; // REQUIRED on all entities

  @Column()
  title: string;

  @Column('text', { nullable: true })
  content: string;
}
```

### 3. Use TenantScopedRepository in Services

Replace standard TypeORM repositories with TenantScopedRepository:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantScopedRepository, TenantContextService } from '@microservice/auth-utils';
import { Note } from './note.entity';

@Injectable()
export class NotesService {
  private readonly notesRepository: TenantScopedRepository<Note>;

  constructor(
    @InjectRepository(Note)
    private readonly baseRepository: Repository<Note>,
    private readonly tenantContext: TenantContextService,
  ) {
    // Wrap the base repository with TenantScopedRepository
    this.notesRepository = new TenantScopedRepository(
      tenantContext,
      baseRepository,
    );
  }

  async findAll(): Promise<Note[]> {
    // Automatically filtered by tenant_id
    return this.notesRepository.find();
  }

  async create(title: string, content: string): Promise<Note> {
    const note = this.baseRepository.create({ title, content } as any);
    // tenant_id automatically set on save
    return this.notesRepository.save(note);
  }

  async update(id: string, title: string): Promise<void> {
    // Only updates notes belonging to current tenant
    await this.notesRepository.update({ id } as any, { title });
  }

  async delete(id: string): Promise<void> {
    // Only deletes notes belonging to current tenant
    await this.notesRepository.delete({ id } as any);
  }
}
```

### 4. (Optional) Use @CurrentTenant Decorator in Controllers

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { CurrentTenant } from '@microservice/auth-utils';

@Controller('notes')
export class NotesController {
  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    console.log('Current tenant:', tenantId);
    return this.notesService.findAll();
  }
}
```

## How It Works

### Request Flow

```
HTTP Request with x-tenant-id header
  ↓
[TenantContextMiddleware]
  ├─ Extract tenant from header
  ├─ Set AsyncLocalStorage context
  ↓
[Controller]
  ↓
[Service] → [TenantScopedRepository]
  ├─ getTenant() from AsyncLocalStorage
  ├─ Inject WHERE tenant_id = ? into all queries
  ↓
[TypeORM] → [PostgreSQL]
```

### Security Guarantees

✅ **Automatic Filtering**: All `find()`, `findOne()`, `update()`, `delete()` operations automatically include `WHERE tenant_id = ?`

✅ **Automatic Injection**: All `save()` operations automatically set `tenant_id` field

✅ **Fail-Closed**: Missing tenant context throws error instead of returning all data

✅ **SQL Verified**: All queries logged with TypeORM show tenant_id filtering

## API Reference

### TenantContextModule

Global module providing TenantContextService singleton.

**Usage:**
```typescript
@Module({
  imports: [TenantContextModule],
})
export class AppModule {}
```

### TenantContextMiddleware

Middleware that extracts tenant from request and sets AsyncLocalStorage context.

**POC Implementation:** Extracts from `x-tenant-id` header

**Production:** Should extract from JWT token (`req.user.tenantId`)

**Usage:**
```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
```

### TenantScopedRepository

Custom TypeORM repository that automatically filters all queries by tenant_id.

**Constructor:**
```typescript
constructor(
  tenantContext: TenantContextService,
  repository: Repository<Entity>
)
```

**Methods:**
- `find(options?)` - Find all entities (tenant-filtered)
- `findOne(options)` - Find one entity (tenant-filtered)
- `findBy(where)` - Find by criteria (tenant-filtered)
- `findOneBy(where)` - Find one by criteria (tenant-filtered)
- `save(entity)` - Save with automatic tenant_id injection
- `update(criteria, partial)` - Update only current tenant's entities
- `delete(criteria)` - Delete only current tenant's entities
- `remove(entity)` - Remove entity with tenant validation
- `count(options?)` - Count entities (tenant-filtered)

### TenantContextService

Service for managing request-scoped tenant context.

**Methods:**
- `run(tenantId, callback)` - Run callback with tenant context
- `getTenant()` - Get current tenant ID (throws if not set)
- `setTenant(tenantId)` - Set tenant context (for testing only)

### @CurrentTenant Decorator

Parameter decorator for extracting tenant ID in controllers.

**Usage:**
```typescript
@Get()
findAll(@CurrentTenant() tenantId: string) {
  // tenantId available here
}
```

## Production Recommendations

### 1. JWT Integration

Replace header-based extraction with JWT:

```typescript
// Custom middleware extending TenantContextMiddleware
@Injectable()
export class JwtTenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const user = req.user; // From @nestjs/passport JwtStrategy
    if (!user || !user.tenantId) {
      throw new UnauthorizedException('Invalid token');
    }
    this.tenantContext.run(user.tenantId, () => next());
  }
}
```

### 2. Database Constraints

Add NOT NULL constraint to tenant_id:

```sql
ALTER TABLE notes ALTER COLUMN tenant_id SET NOT NULL;

-- Optional: Foreign key to tenants table
ALTER TABLE notes
  ADD CONSTRAINT fk_notes_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);
```

### 3. Enable Query Logging (Development Only)

Verify tenant_id filtering in SQL logs:

```typescript
// typeorm.config.ts (development)
{
  logging: ['query', 'error'],
  logger: 'advanced-console',
}
```

### 4. Code Review Enforcement

Ensure all database access uses TenantScopedRepository:

- ❌ NEVER use raw SQL: `dataSource.query()`
- ❌ NEVER use base Repository directly
- ✅ ALWAYS use TenantScopedRepository

## Known Limitations

### 1. Raw SQL Queries

Raw queries bypass automatic filtering:

```typescript
// ❌ UNSAFE
await dataSource.query('SELECT * FROM notes WHERE id = $1', [id]);

// ✅ Use TenantScopedRepository instead
await notesRepository.findOne({ where: { id } });
```

### 2. QueryBuilder Without Repository

Direct QueryBuilder bypasses filtering:

```typescript
// ❌ UNSAFE
await dataSource.createQueryBuilder(Note, 'note')
  .where('note.id = :id', { id })
  .getOne();

// ✅ SAFE - manually add tenant filter
await repository.createQueryBuilder('note')
  .where('note.id = :id AND note.tenant_id = :tenantId', {
    id,
    tenantId: tenantContext.getTenant(),
  })
  .getOne();
```

## Testing

Example test setup:

```typescript
describe('Tenant Isolation', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should only return tenant-specific data', async () => {
    await request(app.getHttpServer())
      .get('/notes')
      .set('x-tenant-id', 'tenant-a-uuid')
      .expect(200)
      .then(response => {
        response.body.forEach(note => {
          expect(note.tenant_id).toBe('tenant-a-uuid');
        });
      });
  });
});
```

## Validation

This library has been validated with comprehensive security tests:

- ✅ Cross-tenant read prevention (findAll, findOne)
- ✅ Cross-tenant update prevention
- ✅ Cross-tenant delete prevention
- ✅ Automatic tenant_id injection on INSERT
- ✅ SQL query verification with TypeORM logging
- ✅ Fail-closed behavior (missing context throws error)
- ✅ Bulk operations maintain tenant isolation

See `docs/pocs/tenant-scoping-pattern.md` for complete validation report.

## References

- **POC Documentation**: `docs/pocs/tenant-scoping-pattern.md`
- **Story**: `docs/stories/1.3.story.md`
- **ADR-001**: Shared-Schema Multi-Tenancy
- **ADR-005**: TypeORM for Multi-Tenancy

## License

MIT
