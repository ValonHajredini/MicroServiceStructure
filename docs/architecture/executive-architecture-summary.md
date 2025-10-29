# Executive Architecture Summary

## Architecture Principles

1. **Database-per-Service Isolation** - Each microservice owns its data
2. **Shared-Schema Multi-Tenancy** - `tenant_id` filtering for simplicity (Phase 1)
3. **JWT-Based SSO** - Single authentication across all services
4. **API-First Design** - OpenAPI/Swagger documentation from day 1
5. **Progressive Complexity** - Start simple, add features incrementally

## Key Architectural Decisions

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
