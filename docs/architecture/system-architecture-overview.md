# System Architecture Overview

## High-Level Architecture Diagram

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

## Architecture Layers

### 1. Presentation Layer (Angular 20)
- **Core UI**: Landing page, authentication, dashboard, service catalog
- **Notes UI**: Rich text editor, file attachments, search, folders
- **Kanban UI**: Board view, drag-and-drop, task management
- **Admin UI**: Tenant provisioning, service management, monitoring

### 2. API Gateway Pattern (Implicit)
- Each service exposes REST APIs
- CORS configuration allows cross-service calls
- JWT validation middleware in every service
- API versioning: `/api/v1/`, `/api/v2/`, etc.

### 3. Application Layer (NestJS Microservices)
- **Core Service**: Authentication, tenant management, file uploads
- **Notes Service**: Note CRUD, attachments, search
- **Kanban Service**: Boards, columns, todos, collaboration
- **Admin Service**: Super admin, monitoring, provisioning

### 4. Data Layer (PostgreSQL)
- Database-per-service pattern
- Shared-schema multi-tenancy with `tenant_id` column
- TypeORM for ORM and migrations

### 5. External Services
- **DigitalOcean Spaces**: File storage with presigned URLs
- **Email Service**: Transactional emails (registration, invites)

---
