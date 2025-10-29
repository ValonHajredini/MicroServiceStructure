# MicroServiceStructure - System Architecture Design

**Version:** 1.0
**Date:** 2025-10-29
**Status:** Architecture Phase
**Architect Mode:** SPARC

---

## Table of Contents

1. [Executive Architecture Summary](#executive-architecture-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Component Architecture](#component-architecture)
4. [Database Architecture](#database-architecture)
5. [API Contracts & Communication](#api-contracts--communication)
6. [Authentication & Multi-Tenancy](#authentication--multi-tenancy)
7. [Infrastructure & Deployment](#infrastructure--deployment)
8. [Architecture Decision Records](#architecture-decision-records)
9. [Security Architecture](#security-architecture)
10. [Scalability & Performance](#scalability--performance)

---

## Executive Architecture Summary

### Architecture Principles

1. **Database-per-Service Isolation** - Each microservice owns its data
2. **Shared-Schema Multi-Tenancy** - `tenant_id` filtering for simplicity (Phase 1)
3. **JWT-Based SSO** - Single authentication across all services
4. **API-First Design** - OpenAPI/Swagger documentation from day 1
5. **Progressive Complexity** - Start simple, add features incrementally

### Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Architecture Style** | Microservices | Service independence, scalability, team learning |
| **Multi-Tenancy** | Shared-schema (tenant_id) | Simpler implementation, faster time-to-market |
| **Database Strategy** | Database-per-service | True microservices pattern, independent scaling |
| **Authentication** | JWT with HS256 | Simple, stateless, works across services |
| **API Documentation** | Swagger/OpenAPI 3.0 | Enterprise requirement, auto-generated |
| **Frontend** | Angular 20 + PrimeNG | Modern, TypeScript, component library |
| **Backend** | NestJS | TypeScript, microservices support, Angular-like |
| **ORM** | TypeORM | Multi-tenancy support, migrations, PostgreSQL |
| **File Storage** | DigitalOcean Spaces | S3-compatible, managed, scalable |
| **Email** | SendGrid/AWS SES | Reliable, transactional emails |

---

## System Architecture Overview

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer (Angular 20)                     │
├────────────────┬────────────────┬────────────────┬──────────────────┤
│   Core UI      │   Notes UI     │   Kanban UI    │   Admin UI       │
│  mydomain.com  │ notes.mydomain │kanban.mydomain │admin.mydomain    │
│                │     .com       │     .com       │    .com          │
│ - Landing      │ - Note CRUD    │ - Board CRUD   │ - Tenant Mgmt    │
│ - Auth         │ - Attachments  │ - Todo Mgmt    │ - Service Toggle │
│ - Dashboard    │ - Search       │ - Drag & Drop  │ - Monitoring     │
└────────┬───────┴────────┬───────┴────────┬───────┴────────┬─────────┘
         │                │                │                │
         │         JWT Token (localStorage)                 │
         │                │                │                │
┌────────▼────────────────▼────────────────▼────────────────▼─────────┐
│                     CORS & JWT Validation Layer                      │
└────────┬────────────────┬────────────────┬────────────────┬─────────┘
         │                │                │                │
┌────────▼────────┐ ┌─────▼────────┐ ┌────▼─────────┐ ┌───▼──────────┐
│  Core Service   │ │Notes Service │ │Kanban Service│ │Admin Service │
│    (NestJS)     │ │   (NestJS)   │ │   (NestJS)   │ │   (NestJS)   │
│                 │ │              │ │              │ │              │
│ /api/v1/auth    │ │ /api/v1/notes│ │/api/v1/boards│ │/api/v1/admin │
│ /api/v1/tenants │ │ /api/v1/...  │ │/api/v1/todos │ │/api/v1/...   │
│ /api/v1/users   │ │              │ │              │ │              │
│ /api/v1/files   │ │              │ │              │ │              │
└────────┬────────┘ └─────┬────────┘ └────┬─────────┘ └───┬──────────┘
         │                │                │                │
┌────────▼────────┐ ┌─────▼────────┐ ┌────▼─────────┐ ┌───▼──────────┐
│    core_db      │ │   notes_db   │ │  kanban_db   │ │   admin_db   │
│  (PostgreSQL)   │ │(PostgreSQL)  │ │(PostgreSQL)  │ │(PostgreSQL)  │
│                 │ │              │ │              │ │              │
│ - users         │ │ - notes      │ │ - boards     │ │ - system_logs│
│ - tenants       │ │ - attachments│ │ - columns    │ │ - metrics    │
│ - roles         │ │ - tags       │ │ - todos      │ │ - alerts     │
│ - file_metadata │ │              │ │ - comments   │ │              │
└─────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

External Services:
┌──────────────────────────────────────────────────────────────────┐
│ DigitalOcean Spaces (S3) - File Storage (tenant_id/service/*)   │
│ SendGrid/AWS SES - Email Service (invites, password reset)      │
└──────────────────────────────────────────────────────────────────┘
```

### Architecture Layers

#### 1. Presentation Layer (Angular 20)
- **Core UI**: Landing page, authentication, dashboard, service catalog
- **Notes UI**: Rich text editor, file attachments, search, folders
- **Kanban UI**: Board view, drag-and-drop, task management
- **Admin UI**: Tenant provisioning, service management, monitoring

#### 2. API Gateway Pattern (Implicit)
- Each service exposes REST APIs
- CORS configuration allows cross-service calls
- JWT validation middleware in every service
- API versioning: `/api/v1/`, `/api/v2/`, etc.

#### 3. Application Layer (NestJS Microservices)
- **Core Service**: Authentication, tenant management, file uploads
- **Notes Service**: Note CRUD, attachments, search
- **Kanban Service**: Boards, columns, todos, collaboration
- **Admin Service**: Super admin, monitoring, provisioning

#### 4. Data Layer (PostgreSQL)
- Database-per-service pattern
- Shared-schema multi-tenancy with `tenant_id` column
- TypeORM for ORM and migrations

#### 5. External Services
- **DigitalOcean Spaces**: File storage with presigned URLs
- **Email Service**: Transactional emails (registration, invites)

---

## Component Architecture

### Core Service

**Responsibilities:**
- User authentication and authorization
- Tenant management and provisioning
- User management (CRUD, roles)
- File upload service (DigitalOcean Spaces integration)
- Service enablement configuration

**Modules:**

```
core-api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts        # POST /login, /register, /logout
│   │   ├── auth.service.ts           # JWT generation, password hashing
│   │   ├── jwt.strategy.ts           # Passport JWT strategy
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts     # @UseGuards(JwtAuthGuard)
│   │       └── roles.guard.ts        # @Roles('admin')
│   ├── tenants/
│   │   ├── tenants.controller.ts     # Tenant CRUD
│   │   ├── tenants.service.ts        # Business logic
│   │   ├── entities/
│   │   │   └── tenant.entity.ts      # TypeORM entity
│   │   └── dto/
│   │       ├── create-tenant.dto.ts
│   │       └── update-tenant.dto.ts
│   ├── users/
│   │   ├── users.controller.ts       # User CRUD (tenant-scoped)
│   │   ├── users.service.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts        # tenant_id, email, roles
│   │   └── dto/
│   ├── files/
│   │   ├── files.controller.ts       # Upload endpoint
│   │   ├── files.service.ts          # DigitalOcean Spaces integration
│   │   └── entities/
│   │       └── file-metadata.entity.ts
│   ├── common/
│   │   ├── middleware/
│   │   │   └── tenant-context.middleware.ts  # Extract tenant from JWT
│   │   ├── decorators/
│   │   │   ├── current-tenant.decorator.ts   # @CurrentTenant()
│   │   │   └── current-user.decorator.ts     # @CurrentUser()
│   │   └── filters/
│   │       └── http-exception.filter.ts
│   └── main.ts
├── test/
└── package.json
```

**Key APIs:**

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/auth/register` | POST | Register new tenant + admin user | Public |
| `/api/v1/auth/login` | POST | Login, receive JWT | Public |
| `/api/v1/auth/logout` | POST | Logout (client-side token removal) | JWT |
| `/api/v1/tenants` | GET | List tenants (admin only) | JWT + Admin |
| `/api/v1/tenants/:id` | GET/PUT/DELETE | Tenant details | JWT + Admin |
| `/api/v1/users` | GET | List users in tenant | JWT |
| `/api/v1/users/:id` | GET/PUT/DELETE | User CRUD | JWT |
| `/api/v1/files/upload` | POST | Generate presigned URL | JWT |
| `/api/v1/files/:id` | GET | Get file metadata | JWT |

---

### Notes Service

**Responsibilities:**
- Note CRUD operations
- File attachments (via Core file service)
- Full-text search
- Folder/category organization

**Modules:**

```
notes-api/
├── src/
│   ├── notes/
│   │   ├── notes.controller.ts       # Note CRUD endpoints
│   │   ├── notes.service.ts          # Business logic, search
│   │   ├── entities/
│   │   │   ├── note.entity.ts        # tenant_id, title, content
│   │   │   └── attachment.entity.ts  # note_id, file_url
│   │   └── dto/
│   │       ├── create-note.dto.ts
│   │       └── update-note.dto.ts
│   ├── folders/
│   │   ├── folders.controller.ts
│   │   ├── folders.service.ts
│   │   └── entities/
│   │       └── folder.entity.ts
│   ├── auth/
│   │   └── jwt.strategy.ts           # Validate JWT from Core
│   ├── common/
│   │   └── middleware/
│   │       └── tenant-context.middleware.ts
│   └── main.ts
└── package.json
```

**Key APIs:**

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/notes` | GET | List notes (tenant-scoped) | JWT |
| `/api/v1/notes` | POST | Create note | JWT |
| `/api/v1/notes/:id` | GET/PUT/DELETE | Note CRUD | JWT |
| `/api/v1/notes/search` | GET | Full-text search | JWT |
| `/api/v1/notes/:id/attachments` | POST | Add attachment | JWT |
| `/api/v1/notes/:id/attachments/:attachmentId` | DELETE | Remove attachment | JWT |

---

### Kanban Service

**Responsibilities:**
- Board management
- Column management (drag-and-drop ordering)
- Todo/task management
- Real-time updates (polling or WebSocket)

**Modules:**

```
kanban-api/
├── src/
│   ├── boards/
│   │   ├── boards.controller.ts
│   │   ├── boards.service.ts
│   │   ├── entities/
│   │   │   └── board.entity.ts       # tenant_id, name, owner_id
│   │   └── dto/
│   ├── columns/
│   │   ├── columns.controller.ts
│   │   ├── columns.service.ts
│   │   ├── entities/
│   │   │   └── column.entity.ts      # board_id, title, position
│   │   └── dto/
│   ├── todos/
│   │   ├── todos.controller.ts
│   │   ├── todos.service.ts
│   │   ├── entities/
│   │   │   └── todo.entity.ts        # column_id, title, assignee
│   │   └── dto/
│   ├── auth/
│   │   └── jwt.strategy.ts
│   ├── common/
│   │   └── middleware/
│   │       └── tenant-context.middleware.ts
│   └── main.ts
└── package.json
```

**Key APIs:**

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/boards` | GET | List boards | JWT |
| `/api/v1/boards` | POST | Create board | JWT |
| `/api/v1/boards/:id` | GET/PUT/DELETE | Board CRUD | JWT |
| `/api/v1/boards/:id/columns` | GET/POST | Column management | JWT |
| `/api/v1/columns/:id` | PUT/DELETE | Update/delete column | JWT |
| `/api/v1/columns/:id/todos` | GET/POST | Todo management | JWT |
| `/api/v1/todos/:id` | GET/PUT/DELETE | Todo CRUD | JWT |
| `/api/v1/todos/:id/move` | PUT | Move todo to column | JWT |

---

### Admin Service

**Responsibilities:**
- Super admin dashboard
- Tenant provisioning automation
- Service assignment per tenant
- System monitoring and alerts

**Modules:**

```
admin-api/
├── src/
│   ├── admin/
│   │   ├── admin.controller.ts       # Super admin endpoints
│   │   ├── admin.service.ts
│   │   └── dto/
│   ├── provisioning/
│   │   ├── provisioning.controller.ts
│   │   ├── provisioning.service.ts   # Schema creation, seed data
│   │   └── dto/
│   ├── monitoring/
│   │   ├── monitoring.controller.ts
│   │   ├── monitoring.service.ts     # Metrics, logs, alerts
│   │   └── entities/
│   │       ├── metric.entity.ts
│   │       └── alert.entity.ts
│   ├── auth/
│   │   └── jwt.strategy.ts
│   └── main.ts
└── package.json
```

**Key APIs:**

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/v1/admin/tenants` | GET | List all tenants | JWT + SuperAdmin |
| `/api/v1/admin/tenants/:id/services` | PUT | Enable/disable services | JWT + SuperAdmin |
| `/api/v1/admin/provision` | POST | Auto-provision new tenant | JWT + SuperAdmin |
| `/api/v1/admin/monitoring/metrics` | GET | System metrics | JWT + SuperAdmin |
| `/api/v1/admin/monitoring/alerts` | GET | Active alerts | JWT + SuperAdmin |

---

## Database Architecture

### Database-per-Service Strategy

Each microservice has its own PostgreSQL database:

```
PostgreSQL Cluster (DigitalOcean Managed)
├── core_db (Port 5432)
├── notes_db (Port 5432)
├── kanban_db (Port 5432)
└── admin_db (Port 5432)
```

**Rationale:**
- **Service Independence**: Each service can evolve schemas independently
- **Fault Isolation**: Database issues don't cascade
- **Scalability**: Can scale databases independently based on load
- **Technology Flexibility**: Could use different DB tech per service (future)

---

### Core Service Database Schema

**Database Name:** `core_db`

**Tables:**

#### `tenants`
```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,  -- For future tenant subdomains
    enabled_services JSONB DEFAULT '[]'::jsonb,  -- ["notes", "kanban"]
    status VARCHAR(50) DEFAULT 'active',  -- active, suspended, deleted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
```

#### `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'active',  -- active, inactive, suspended
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)  -- Email unique per tenant
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

#### `user_tenant_roles`
```sql
CREATE TABLE user_tenant_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- admin, user, viewer
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, tenant_id, role)
);

CREATE INDEX idx_user_tenant_roles_user_id ON user_tenant_roles(user_id);
CREATE INDEX idx_user_tenant_roles_tenant_id ON user_tenant_roles(tenant_id);
```

#### `file_metadata`
```sql
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,  -- bytes
    mime_type VARCHAR(100),
    storage_key TEXT NOT NULL,  -- DigitalOcean Spaces key
    storage_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_file_metadata_tenant_id ON file_metadata(tenant_id);
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by_user_id);
```

---

### Notes Service Database Schema

**Database Name:** `notes_db`

**Tables:**

#### `notes`
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,  -- FK to core_db.tenants (logical reference)
    user_id UUID NOT NULL,    -- FK to core_db.users (logical reference)
    title VARCHAR(500),
    content TEXT,
    folder_id UUID REFERENCES folders(id),
    is_pinned BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'active',  -- active, archived, deleted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_folder_id ON notes(folder_id);
CREATE INDEX idx_notes_status ON notes(status);
CREATE INDEX idx_notes_pinned ON notes(is_pinned);

-- Full-text search
CREATE INDEX idx_notes_title_content_fts ON notes USING gin(to_tsvector('english', title || ' ' || content));
```

#### `attachments`
```sql
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    file_metadata_id UUID NOT NULL,  -- FK to core_db.file_metadata
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_attachments_tenant_id ON attachments(tenant_id);
CREATE INDEX idx_attachments_note_id ON attachments(note_id);
```

#### `folders`
```sql
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    parent_folder_id UUID REFERENCES folders(id),
    created_by_user_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_folders_tenant_id ON folders(tenant_id);
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);
```

---

### Kanban Service Database Schema

**Database Name:** `kanban_db`

**Tables:**

#### `boards`
```sql
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_user_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'active',  -- active, archived, deleted
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_boards_tenant_id ON boards(tenant_id);
CREATE INDEX idx_boards_owner ON boards(owner_user_id);
CREATE INDEX idx_boards_status ON boards(status);
```

#### `columns`
```sql
CREATE TABLE columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    position INTEGER NOT NULL,  -- Order in board
    wip_limit INTEGER,  -- Work-in-progress limit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_columns_tenant_id ON columns(tenant_id);
CREATE INDEX idx_columns_board_id ON columns(board_id);
CREATE INDEX idx_columns_position ON columns(board_id, position);
```

#### `todos`
```sql
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    assigned_to_user_id UUID,
    priority VARCHAR(50) DEFAULT 'medium',  -- low, medium, high, urgent
    due_date TIMESTAMP,
    position INTEGER NOT NULL,  -- Order in column
    status VARCHAR(50) DEFAULT 'open',  -- open, in_progress, completed
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_todos_tenant_id ON todos(tenant_id);
CREATE INDEX idx_todos_column_id ON todos(column_id);
CREATE INDEX idx_todos_assignee ON todos(assigned_to_user_id);
CREATE INDEX idx_todos_position ON todos(column_id, position);
CREATE INDEX idx_todos_status ON todos(status);
```

#### `todo_comments`
```sql
CREATE TABLE todo_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    todo_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_todo_comments_tenant_id ON todo_comments(tenant_id);
CREATE INDEX idx_todo_comments_todo_id ON todo_comments(todo_id);
```

---

### Multi-Tenancy Pattern

**Shared-Schema with `tenant_id` Filtering (Phase 1)**

Every table includes `tenant_id` column:

```typescript
// TypeORM Entity Example
@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;  // Automatically filtered

  @Column()
  title: string;

  @Column('text')
  content: string;

  // ... other fields
}
```

**Automatic Tenant Scoping via Middleware:**

```typescript
// tenant-context.middleware.ts
export class TenantContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const user = req.user;  // From JWT
    if (user && user.tenantId) {
      req.tenantId = user.tenantId;
    }
    next();
  }
}
```

**TypeORM Global Scope (Future Enhancement):**

```typescript
// Apply tenant filter to all queries automatically
// Option 1: QueryBuilder approach
repository.createQueryBuilder('note')
  .where('note.tenant_id = :tenantId', { tenantId: req.tenantId })
  .getMany();

// Option 2: Custom Repository with auto-filter
// Create base repository that always adds tenant_id filter
```

---

## API Contracts & Communication

### API Design Principles

1. **RESTful Design** - Standard HTTP methods (GET, POST, PUT, DELETE)
2. **Versioning** - URL-based versioning (`/api/v1/`, `/api/v2/`)
3. **Consistent Response Format** - Standard error/success responses
4. **OpenAPI 3.0** - Swagger documentation for all endpoints
5. **HATEOAS (Optional)** - Hypermedia links in responses (future)

---

### Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Note",
    "content": "Note content..."
  },
  "meta": {
    "timestamp": "2025-10-29T10:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": {
      "field": "title",
      "constraint": "isNotEmpty"
    }
  },
  "meta": {
    "timestamp": "2025-10-29T10:00:00Z",
    "requestId": "req-12345"
  }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [
    { "id": "1", "title": "Note 1" },
    { "id": "2", "title": "Note 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

### Inter-Service Communication

**Phase 1: HTTP/REST**
- Services call each other via HTTP APIs
- JWT passed in `Authorization` header
- Synchronous request/response

**Example: Notes Service calling Core Service for file metadata**
```typescript
// notes-api/src/files/files-client.service.ts
@Injectable()
export class FilesClientService {
  constructor(private httpService: HttpService) {}

  async getFileMetadata(fileId: string, token: string): Promise<FileMetadata> {
    const response = await this.httpService
      .get(`${CORE_SERVICE_URL}/api/v1/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .toPromise();

    return response.data.data;
  }
}
```

**Phase 2: Event-Driven (Kafka)**
- Asynchronous events for Form Builder → Kanban
- Decouples services
- Deferred to Phase 2+

---

### Shared Types Library

**Monorepo Structure:**
```
MicroServiceStructure/
├── libs/
│   └── shared-types/
│       ├── src/
│       │   ├── auth/
│       │   │   ├── jwt-payload.interface.ts
│       │   │   └── user.interface.ts
│       │   ├── tenants/
│       │   │   └── tenant.interface.ts
│       │   ├── notes/
│       │   │   ├── note.dto.ts
│       │   │   └── note.interface.ts
│       │   └── index.ts
│       └── package.json
```

**Example: Shared JWT Payload**
```typescript
// libs/shared-types/src/auth/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string;          // User ID
  email: string;
  tenantId: string;
  roles: string[];      // ['admin', 'user']
  enabledServices: string[];  // ['notes', 'kanban']
  iat: number;
  exp: number;
}
```

**Usage in Services:**
```typescript
// core-api/src/auth/auth.service.ts
import { JwtPayload } from '@shared/types';

@Injectable()
export class AuthService {
  async generateToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      enabledServices: user.tenant.enabledServices,
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 86400  // 24 hours
    };
    return this.jwtService.sign(payload);
  }
}
```

---

## Authentication & Multi-Tenancy

### JWT-Based SSO Flow

**1. User Registration Flow:**
```
User → Core UI (Register Form)
  ↓
Core Service: POST /api/v1/auth/register
  - Create tenant record
  - Create admin user
  - Hash password (bcrypt)
  - Return success message
```

**2. Login Flow:**
```
User → Core UI (Login Form)
  ↓
Core Service: POST /api/v1/auth/login
  - Validate email/password
  - Generate JWT with claims:
    {
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      roles: ['admin'],
      enabledServices: ['notes', 'kanban']
    }
  - Return JWT + user info
  ↓
Angular: Store JWT in localStorage
```

**3. Accessing Notes Service:**
```
User → Notes UI (notes.mydomain.com)
  ↓
Angular: Retrieve JWT from localStorage
  ↓
HTTP Request: GET /api/v1/notes
  Headers: { Authorization: 'Bearer <token>' }
  ↓
Notes Service:
  - Validate JWT signature
  - Extract tenantId from payload
  - Query: SELECT * FROM notes WHERE tenant_id = :tenantId
  - Return tenant-scoped notes
```

**4. JWT Validation in Each Service:**
```typescript
// shared JWT strategy in all services
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET  // Shared secret
    });
  }

  async validate(payload: JwtPayload) {
    // Return user context attached to request
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      enabledServices: payload.enabledServices
    };
  }
}
```

---

### Multi-Tenancy Implementation

**Tenant Context Middleware:**
```typescript
// common/middleware/tenant-context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Extract tenant from JWT (attached by JwtStrategy)
    if (req.user && req.user.tenantId) {
      req.tenantId = req.user.tenantId;
    } else {
      throw new UnauthorizedException('Tenant context missing');
    }
    next();
  }
}
```

**Apply Middleware Globally:**
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply tenant context middleware to all routes
  app.use(new TenantContextMiddleware().use);

  await app.listen(3000);
}
```

**Tenant-Scoped Repository:**
```typescript
// notes/notes.service.ts
@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note) private notesRepo: Repository<Note>
  ) {}

  async findAll(tenantId: string): Promise<Note[]> {
    // Always filter by tenant_id
    return this.notesRepo.find({
      where: { tenant_id: tenantId }
    });
  }

  async create(createNoteDto: CreateNoteDto, tenantId: string, userId: string): Promise<Note> {
    const note = this.notesRepo.create({
      ...createNoteDto,
      tenant_id: tenantId,  // Inject tenant
      user_id: userId
    });
    return this.notesRepo.save(note);
  }
}
```

---

### Security Considerations

**1. JWT Security:**
- **Secret Management**: Store JWT_SECRET in environment variables
- **Algorithm**: HS256 (symmetric) for Phase 1, consider RS256 (asymmetric) later
- **Token Expiration**: 24 hours (configurable)
- **Refresh Tokens**: Deferred to Phase 2

**2. Password Security:**
- **Hashing**: bcrypt with 10 salt rounds
- **Password Reset**: Email-based token (expires 1 hour)
- **Rate Limiting**: Limit login attempts (5 per minute per IP)

**3. Tenant Isolation:**
- **Automatic Filtering**: `tenant_id` in WHERE clause for all queries
- **Middleware Enforcement**: Reject requests without tenant context
- **Testing**: Comprehensive isolation tests (cross-tenant data access)

**4. CORS Configuration:**
```typescript
// main.ts
app.enableCors({
  origin: [
    'http://localhost:4200',  // Local dev
    'https://mydomain.com',
    'https://notes.mydomain.com',
    'https://kanban.mydomain.com',
    'https://admin.mydomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

**5. Input Validation:**
```typescript
// DTOs with class-validator
export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUUID()
  @IsOptional()
  folder_id?: string;
}
```

---

## Infrastructure & Deployment

### Deployment Architecture

**Target Platform:** DigitalOcean App Platform or Droplets + Docker

**Phase 1: Docker Compose (Local Development)**
```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Databases
  postgres-core:
    image: postgres:14
    environment:
      POSTGRES_DB: core_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - core-db-data:/var/lib/postgresql/data

  postgres-notes:
    image: postgres:14
    environment:
      POSTGRES_DB: notes_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"
    volumes:
      - notes-db-data:/var/lib/postgresql/data

  postgres-kanban:
    image: postgres:14
    environment:
      POSTGRES_DB: kanban_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5434:5432"
    volumes:
      - kanban-db-data:/var/lib/postgresql/data

  postgres-admin:
    image: postgres:14
    environment:
      POSTGRES_DB: admin_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5435:5432"
    volumes:
      - admin-db-data:/var/lib/postgresql/data

  # Core Service
  core-api:
    build:
      context: ./apps/core-api
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-core:5432/core_db
      - JWT_SECRET=your-secret-key
      - DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
      - DO_SPACES_BUCKET=your-bucket
      - DO_SPACES_ACCESS_KEY=your-key
      - DO_SPACES_SECRET_KEY=your-secret
    depends_on:
      - postgres-core

  # Notes Service
  notes-api:
    build:
      context: ./apps/notes-api
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-notes:5432/notes_db
      - JWT_SECRET=your-secret-key
      - CORE_SERVICE_URL=http://core-api:3000
    depends_on:
      - postgres-notes
      - core-api

  # Kanban Service
  kanban-api:
    build:
      context: ./apps/kanban-api
      dockerfile: Dockerfile
    ports:
      - "3003:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-kanban:5432/kanban_db
      - JWT_SECRET=your-secret-key
      - CORE_SERVICE_URL=http://core-api:3000
    depends_on:
      - postgres-kanban
      - core-api

  # Admin Service
  admin-api:
    build:
      context: ./apps/admin-api
      dockerfile: Dockerfile
    ports:
      - "3004:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-admin:5432/admin_db
      - JWT_SECRET=your-secret-key
      - CORE_SERVICE_URL=http://core-api:3000
    depends_on:
      - postgres-admin
      - core-api

volumes:
  core-db-data:
  notes-db-data:
  kanban-db-data:
  admin-db-data:
```

---

### Production Deployment (DigitalOcean)

**Option 1: DigitalOcean App Platform (Recommended for Phase 1)**

**Advantages:**
- Fully managed platform (no server management)
- Auto-scaling and load balancing
- Built-in CI/CD from GitHub
- Automatic HTTPS/SSL
- Simple pricing ($12-50/month per service)

**Setup:**
```yaml
# .do/app.yaml (App Platform spec)
name: microservice-structure
services:
  - name: core-api
    github:
      repo: your-org/MicroServiceStructure
      branch: main
      deploy_on_push: true
    source_dir: /apps/core-api
    build_command: npm run build
    run_command: npm run start:prod
    envs:
      - key: DATABASE_URL
        value: ${core-db.DATABASE_URL}
      - key: JWT_SECRET
        type: SECRET
        value: your-secret
    http_port: 3000
    routes:
      - path: /
    instance_count: 2
    instance_size_slug: basic-xs  # $12/month

  - name: notes-api
    # Similar config...

  - name: kanban-api
    # Similar config...

  - name: admin-api
    # Similar config...

databases:
  - name: core-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb  # $15/month

  - name: notes-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb

  - name: kanban-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb

  - name: admin-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb
```

**Cost Estimate:**
- 4 services × $12/month = $48/month
- 4 databases × $15/month = $60/month
- DigitalOcean Spaces: $5-20/month
- **Total: ~$115-150/month**

---

**Option 2: DigitalOcean Droplets + Docker (More Control)**

**Architecture:**
```
DigitalOcean Droplet ($24/month)
├── Docker Compose
│   ├── core-api:3001
│   ├── notes-api:3002
│   ├── kanban-api:3003
│   └── admin-api:3004
├── Nginx (Reverse Proxy)
│   ├── mydomain.com → core-api:3001
│   ├── notes.mydomain.com → notes-api:3002
│   ├── kanban.mydomain.com → kanban-api:3003
│   └── admin.mydomain.com → admin-api:3004
└── Let's Encrypt SSL

Managed PostgreSQL Cluster ($45-90/month)
├── core_db
├── notes_db
├── kanban_db
└── admin_db
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/microservices

# Core Service
server {
    listen 80;
    server_name mydomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Notes Service
server {
    listen 80;
    server_name notes.mydomain.com;

    location / {
        proxy_pass http://localhost:3002;
        # ... same proxy settings
    }
}

# Kanban Service
server {
    listen 80;
    server_name kanban.mydomain.com;

    location / {
        proxy_pass http://localhost:3003;
        # ... same proxy settings
    }
}

# Admin Service
server {
    listen 80;
    server_name admin.mydomain.com;

    location / {
        proxy_pass http://localhost:3004;
        # ... same proxy settings
    }
}
```

**Cost Estimate:**
- Droplet (2 CPU, 4GB RAM): $24/month
- Managed PostgreSQL: $45-90/month
- DigitalOcean Spaces: $5-20/month
- Domain + SSL: Free (Let's Encrypt)
- **Total: ~$75-135/month**

---

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy Microservices

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all  # Run tests for all services

  build-core:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Core Service
        run: |
          cd apps/core-api
          docker build -t core-api:latest .
      - name: Push to Registry
        run: |
          docker push registry.digitalocean.com/your-registry/core-api:latest

  # Similar jobs for notes, kanban, admin...

  deploy:
    needs: [build-core, build-notes, build-kanban, build-admin]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to DigitalOcean
        run: |
          doctl apps create-deployment ${{ secrets.APP_ID }}
```

---

## Architecture Decision Records

### ADR-001: Shared-Schema Multi-Tenancy (Phase 1)

**Date:** 2025-10-29
**Status:** Accepted
**Context:** Need to balance simplicity with enterprise scalability
**Decision:** Use shared-schema with `tenant_id` filtering in Phase 1
**Consequences:**
- ✅ Faster development (18-20 weeks vs 26 weeks)
- ✅ Simpler operations (one schema to maintain)
- ✅ Team learns microservices fundamentals first
- ⚠️ Enterprise tier (dedicated schemas) deferred to Phase 3+
- ⚠️ Requires strong tenant isolation testing

---

### ADR-002: Database-per-Service Pattern

**Date:** 2025-10-29
**Status:** Accepted
**Context:** True microservices require data independence
**Decision:** Each service has its own PostgreSQL database
**Consequences:**
- ✅ Service independence (schema evolution)
- ✅ Fault isolation (DB failures don't cascade)
- ✅ Independent scaling per service
- ⚠️ No joins across services (requires HTTP calls)
- ⚠️ Data consistency challenges (eventual consistency)

---

### ADR-003: JWT with HS256 Signing (Phase 1)

**Date:** 2025-10-29
**Status:** Accepted
**Context:** Need simple, stateless authentication across services
**Decision:** Use JWT with HS256 (shared secret) in Phase 1
**Consequences:**
- ✅ Simple implementation (single secret)
- ✅ Stateless (no session storage)
- ✅ Works across all services
- ⚠️ Shared secret management required
- ⚠️ Consider RS256 (public/private keys) in Phase 2

---

### ADR-004: Defer Kafka/Redis to Phase 2

**Date:** 2025-10-29
**Status:** Accepted
**Context:** Reduce complexity during learning phase
**Decision:** HTTP/REST only in Phase 1, add Kafka/Redis in Phase 2
**Consequences:**
- ✅ Lower cognitive load for team
- ✅ Faster to market (simpler stack)
- ✅ Event-driven architecture when actually needed (Form Builder integration)
- ⚠️ Synchronous inter-service calls initially
- ⚠️ No caching layer initially (acceptable for MVP)

---

### ADR-005: TypeORM for Multi-Tenancy

**Date:** 2025-10-29
**Status:** Accepted
**Context:** Need ORM with multi-tenancy support
**Decision:** Use TypeORM with tenant_id filtering
**Consequences:**
- ✅ Supports PostgreSQL multi-schema (future)
- ✅ Migration system
- ✅ Active TypeScript community
- ⚠️ Manual tenant filtering in queries (no automatic global scope out-of-box)
- ⚠️ Requires middleware for tenant context

---

### ADR-006: URL-Based API Versioning

**Date:** 2025-10-29
**Status:** Accepted
**Context:** APIs will evolve, need versioning strategy
**Decision:** Use `/api/v1/`, `/api/v2/` URL prefixes
**Consequences:**
- ✅ Explicit, clear versioning
- ✅ Easy to maintain multiple versions
- ✅ No header-based complexity
- ⚠️ URL changes visible to clients
- ⚠️ Need deprecation strategy

---

### ADR-007: DigitalOcean App Platform (Phase 1)

**Date:** 2025-10-29
**Status:** Accepted
**Context:** Need simple deployment for MVP
**Decision:** Use DigitalOcean App Platform for Phase 1
**Consequences:**
- ✅ Fully managed (no DevOps overhead)
- ✅ Auto-scaling, CI/CD built-in
- ✅ Simple pricing ($115-150/month)
- ⚠️ Vendor lock-in (mitigated by Docker containers)
- ⚠️ Less control than Droplets + Docker

---

### ADR-008: Monorepo with Nx/Turborepo

**Date:** 2025-10-29
**Status:** Proposed
**Context:** Need code sharing across services
**Decision:** Use monorepo (Nx or Turborepo)
**Consequences:**
- ✅ Shared types library (`@shared/types`)
- ✅ Atomic commits across services
- ✅ Simplified dependency management
- ⚠️ Larger repository size
- ⚠️ Learning curve for monorepo tools

---

## Security Architecture

### Threat Model

**Assets:**
- User credentials (passwords, JWT tokens)
- Tenant data (notes, kanban boards, form responses)
- File uploads (attachments, images)

**Threats:**
1. **Cross-Tenant Data Leaks** - Tenant A accessing Tenant B's data
2. **Unauthorized Access** - Unauthenticated users accessing protected endpoints
3. **JWT Theft** - Stolen tokens used to impersonate users
4. **SQL Injection** - Malicious SQL in user inputs
5. **XSS Attacks** - Malicious scripts in user content
6. **CSRF Attacks** - Unauthorized state-changing requests

**Mitigations:**

| Threat | Mitigation | Implementation |
|--------|-----------|----------------|
| Cross-Tenant Data Leaks | Automatic `tenant_id` filtering | Middleware + TypeORM where clauses |
| Unauthorized Access | JWT authentication guards | `@UseGuards(JwtAuthGuard)` on all routes |
| JWT Theft | Short token expiration (24h) | JWT `exp` claim |
| SQL Injection | Parameterized queries | TypeORM (no raw SQL) |
| XSS | Angular sanitization + CSP | DomSanitizer + CSP headers |
| CSRF | CSRF tokens (future) | Phase 2 enhancement |

---

### Security Checklist

**Authentication & Authorization:**
- [x] JWT with expiration (24 hours)
- [x] Password hashing with bcrypt (10 rounds)
- [x] Role-based access control (admin, user)
- [ ] Refresh token mechanism (Phase 2)
- [ ] Two-factor authentication (Phase 3+)

**Data Protection:**
- [x] HTTPS only (TLS 1.2+)
- [x] Tenant isolation via `tenant_id`
- [x] Input validation (class-validator)
- [ ] Data encryption at rest (Phase 2)
- [ ] Audit logging (Phase 2)

**API Security:**
- [x] CORS whitelist
- [x] Rate limiting (5 login attempts/minute)
- [x] JWT validation in every service
- [ ] API key management (Phase 2)
- [ ] Request signing (Phase 3+)

**File Security:**
- [x] Presigned URLs (DigitalOcean Spaces)
- [x] File size limits (25MB)
- [x] Tenant-scoped storage paths
- [ ] Virus scanning (Phase 2)
- [ ] Content-Type validation (Phase 1)

---

## Scalability & Performance

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | <200ms p95 | APM monitoring |
| Page Load Time | <2 seconds | Lighthouse |
| Database Query Time | <50ms p95 | PostgreSQL logs |
| File Upload Time | <5 seconds (25MB) | Client-side tracking |
| Concurrent Users | 1,000+ | Load testing |

---

### Scaling Strategy

**Phase 1: Vertical Scaling (0-100 tenants)**
- Scale up Droplet/App Platform instances (more CPU/RAM)
- Increase PostgreSQL connection pool
- DigitalOcean Spaces auto-scales

**Phase 2: Horizontal Scaling (100-500 tenants)**
- Multiple replicas per service (load balancing)
- Redis caching layer (reduce DB load)
- Database read replicas

**Phase 3: Advanced Scaling (500+ tenants)**
- Kubernetes for orchestration
- Database sharding (if needed)
- CDN for static assets
- Dedicated databases for premium tenants

---

### Database Optimization

**Indexes:**
```sql
-- Core DB
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Notes DB
CREATE INDEX idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_title_content_fts ON notes USING gin(to_tsvector('english', title || ' ' || content));

-- Kanban DB
CREATE INDEX idx_boards_tenant_id ON boards(tenant_id);
CREATE INDEX idx_todos_tenant_id ON todos(tenant_id);
CREATE INDEX idx_todos_column_id ON todos(column_id);
```

**Connection Pooling:**
```typescript
// TypeORM connection config
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: 5432,
  database: 'core_db',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  extra: {
    max: 30,  // Max connections in pool
    min: 5,   // Min connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  }
}
```

---

## Summary

This architecture design provides:

1. **Clear Service Boundaries** - Core, Notes, Kanban, Admin services
2. **Database-per-Service** - True microservices pattern
3. **Shared-Schema Multi-Tenancy** - Simple, pragmatic approach
4. **JWT-Based SSO** - Single authentication across all services
5. **Scalable Infrastructure** - DigitalOcean with clear scaling path
6. **Security-First** - Tenant isolation, JWT validation, HTTPS
7. **API-First Design** - Swagger/OpenAPI documentation
8. **Progressive Complexity** - Start simple, add features incrementally

**Next Steps:**
1. Review architecture with team
2. Set up development environment
3. Begin Phase 0: POCs (Weeks 1-2)
4. Implement Core Service (Weeks 3-7)
5. Proceed with Notes and Kanban services

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Maintained By:** Development Team Lead
**Review Cycle:** Weekly during Phase 1, Monthly thereafter
