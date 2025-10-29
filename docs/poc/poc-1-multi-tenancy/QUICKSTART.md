# POC #1 Quick Start Guide

Get the multi-tenancy POC running in 10 minutes.

---

## Prerequisites

- Node.js 18+ installed
- Docker Desktop running
- Terminal/Command Line

---

## Step-by-Step Setup

### 1. Start PostgreSQL (from project root)

```bash
# Navigate to POC directory
cd docs/poc

# Start PostgreSQL container
docker-compose -f docker-compose.poc.yml up -d

# Wait 10 seconds for database to initialize
sleep 10

# Verify database is running
docker-compose -f docker-compose.poc.yml ps
```

Expected output:
```
NAME                IMAGE           STATUS
postgres-poc        postgres:14     Up
```

### 2. Set Up POC #1 Project

```bash
# Navigate to POC #1 directory
cd poc-1-multi-tenancy

# Install NestJS CLI globally (if not already installed)
npm install -g @nestjs/cli

# Create NestJS project
nest new . --skip-git --package-manager npm

# Install additional dependencies
npm install @nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# .env file should contain:
# DATABASE_HOST=localhost
# DATABASE_PORT=5432
# DATABASE_USER=postgres
# DATABASE_PASSWORD=postgres
# DATABASE_NAME=poc_db
```

### 4. Create Project Structure

```bash
# Create directories
mkdir -p src/entities
mkdir -p src/middleware
mkdir -p src/notes/dto

# You'll create these files in the next step
```

### 5. Create Source Files

**Create these files with the content from the README:**

1. `src/entities/note.entity.ts` - Note entity with tenant_id
2. `src/middleware/tenant-context.middleware.ts` - Tenant extraction
3. `src/notes/notes.module.ts` - Notes module
4. `src/notes/notes.controller.ts` - Notes controller
5. `src/notes/notes.service.ts` - Notes service with tenant filtering
6. `src/notes/dto/create-note.dto.ts` - DTO for creating notes

**Update app.module.ts:**
```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesModule } from './notes/notes.module';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // Only for POC! Don't use in production
    }),
    NotesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*');
  }
}
```

### 6. Run the Application

```bash
# Start in development mode
npm run start:dev
```

Expected output:
```
[Nest] Application successfully started
[Nest] Mapped {/notes, GET} route
[Nest] Mapped {/notes, POST} route
[Nest] Mapped {/notes/:id, GET} route
[Nest] Nest application successfully started +3ms
```

### 7. Test the POC

**Option A: Manual Testing with curl**

```bash
# Create note for Tenant A
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 11111111-1111-1111-1111-111111111111" \
  -d '{"title": "Test Note", "content": "Hello from Tenant A"}'

# Get notes for Tenant A
curl http://localhost:3000/notes \
  -H "x-tenant-id: 11111111-1111-1111-1111-111111111111"
```

**Option B: Automated Test Script**

```bash
# Make script executable
chmod +x test-api.sh

# Run all tests
./test-api.sh
```

---

## Success Checklist

- [ ] PostgreSQL container is running
- [ ] POC #1 application starts without errors
- [ ] Can create notes for Tenant A
- [ ] Can create notes for Tenant B
- [ ] Tenant A only sees Tenant A's notes
- [ ] Tenant B only sees Tenant B's notes
- [ ] Cross-tenant access returns 404
- [ ] Missing tenant header returns 400

---

## Troubleshooting

### "Connection refused" to PostgreSQL

```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.poc.yml ps

# If not running, start it
docker-compose -f docker-compose.poc.yml up -d

# Check logs
docker-compose -f docker-compose.poc.yml logs postgres-poc
```

### Port 3000 already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run start:dev
```

### TypeORM errors

```bash
# Verify database connection
docker exec -it postgres-poc psql -U postgres -d poc_db -c "SELECT * FROM tenants;"

# Should show two test tenants
```

---

## Next Steps

After successful testing:
1. ✅ Document learnings in `docs/poc/poc-1-learnings.md`
2. Review with team (30-minute meeting)
3. Proceed to POC #2 (JWT SSO)
4. Apply patterns to Core Service (Week 3)

---

## Quick Reference

**Tenant IDs:**
- Tenant A: `11111111-1111-1111-1111-111111111111`
- Tenant B: `22222222-2222-2222-2222-222222222222`

**API Endpoints:**
- GET `/notes` - List notes (tenant-scoped)
- POST `/notes` - Create note
- GET `/notes/:id` - Get specific note (tenant-scoped)

**Required Header:**
- `x-tenant-id: <tenant-uuid>`
