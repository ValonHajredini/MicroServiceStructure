# Database Architecture

## Database-per-Service Strategy

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

## Core Service Database Schema

**Database Name:** `core_db`

**Tables:**

### `tenants`
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

### `users`
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

### `user_tenant_roles`
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

### `file_metadata`
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

## Notes Service Database Schema

**Database Name:** `notes_db`

**Tables:**

### `notes`
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

### `attachments`
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

### `folders`
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

## Kanban Service Database Schema

**Database Name:** `kanban_db`

**Tables:**

### `boards`
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

### `columns`
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

### `todos`
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

### `todo_comments`
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

## Multi-Tenancy Pattern

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
