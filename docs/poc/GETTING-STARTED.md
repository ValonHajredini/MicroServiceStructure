# Getting Started with POC Phase

**Welcome to Week 1-2!** This guide will get you started with the POC phase.

---

## Prerequisites Checklist

Before starting, verify you have:

- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **npm 9+** installed (`npm --version`)
- [ ] **Docker Desktop** installed and running
- [ ] **Git** installed
- [ ] **VSCode** (or preferred IDE) installed
- [ ] **Terminal** access (Terminal on Mac, PowerShell/WST on Windows)
- [ ] **Postman or curl** for API testing (optional but helpful)

---

## Quick Start: Get Running in 15 Minutes

### Step 1: Navigate to Project

```bash
cd /Applications/MAMP/htdocs/Projects/MicroServiceStructure
```

### Step 2: Start PostgreSQL

```bash
# Navigate to POC directory
cd docs/poc

# Start PostgreSQL container
docker-compose -f docker-compose.poc.yml up -d

# Wait 10 seconds for initialization
sleep 10

# Verify it's running
docker-compose -f docker-compose.poc.yml ps
```

Expected output:
```
NAME              IMAGE           STATUS
postgres-poc      postgres:14     Up
```

### Step 3: Install Global Tools

```bash
# Install NestJS CLI
npm install -g @nestjs/cli

# Install Angular CLI
npm install -g @angular/cli

# Verify installations
nest --version
ng version
```

### Step 4: Set Up POC #1

```bash
# Navigate to POC #1 directory
cd poc-1-multi-tenancy

# Create NestJS project
nest new . --skip-git --package-manager npm

# When prompted for package manager, choose: npm

# Install dependencies
npm install @nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer
```

### Step 5: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# The .env file should look like this:
```

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=poc_db
PORT=3000
NODE_ENV=development
```

### Step 6: Create Source Files

Follow the **IMPLEMENTATION.md** guide to create all source files:

**Required files (in order):**
1. `src/entities/note.entity.ts`
2. `src/middleware/tenant-context.middleware.ts`
3. `src/notes/dto/create-note.dto.ts`
4. `src/notes/notes.service.ts`
5. `src/notes/notes.controller.ts`
6. `src/notes/notes.module.ts`
7. `src/app.module.ts` (update existing)
8. `src/main.ts` (update existing)

**Tip:** Use VSCode's multi-cursor feature to create files quickly!

### Step 7: Run the Application

```bash
# Start in development mode
npm run start:dev
```

Expected output:
```
🚀 POC #1 Multi-Tenancy is running on: http://localhost:3000
📊 Available endpoints:
   GET  http://localhost:3000/notes
   POST http://localhost:3000/notes
   GET  http://localhost:3000/notes/:id

⚠️  Remember to include 'x-tenant-id' header in all requests!
```

### Step 8: Test the POC

**Quick Manual Test:**

```bash
# Open a new terminal window

# Create a note for Tenant A
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: 11111111-1111-1111-1111-111111111111" \
  -d '{"title": "My First Note", "content": "Hello from Tenant A!"}'

# Get notes for Tenant A
curl http://localhost:3000/notes \
  -H "x-tenant-id: 11111111-1111-1111-1111-111111111111"
```

Expected response:
```json
[
  {
    "id": "abc-123-...",
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "title": "My First Note",
    "content": "Hello from Tenant A!",
    "created_at": "2025-10-29T10:00:00.000Z",
    "updated_at": "2025-10-29T10:00:00.000Z"
  }
]
```

**Run Automated Tests:**

```bash
# Make test script executable
chmod +x test-api.sh

# Run all tests
./test-api.sh
```

---

## Understanding the POC Structure

### File Organization

```
docs/poc/
├── README.md                    # POC overview
├── POC-SUMMARY.md              # Week-by-week breakdown
├── GETTING-STARTED.md          # This file
├── docker-compose.poc.yml      # PostgreSQL setup
├── init-db.sql                 # Database initialization
│
├── poc-1-multi-tenancy/        # Week 1 POC
│   ├── README.md               # POC #1 overview
│   ├── QUICKSTART.md           # 10-minute setup guide
│   ├── IMPLEMENTATION.md       # Complete source code
│   ├── test-api.sh             # Automated tests
│   ├── .env.example            # Environment template
│   └── src/                    # Source code (create these)
│       ├── entities/
│       ├── middleware/
│       └── notes/
│
└── poc-2-jwt-sso/              # Week 2 POC (coming next)
    ├── auth-service/
    ├── resource-service/
    └── angular-client/
```

### Key Concepts

**POC #1: Multi-Tenancy**
- Every table has `tenant_id` column
- Middleware extracts tenant from request
- Service layer always filters by `tenant_id`
- **Goal:** Prove tenant isolation works

**POC #2: JWT SSO** (Week 2)
- Auth Service generates JWT tokens
- Resource Service validates JWT
- Angular stores and reuses token
- **Goal:** Prove single sign-on works

---

## Testing Workflow

### 1. Manual Testing with curl

```bash
# Set tenant IDs as variables for convenience
TENANT_A="11111111-1111-1111-1111-111111111111"
TENANT_B="22222222-2222-2222-2222-222222222222"

# Create note for Tenant A
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_A" \
  -d '{"title": "Tenant A Note", "content": "Secret data"}'

# Create note for Tenant B
curl -X POST http://localhost:3000/notes \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_B" \
  -d '{"title": "Tenant B Note", "content": "Different secret"}'

# Get Tenant A's notes (should only see Tenant A)
curl http://localhost:3000/notes -H "x-tenant-id: $TENANT_A"

# Get Tenant B's notes (should only see Tenant B)
curl http://localhost:3000/notes -H "x-tenant-id: $TENANT_B"
```

### 2. Testing with Postman

**Collection Setup:**

1. Create collection "POC #1 Multi-Tenancy"
2. Add environment variables:
   - `base_url`: `http://localhost:3000`
   - `tenant_a_id`: `11111111-1111-1111-1111-111111111111`
   - `tenant_b_id`: `22222222-2222-2222-2222-222222222222`

3. Create requests:
   - **Create Note (Tenant A)**
     - POST `{{base_url}}/notes`
     - Headers: `x-tenant-id: {{tenant_a_id}}`
     - Body: `{"title": "Test", "content": "Content"}`

   - **Get Notes (Tenant A)**
     - GET `{{base_url}}/notes`
     - Headers: `x-tenant-id: {{tenant_a_id}}`

### 3. Automated Testing Script

```bash
# Run full test suite
./test-api.sh

# Should output:
# ✓ Created notes for both tenants
# ✓ Tenant isolation working
# ✓ Cross-tenant access blocked
# ✓ Tenant context required
# ✅ All tests passed!
```

---

## Common Issues & Solutions

### Issue 1: PostgreSQL Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.poc.yml ps

# If not running, start it
docker-compose -f docker-compose.poc.yml up -d

# Check logs
docker-compose -f docker-compose.poc.yml logs postgres-poc
```

### Issue 2: Port 3000 Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

### Issue 3: Module Not Found

**Error:**
```
Error: Cannot find module '@nestjs/typeorm'
```

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: Database Table Not Created

**Error:**
```
Error: relation "notes" does not exist
```

**Solution:**
```bash
# Verify synchronize: true in app.module.ts
# Or manually create table:

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

---

## Development Tips

### VSCode Extensions (Recommended)

Install these for better development experience:

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Thunder Client** - API testing (Postman alternative)
- **PostgreSQL** - Database client
- **Docker** - Container management
- **NestJS Files** - File generators
- **TypeScript Hero** - Import management

### Keyboard Shortcuts

**Mac:**
- `Cmd+Shift+P` - Command palette
- `Cmd+P` - Quick file open
- `Cmd+B` - Toggle sidebar
- `Cmd+J` - Toggle terminal
- `Cmd+Shift+F` - Search in files

**Windows:**
- `Ctrl+Shift+P` - Command palette
- `Ctrl+P` - Quick file open
- `Ctrl+B` - Toggle sidebar
- `Ctrl+J` - Toggle terminal
- `Ctrl+Shift+F` - Search in files

### Useful Commands

```bash
# Watch logs in real-time
npm run start:dev | grep "Tenant Context"

# Check database directly
docker exec -it postgres-poc psql -U postgres -d poc_db
# Then run: SELECT * FROM notes;

# Format code
npm run format

# Run linter
npm run lint

# Restart Docker containers
docker-compose -f docker-compose.poc.yml restart
```

---

## Daily Checklist

### Before Starting Work

- [ ] PostgreSQL is running (`docker ps`)
- [ ] Latest code pulled (`git pull`)
- [ ] Dependencies installed (`npm install`)
- [ ] Environment variables set (`.env` exists)

### During Development

- [ ] Application runs without errors
- [ ] API endpoints respond correctly
- [ ] Database operations work
- [ ] Logs show expected behavior

### Before Ending Day

- [ ] Code committed to Git
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Notes on learnings captured

---

## Week 1 Schedule

### Monday: Setup & Entity Creation

**Morning (3-4 hours):**
- Set up environment
- Create NestJS project
- Install dependencies
- Create Note entity

**Afternoon (3-4 hours):**
- Test database connection
- Verify entity creation
- Manual testing with psql

### Tuesday: Middleware & Service

**Morning:**
- Create TenantContextMiddleware
- Test tenant extraction

**Afternoon:**
- Implement NotesService
- Add tenant filtering logic

### Wednesday: Controller & Testing

**Morning:**
- Create NotesController
- Wire up endpoints

**Afternoon:**
- Manual testing with curl
- Test cross-tenant scenarios

### Thursday: Automation & Edge Cases

**Morning:**
- Write automated test script
- Test all scenarios

**Afternoon:**
- Fix any issues
- Test edge cases

### Friday: Documentation & Review

**Morning:**
- Document learnings
- Clean up code

**Afternoon:**
- Team review meeting
- Prepare for POC #2

---

## Success Criteria

Before moving to POC #2, verify:

- [ ] ✅ Application runs without errors
- [ ] ✅ Can create notes for Tenant A
- [ ] ✅ Can create notes for Tenant B
- [ ] ✅ Tenant A only sees Tenant A's notes
- [ ] ✅ Tenant B only sees Tenant B's notes
- [ ] ✅ Cross-tenant access returns 404
- [ ] ✅ Missing tenant header returns 400
- [ ] ✅ All automated tests pass
- [ ] ✅ Team understands the pattern
- [ ] ✅ Learnings documented

---

## Getting Help

### Documentation

- **POC Overview:** `README.md`
- **Quick Setup:** `QUICKSTART.md`
- **Complete Code:** `IMPLEMENTATION.md`
- **Week Plan:** `POC-SUMMARY.md`

### Resources

- **NestJS Docs:** https://docs.nestjs.com/
- **TypeORM Docs:** https://typeorm.io/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

### Team Communication

- Ask questions in team chat
- Share learnings in daily standup
- Pair/mob program when stuck
- Document solutions for team

---

## Next Steps

After completing POC #1:

1. ✅ Run `./test-api.sh` - all tests pass
2. ✅ Document learnings
3. 📅 Team review meeting (30 mins)
4. ➡️ Proceed to POC #2 (JWT SSO)

---

**You're ready to start! Begin with POC #1 and validate the multi-tenancy pattern.** 🚀

Good luck, and remember: **POCs are for learning, not for perfection!**
