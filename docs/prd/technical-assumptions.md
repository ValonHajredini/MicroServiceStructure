# Technical Assumptions

## Repository Structure: Monorepo

**Decision:** Single monorepo using **Turborepo** containing all services (Core, Notes, Kanban, Form Builder)

**Rationale:**
- Turborepo provides simpler setup than Nx with excellent caching and task orchestration
- Simplifies code sharing for common types, DTOs, and utility functions across services
- Atomic commits allow simultaneous updates to multiple services maintaining consistency
- Reduces dependency management complexity vs. polyrepo approach
- Team learning curve: easier to navigate single repo during microservices mastery phase

**Trade-offs:**
- Monorepo can grow large over time, but manageable with 3-4 services in Phase 1
- CI/CD leverages Turborepo's smart caching to avoid rebuilding unchanged services
- Chosen over polyrepo which would complicate shared type definitions and versioning

## Service Architecture

**CRITICAL DECISION:** Database-per-Service Microservices with Shared-Schema Multi-Tenancy

**Service Breakdown:**
- **Core Service:** Authentication, tenant management, user management, file upload orchestration
- **Notes Service:** Note CRUD, attachments, folders, search
- **Kanban Service:** Boards, columns, tasks, real-time updates
- **Form Builder Service:** (Phase 2) Form creation, responses, analytics

**Database Architecture:**
- Each service owns dedicated PostgreSQL database (core_db, notes_db, kanban_db, forms_db)
- All tables include `tenant_id` column for data isolation
- TypeORM global scopes enforce automatic tenant filtering at ORM level
- No shared database access between services—communication via REST APIs or events (Kafka in Phase 2)

**Rationale:**
- True microservices pattern enabling independent scaling and deployment per service
- Learning objective: team masters distributed database management
- Shared-schema (tenant_id) chosen over schema-per-tenant for Phase 1 simplicity
- Reduces timeline from 26 weeks to 18-20 weeks while preserving future enterprise tier option

**Trade-offs:**
- Cannot use SQL joins across services—must use API calls or event-driven patterns
- Increased operational complexity (3+ databases vs. 1) but manageable with managed PostgreSQL
- Chosen over monolithic single-database for long-term scalability and team learning goals

## Testing Requirements

**CRITICAL DECISION:** Pragmatic Testing Pyramid for Microservices

**Phase 1 Testing Strategy:**
- **Unit Tests:** Core business logic and utility functions (60% coverage target)
  - Service methods, data transformations, validation logic
  - Run fast (<5 seconds for full suite per service)
  - Tools: Jest for both NestJS and Angular

- **Integration Tests:** API endpoints with database interactions (30% coverage target)
  - Test controllers + services + database together
  - Use test database containers (Docker Testcontainers)
  - Validate tenant isolation in every integration test
  - Critical: Cross-tenant data leak prevention tests mandatory

- **E2E Tests:** Critical user journeys only (10% coverage target)
  - User registration → login → create note → logout flow
  - Kanban board creation and task movement
  - Tools: Playwright or Cypress (decide by Week 4)
  - Run in CI/CD before deployment to staging/production

**Manual Testing Considerations:**
- Developer-friendly scripts for local multi-tenant testing
- Seed scripts creating Tenant A and Tenant B with test data
- Convenience methods for switching JWT context between tenants during development

**Rationale:**
- Balanced approach: sufficient confidence without slowing development velocity
- Unit tests catch regressions quickly; integration tests validate tenant scoping; E2E tests protect critical paths
- 60/30/10 split appropriate for 18-20 week timeline with 3-developer mob programming team

**Trade-offs:**
- Not aiming for 80%+ coverage in Phase 1—prioritizing working software over test perfection
- E2E tests slower and more brittle, so minimal coverage acceptable
- Can expand test coverage in Phase 2 after core patterns proven

## Additional Technical Assumptions and Requests

**POC Phase (Weeks 1-2) Critical Validations:**
- **POC #1:** Validate JWT SSO pattern across two minimal NestJS services + Angular app
- **POC #2:** Prove TypeORM global scopes prevent cross-tenant data access
- **Decision by Week 2:** HS256 (shared secret) vs. RS256 (public/private key) for JWT signing

**Authentication & Authorization:**
- JWT stored in localStorage for Phase 1 (simpler than HttpOnly cookies)
- Token expiration: 24 hours, no refresh token strategy in MVP
- Each service validates JWT independently using shared secret or public key
- CORS configured to whitelist service subdomains: `*.mydomain.com`

**File Storage:**
- DigitalOcean Spaces (S3-compatible) for all file uploads
- Core Service generates presigned URLs for secure client-side uploads
- Folder structure: `bucket/{tenant_id}/{service}/{file_id}`
- File size limits: 25MB per file, enforced at API and client level

**Email Service:**
- **Decision by Week 5:** SendGrid vs. AWS SES vs. Mailgun
- Transactional emails: registration confirmation, password reset, user invitations
- No marketing emails in Phase 1

**Real-Time Strategy:**
- **Decision by Week 12:** WebSocket vs. Server-Sent Events vs. Polling for Kanban board updates
- Requirement: Board changes reflected within 5 seconds across clients
- Polling acceptable for Phase 1 if simpler; WebSocket optimization in Phase 2 if needed

**Deployment & Infrastructure:**
- **Host:** DigitalOcean (preferred) or AWS
- **Compute:** Docker Compose for Phase 1; Kubernetes deferred to Phase 2+
- **Databases:** Managed PostgreSQL 14+ (one per service)
- **CI/CD:** GitHub Actions with Turborepo caching for optimized builds
- **Decision by Week 15:** DigitalOcean Droplets vs. App Platform vs. manual Kubernetes

**API Documentation:**
- @nestjs/swagger on all endpoints from day 1
- Basic decorators during Phase 1 (ApiTags, ApiOperation, ApiResponse)
- Comprehensive polish during Phase 2 API Documentation Phase (Weeks 19-22)

**Logging & Monitoring:**
- Console logs to stdout in Phase 1 (Docker captures)
- Health check endpoints required: /health (liveness), /ready (readiness)
- Advanced monitoring (APM, error tracking) deferred to Phase 2

**Security Assumptions:**
- HTTPS enforced for all traffic (TLS 1.2+)
- SQL injection prevention via TypeORM parameterized queries
- XSS prevention via Angular sanitization + Content Security Policy headers
- CSRF protection for state-changing operations
- Penetration testing before public launch

**Phase 2 Additions (Documented for Future Reference):**
- Kafka or NATS for event-driven architecture (Form Builder → Kanban integration)
- Redis for caching and session management
- Advanced API documentation with SDK generation
- Admin Dashboard service for tenant monitoring

---
