# POC #1: TypeORM Multi-Tenancy Pattern

**Duration:** Week 1 (5 days)
**Goal:** Prove that shared-schema with `tenant_id` filtering works correctly

---

## Objectives

1. ✅ Implement automatic tenant filtering in TypeORM
2. ✅ Create middleware to extract tenant from request context
3. ✅ Test cross-tenant data isolation
4. ✅ Document pattern for Core Service implementation

---

## Architecture

```
┌─────────────────────────────────────────┐
│         NestJS Application              │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  TenantContextMiddleware         │  │
│  │  - Extract tenant from header    │  │
│  │  - Set req.tenantId              │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│  ┌──────────────▼───────────────────┐  │
│  │  NotesController                 │  │
│  │  - GET /notes                    │  │
│  │  - POST /notes                   │  │
│  │  - GET /notes/:id                │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│  ┌──────────────▼───────────────────┐  │
│  │  NotesService                    │  │
│  │  - findAll(tenantId)             │  │
│  │  - create(note, tenantId)        │  │
│  │  - findOne(id, tenantId)         │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│  ┌──────────────▼───────────────────┐  │
│  │  TypeORM Repository              │  │
│  │  - find({ tenant_id: tenantId }) │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
└─────────────────┼───────────────────────┘
                  │
         ┌────────▼────────┐
         │   PostgreSQL    │
         │   poc_db        │
         │                 │
         │  ┌───────────┐  │
         │  │   notes   │  │
         │  │ tenant_id │  │
         │  └───────────┘  │
         └─────────────────┘
```

---

## Implementation Steps

### Step 1: Project Setup

```bash
# Create NestJS project
nest new poc-1-multi-tenancy

cd poc-1-multi-tenancy

# Install dependencies
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/config class-validator class-transformer
```

### Step 2: Database Configuration

Create `.env` file:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=poc_db
```

### Step 3: Create Entities

**Note Entity with tenant_id:**
```typescript
// src/entities/note.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  created_at: Date;
}
```

### Step 4: Tenant Context Middleware

```typescript
// src/middleware/tenant-context.middleware.ts
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract tenant ID from header
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required (x-tenant-id header)');
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException('Invalid tenant ID format');
    }

    // Attach tenant ID to request
    (req as any).tenantId = tenantId;

    next();
  }
}
```

### Step 5: Notes Service with Tenant Filtering

```typescript
// src/notes/notes.service.ts
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

  // ALWAYS filter by tenant_id
  async findAll(tenantId: string): Promise<Note[]> {
    return this.notesRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async create(createNoteDto: CreateNoteDto, tenantId: string): Promise<Note> {
    const note = this.notesRepository.create({
      ...createNoteDto,
      tenant_id: tenantId,
    });
    return this.notesRepository.save(note);
  }

  async findOne(id: string, tenantId: string): Promise<Note> {
    const note = await this.notesRepository.findOne({
      where: {
        id,
        tenant_id: tenantId, // Critical: filter by tenant
      },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }

    return note;
  }
}
```

### Step 6: Notes Controller

```typescript
// src/notes/notes.controller.ts
import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  findAll(@Req() req: any) {
    // Extract tenant from middleware
    const tenantId = req.tenantId;
    return this.notesService.findAll(tenantId);
  }

  @Post()
  create(@Body() createNoteDto: CreateNoteDto, @Req() req: any) {
    const tenantId = req.tenantId;
    return this.notesService.create(createNoteDto, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.tenantId;
    return this.notesService.findOne(id, tenantId);
  }
}
```

---

## Testing Plan

### Test 1: Tenant Isolation

**Scenario:** Create notes for two different tenants, verify isolation

```bash
# Create note for Tenant A
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 11111111-1111-1111-1111-111111111111" \
  -d '{"title": "Tenant A Note", "content": "This belongs to Tenant A"}'

# Create note for Tenant B
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 22222222-2222-2222-2222-222222222222" \
  -d '{"title": "Tenant B Note", "content": "This belongs to Tenant B"}'

# Get notes for Tenant A (should only see Tenant A's note)
curl http://localhost:3000/notes \
  -H "x-tenant-id: 11111111-1111-1111-1111-111111111111"

# Get notes for Tenant B (should only see Tenant B's note)
curl http://localhost:3000/notes \
  -H "x-tenant-id: 22222222-2222-2222-2222-222222222222"
```

**Expected Results:**
- ✅ Tenant A sees only "Tenant A Note"
- ✅ Tenant B sees only "Tenant B Note"
- ✅ No cross-tenant data visible

### Test 2: Cross-Tenant Access Prevention

**Scenario:** Try to access Tenant A's note using Tenant B's context

```bash
# 1. Create note for Tenant A, capture note ID
NOTE_ID=$(curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 11111111-1111-1111-1111-111111111111" \
  -d '{"title": "Secret Note", "content": "Only for Tenant A"}' \
  | jq -r '.id')

# 2. Try to access that note as Tenant B (should fail)
curl http://localhost:3000/notes/$NOTE_ID \
  -H "x-tenant-id: 22222222-2222-2222-2222-222222222222"
```

**Expected Results:**
- ✅ Returns 404 Not Found
- ✅ Error message: "Note with ID <id> not found"
- ✅ Tenant B cannot access Tenant A's note

### Test 3: Missing Tenant Context

**Scenario:** Call API without tenant ID header

```bash
# Try to get notes without tenant header
curl http://localhost:3000/notes
```

**Expected Results:**
- ✅ Returns 400 Bad Request
- ✅ Error message: "Tenant ID is required (x-tenant-id header)"

---

## Success Criteria Checklist

- [ ] Project compiles and runs without errors
- [ ] Database connection works
- [ ] Notes table has `tenant_id` column
- [ ] Middleware extracts tenant from header
- [ ] Create note includes `tenant_id` automatically
- [ ] Query notes filters by `tenant_id`
- [ ] Tenant A cannot see Tenant B's notes
- [ ] Tenant B cannot access Tenant A's notes by ID
- [ ] Missing tenant header returns proper error
- [ ] Pattern documented for team

---

## Learnings to Document

After completing this POC, document:

1. **What worked well:**
   - Middleware pattern for tenant extraction
   - TypeORM filtering approach
   - Testing methodology

2. **What was challenging:**
   - Edge cases discovered
   - Performance considerations
   - Error handling patterns

3. **Patterns to apply in Core Service:**
   - Exact middleware implementation
   - Service layer filtering approach
   - Controller request handling

4. **Improvements for production:**
   - JWT-based tenant extraction (vs header)
   - Custom decorators (@CurrentTenant())
   - Global query interceptor
   - Comprehensive test suite

---

## Next Steps

After POC #1 completion:
1. Document learnings in `docs/poc/poc-1-learnings.md`
2. Review with team
3. Proceed to POC #2 (JWT SSO)
4. Apply patterns to Core Service (Week 3+)
