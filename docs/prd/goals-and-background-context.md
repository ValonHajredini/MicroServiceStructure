# Goals and Background Context

## Goals

- Launch a working multi-tenant SaaS platform within 18-20 weeks with Core, Notes, and Kanban services
- Enable team mastery of microservices architecture patterns through production implementation
- Achieve 50 paying tenants within 6-8 months post-launch to validate market demand
- Build foundation for migrating existing 90% complete Form Builder to microservices in Phase 2
- Establish modular service enablement model allowing tenants to selectively activate services
- Create API-first platform differentiating from consumer tools through programmatic access

## Background Context

MicroServiceStructure addresses a critical challenge facing development teams: building modern SaaS platforms while simultaneously learning microservices architecture. Traditional approaches force teams to choose between rapid development with simple patterns or enterprise-ready complexity from day one.

This project adopts a pragmatic hybrid approach—starting with shared-schema multi-tenancy (`tenant_id` filtering) to accelerate learning and time-to-market (18-20 weeks vs. 26 weeks with schema-per-tenant), while preserving future enterprise upgrade paths. The platform uses database-per-service pattern with service-based subdomains (notes.mydomain.com, kanban.mydomain.com) rather than tenant-based subdomains, simplifying DNS management and user experience. A 3-developer team will use mob programming to master NestJS microservices, TypeORM tenant scoping, and JWT-based SSO across distributed services.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|---------|
| 2025-10-29 | 1.0 | Initial PRD creation from Project Brief | PM Agent (John) |

---
