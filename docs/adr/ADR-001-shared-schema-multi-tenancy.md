# ADR-001: Shared-Schema Multi-Tenancy (Phase 1)

**Date:** 2025-10-29
**Status:** Accepted
**Decision Makers:** Development Team, Business Analyst

## Context

The project requires a multi-tenancy strategy to support multiple customer organizations (tenants) on a shared platform. Two primary approaches were considered:

1. **Shared-schema with tenant_id filtering** - All tenants share the same database schema, with a `tenant_id` column in every table
2. **Schema-per-tenant** - Each tenant gets a dedicated database schema with complete data isolation

The team is learning microservices architecture for the first time and wants to minimize complexity while maintaining a path to enterprise scalability.

## Decision

**Use shared-schema with `tenant_id` filtering for Phase 1, with optional migration to schema-per-tenant in Phase 3+ if customer demand exists.**

Every table will include a `tenant_id` column:
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    title VARCHAR(500),
    content TEXT,
    -- ... other columns
);
CREATE INDEX idx_notes_tenant_id ON notes(tenant_id);
```

All queries will automatically filter by `tenant_id` using middleware and TypeORM:
```typescript
// Automatic tenant filtering
repository.find({ where: { tenant_id: currentTenantId } });
```

## Alternatives Considered

### Option 1: Schema-per-tenant from Day 1
- **Pros:**
  - Stronger data isolation
  - Per-tenant backups and restores
  - Compliance-friendly (GDPR, HIPAA)
- **Cons:**
  - Higher complexity (26 weeks vs 18-20 weeks)
  - Steeper learning curve
  - More complex migrations and operations
  - Premature optimization without customer demand

### Option 2: Database-per-tenant
- **Pros:**
  - Complete isolation
  - Independent scaling per tenant
- **Cons:**
  - Extremely high complexity
  - Connection pool management nightmare
  - Cost prohibitive at scale

## Consequences

### Positive
- **Faster time-to-market**: 18-20 week timeline vs 26 weeks with schema-per-tenant
- **Lower cognitive load**: Team learns microservices fundamentals first, then adds multi-tenancy complexity later
- **Simpler operations**: Single schema to maintain, simpler migrations
- **Cost-effective**: No per-tenant infrastructure overhead
- **Proven pattern**: Industry-standard approach used by successful SaaS platforms

### Negative
- **Tenant isolation risk**: Bugs in tenant filtering could leak data across tenants (mitigated by comprehensive testing)
- **Enterprise tier delayed**: Dedicated schema option deferred to Phase 3+ when customer demand exists
- **Query performance**: Large tables require proper indexing on `tenant_id` (mitigated by database optimization)

### Neutral
- **Migration path exists**: Can upgrade specific tenants to dedicated schemas in future phases without rewriting entire platform
- **Hybrid architecture possible**: Can support both shared and dedicated schemas simultaneously (connection routing layer)

## Implementation Notes

1. **Middleware for tenant context:**
```typescript
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const user = req.user;  // From JWT
    if (user && user.tenantId) {
      req.tenantId = user.tenantId;
    } else {
      throw new UnauthorizedException('Tenant context missing');
    }
    next();
  }
}
```

2. **Automatic tenant filtering in services:**
```typescript
async findAll(tenantId: string): Promise<Note[]> {
  return this.notesRepo.find({
    where: { tenant_id: tenantId }
  });
}
```

3. **Testing strategy:**
- Create comprehensive test suite for cross-tenant isolation
- Simulate Tenant A creating data, verify Tenant B cannot access
- Automated security tests in CI/CD pipeline

4. **Future migration path:**
- When enterprise customer requires dedicated schema:
  - Create new schema for tenant
  - Copy data from shared schema to dedicated schema
  - Update tenant metadata to mark as "dedicated"
  - Route connections based on tenant type (shared vs dedicated)

## References

- [Project Brief](../brief.md) - Section on Multi-Tenancy Implementation
- [Brainstorming Session Results](../brainstorming-session-results.md) - Multi-tenancy decision rationale
- [Multi-Tenant SaaS Architecture on AWS](https://aws.amazon.com/partners/saas-factory/)
- [TypeORM Multi-Tenancy Patterns](https://typeorm.io/)
