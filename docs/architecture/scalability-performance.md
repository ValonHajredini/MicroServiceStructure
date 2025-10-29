# Scalability & Performance

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response Time | <200ms p95 | APM monitoring |
| Page Load Time | <2 seconds | Lighthouse |
| Database Query Time | <50ms p95 | PostgreSQL logs |
| File Upload Time | <5 seconds (25MB) | Client-side tracking |
| Concurrent Users | 1,000+ | Load testing |

---

## Scaling Strategy

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

## Database Optimization

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
