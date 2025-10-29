# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the MicroServiceStructure project.

## What are ADRs?

Architecture Decision Records document important architectural decisions made during the project, including:
- The context of the decision
- The decision itself
- The consequences of the decision

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR-001-shared-schema-multi-tenancy.md) | Shared-Schema Multi-Tenancy (Phase 1) | Accepted | 2025-10-29 |
| [ADR-002](./ADR-002-database-per-service.md) | Database-per-Service Pattern | Accepted | 2025-10-29 |
| [ADR-003](./ADR-003-jwt-authentication.md) | JWT with HS256 Signing (Phase 1) | Accepted | 2025-10-29 |
| [ADR-004](./ADR-004-defer-kafka-redis.md) | Defer Kafka/Redis to Phase 2 | Accepted | 2025-10-29 |
| [ADR-005](./ADR-005-typeorm-multi-tenancy.md) | TypeORM for Multi-Tenancy | Accepted | 2025-10-29 |
| [ADR-006](./ADR-006-url-based-versioning.md) | URL-Based API Versioning | Accepted | 2025-10-29 |
| [ADR-007](./ADR-007-digitalocean-deployment.md) | DigitalOcean App Platform (Phase 1) | Accepted | 2025-10-29 |
| [ADR-008](./ADR-008-monorepo-structure.md) | Monorepo with Nx/Turborepo | Proposed | 2025-10-29 |

## ADR Template

```markdown
# ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** [Proposed | Accepted | Deprecated | Superseded]
**Decision Makers:** [Names/Roles]

## Context

[Describe the issue or problem that needs to be addressed]

## Decision

[Describe the decision that was made]

## Alternatives Considered

[List other options that were considered]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Trade-off 1]
- [Trade-off 2]

### Neutral
- [Impact 1]

## Implementation Notes

[Any specific implementation details or guidance]

## References

[Links to related documentation, discussions, or resources]
```

## Status Definitions

- **Proposed**: Decision is under consideration
- **Accepted**: Decision has been approved and is active
- **Deprecated**: Decision is no longer recommended but may still be in use
- **Superseded**: Decision has been replaced by a newer ADR
