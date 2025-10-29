# Component Architecture

## Core Service

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

## Notes Service

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

## Kanban Service

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

## Admin Service

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
