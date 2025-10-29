# Architecture Decision Records

## ADR-001: Shared-Schema Multi-Tenancy (Phase 1)

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

## ADR-002: Database-per-Service Pattern

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

## ADR-003: JWT with HS256 Signing (Phase 1)

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

## ADR-004: Defer Kafka/Redis to Phase 2

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

## ADR-005: TypeORM for Multi-Tenancy

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

## ADR-006: URL-Based API Versioning

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

## ADR-007: DigitalOcean App Platform (Phase 1)

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

## ADR-008: Monorepo with Nx/Turborepo

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
