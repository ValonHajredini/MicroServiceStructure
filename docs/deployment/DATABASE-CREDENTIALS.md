# Database Configuration Reference

## Overview

This project follows a **database-per-service architecture** where each microservice has its own PostgreSQL database for data isolation, independent scaling, and fault tolerance.

**Current Status:**
- ✅ **Active:** 1 database (core_db)
- 📋 **Planned:** 3 additional databases (notes_db, kanban_db, admin_db)

---

## Currently Active Databases

### 1. Core Service Database (core_db)

**Status:** ✅ **ACTIVE** - Currently in use

**Purpose:** Handles authentication, user management, tenant management, and file metadata.

**Connection Details:**

```bash
# Docker Environment (Production-like)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/core_db

# Individual Components
DB_HOST=postgres                    # Container name (use 'localhost' for local)
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres                # ⚠️ CHANGE IN PRODUCTION
DB_DATABASE=core_db
```

**TypeORM Configuration:**
- Location: `apps/core-api/src/database/typeorm.config.ts`
- Entities: Auto-discovered from `**/*.entity{.ts,.js}`
- Migrations: `apps/core-api/src/database/migrations/`
- Synchronize: `false` (migrations only)
- Logging: Enabled in development

**Tables:**
- `tenants` - Tenant/organization management
- `users` - User accounts
- `user_tenant_roles` - User permissions per tenant
- `password_reset_tokens` - Password reset workflow
- `invitations` - User invitation system
- `join_requests` - User join request workflow
- `file_metadata` - File upload metadata

**Docker Configuration:**
```yaml
services:
  postgres:
    image: postgres:14-alpine
    container_name: core-db
    environment:
      POSTGRES_DB: core_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

**Health Check:**
```bash
# Test connection
docker exec core-db pg_isready -U postgres

# Connect via psql
docker exec -it core-db psql -U postgres -d core_db

# Run migrations
cd apps/core-api
npm run migration:run
```

---

## Planned Databases (Not Yet Implemented)

### 2. Notes Service Database (notes_db)

**Status:** 📋 **PLANNED** - Will be implemented in Epic 3

**Purpose:** Dedicated database for the Notes microservice to handle note-taking functionality.

**Planned Connection Details:**

```bash
# Expected Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres-notes:5432/notes_db

DB_HOST=postgres-notes
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres                # ⚠️ CHANGE IN PRODUCTION
DB_DATABASE=notes_db
```

**Planned Tables:**
- `notes` - Note content and metadata
- `folders` - Folder organization
- `attachments` - File attachments linked to notes

**Reference:** See `docs/architecture/database-architecture.md` (lines 101-161)

---

### 3. Kanban Service Database (kanban_db)

**Status:** 📋 **PLANNED** - Will be implemented in Epic 4

**Purpose:** Dedicated database for the Kanban task management microservice.

**Planned Connection Details:**

```bash
# Expected Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres-kanban:5432/kanban_db

DB_HOST=postgres-kanban
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres                # ⚠️ CHANGE IN PRODUCTION
DB_DATABASE=kanban_db
```

**Planned Tables:**
- `boards` - Kanban boards
- `columns` - Board columns/stages
- `todos` - Task cards
- `todo_comments` - Task comments and collaboration

**Reference:** See `docs/architecture/database-architecture.md` (lines 164-244)

---

### 4. Admin Service Database (admin_db)

**Status:** 📋 **PLANNED** - Future implementation

**Purpose:** Administrative dashboard and system monitoring.

**Planned Connection Details:**

```bash
# Expected Configuration (TBD)
DATABASE_URL=postgresql://postgres:postgres@postgres-admin:5432/admin_db

DB_HOST=postgres-admin
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres                # ⚠️ CHANGE IN PRODUCTION
DB_DATABASE=admin_db
```

**Reference:** See `docs/architecture/database-architecture.md` (line 12)

---

## Multi-Tenancy Pattern

All databases follow a **shared-schema multi-tenancy** pattern:

- Every table includes a `tenant_id` column (UUID)
- All queries are automatically scoped by `tenant_id`
- Data isolation enforced at the application level via JWT claims
- Middleware extracts `tenantId` from JWT and filters all database operations

**Example Entity:**
```typescript
@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;  // Automatically filtered by tenant context

  @Column()
  title: string;
  
  // ... other fields
}
```

---

## Security Considerations

### ⚠️ Production Security Checklist

- [ ] **Change default PostgreSQL password** (`postgres` is only for development)
- [ ] **Use strong, randomly generated passwords** (32+ characters)
- [ ] **Store credentials in environment variables** (never commit to Git)
- [ ] **Use managed database services** (DigitalOcean, AWS RDS, etc.)
- [ ] **Enable SSL/TLS connections** for database connections
- [ ] **Restrict database access** to application servers only (firewall rules)
- [ ] **Enable database audit logging** for compliance
- [ ] **Regular automated backups** with point-in-time recovery
- [ ] **Rotate credentials periodically** (every 90 days)
- [ ] **Use separate credentials per environment** (dev/staging/production)

### Environment Variable Management

**Development (.env file):**
```bash
# apps/core-api/.env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/core_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

**Production (Environment Variables):**
```bash
# Set via deployment platform (DigitalOcean App Platform, K8s secrets, etc.)
DATABASE_URL=postgresql://prod_user:STRONG_PASSWORD@managed-db-host:25060/core_db?sslmode=require
JWT_SECRET=STRONG_RANDOM_SECRET_KEY
```

---

## Database Migration Strategy

### Current Setup (Core Service)

```bash
# Generate new migration
npm run migration:generate -- apps/core-api/src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

### Future Multi-Service Strategy

Each service will maintain its own migrations:

```
apps/
├── core-api/
│   └── src/database/migrations/
├── notes-service/
│   └── src/database/migrations/
├── kanban-service/
│   └── src/database/migrations/
└── admin-service/
    └── src/database/migrations/
```

---

## Database Connection Testing

### Test Core Database Connection

```bash
# From host machine
psql -h localhost -p 5432 -U postgres -d core_db

# From Docker container
docker exec -it core-db psql -U postgres -d core_db

# Check tables
\dt

# Check specific table
\d users

# Exit
\q
```

### Test Application Connection

```bash
# Via Core API health check
curl http://localhost:3001/health

# Expected response (database connected):
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-30T..."
}
```

---

## Backup & Recovery

### Manual Backup (Development)

```bash
# Backup core_db
docker exec core-db pg_dump -U postgres core_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i core-db psql -U postgres core_db < backup_20250130_120000.sql
```

### Automated Backup (Production)

Use managed database services with automatic backups:
- DigitalOcean Managed Databases: Daily backups with 7-day retention
- AWS RDS: Automated backups with point-in-time recovery
- Google Cloud SQL: Automated backups with customizable retention

---

## Monitoring & Performance

### Key Metrics to Monitor

1. **Connection Pool**
   - Active connections
   - Idle connections
   - Connection wait time

2. **Query Performance**
   - Slow query log (queries > 500ms)
   - Most frequent queries
   - Query execution plans

3. **Resource Usage**
   - CPU utilization
   - Memory usage
   - Disk I/O
   - Storage capacity

4. **Replication (if applicable)**
   - Replication lag
   - Replication status

### Tools

- **pgAdmin**: GUI management tool
- **pg_stat_statements**: Query statistics extension
- **Datadog/New Relic**: APM with PostgreSQL monitoring
- **Grafana + Prometheus**: Custom dashboards

---

## Architecture Decision Records (ADRs)

Related ADRs:
- [ADR-001: Shared Schema Multi-Tenancy](../adr/ADR-001-shared-schema-multi-tenancy.md)
- [ADR-002: Database-per-Service](../adr/ADR-002-database-per-service.md)

---

## Support & Troubleshooting

### Common Issues

**Issue:** Connection refused to localhost:5432
- **Solution:** Ensure PostgreSQL container is running: `docker-compose up postgres`

**Issue:** Password authentication failed
- **Solution:** Check credentials in `.env` match `docker-compose.yml`

**Issue:** Database does not exist
- **Solution:** Database is auto-created on first connection. Restart containers.

**Issue:** Migration failed
- **Solution:** Check migration syntax, revert last migration, fix, and re-run.

### Support Contacts

- **Database Architecture:** See `docs/architecture/database-architecture.md`
- **Deployment Issues:** See `docs/deployment/local-setup.md`
- **ADRs:** See `docs/adr/README.md`

---

## Summary Table

| Database    | Status      | Service       | Port | Current Tables | Planned Tables | Docker Container    |
|-------------|-------------|---------------|------|----------------|----------------|---------------------|
| core_db     | ✅ Active   | core-api      | 5432 | 7              | -              | core-db (postgres)  |
| notes_db    | 📋 Planned  | notes-service | 5432 | 0              | 3              | TBD                 |
| kanban_db   | 📋 Planned  | kanban-service| 5432 | 0              | 4              | TBD                 |
| admin_db    | 📋 Planned  | admin-service | 5432 | 0              | TBD            | TBD                 |

**Last Updated:** 2025-01-30

---

## Next Steps

1. **Immediate:** Secure production credentials for core_db
2. **Epic 3:** Implement notes_db with separate PostgreSQL container
3. **Epic 4:** Implement kanban_db with separate PostgreSQL container
4. **Future:** Implement admin_db for system administration

---

**⚠️ WARNING:** This document contains sensitive configuration information. 
**DO NOT commit actual production credentials to version control.**
Store this file in `.gitignore` if it contains real passwords.

