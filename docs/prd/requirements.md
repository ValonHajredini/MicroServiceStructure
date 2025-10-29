# Requirements

## Functional Requirements

**FR1:** System shall support self-service tenant registration where first user creates organization and admin account

**FR2:** Users shall authenticate via email/password at mydomain.com and receive JWT token containing userId, tenantId, roles, and enabledServices claims

**FR3:** JWT tokens shall be valid across all service subdomains (notes.mydomain.com, kanban.mydomain.com) for single sign-on experience

**FR4:** All database tables across all services shall include tenant_id column with automatic filtering via TypeORM global scopes

**FR5:** Tenant admins shall invite new users via email with signup links containing tenant context

**FR6:** Users shall search for tenants by organization name and request to join (requiring admin approval)

**FR7:** Dashboard at mydomain.com shall display service cards showing Available/Locked status based on tenant's enabled services

**FR8:** Tenants shall have configurable service enablement (ability to activate/deactivate Notes, Kanban, Form Builder per tenant)

**FR9:** Notes Service shall provide CRUD operations for notes with title, rich text content, and tenant/user scoping

**FR10:** Notes Service shall support file attachments up to 25MB per file, 100MB total per note via DigitalOcean Spaces

**FR11:** Notes shall support folder/category organization, full-text search, and date/owner filtering

**FR12:** Kanban Service shall provide board management with CRUD operations scoped to tenant

**FR13:** Kanban boards shall contain customizable columns with drag-and-drop task movement between columns

**FR14:** Kanban tasks shall support assignment to team members, due dates, priority levels, and comments

**FR15:** Core Service shall provide file upload service generating presigned URLs for secure client-side uploads to DigitalOcean Spaces

**FR16:** System shall implement soft delete for notes with 30-day recovery window

**FR17:** Users shall have role-based permissions (admin vs. user) with admins having tenant management capabilities

**FR18:** Password reset flow shall use email-based tokens for secure credential recovery

**FR19:** Angular applications shall autosave note content every 30 seconds

**FR20:** System shall provide health check endpoints (/health, /ready) for each microservice

## Non-Functional Requirements

**NFR1:** API response time shall be <200ms p95 for CRUD operations within single service

**NFR2:** Platform uptime shall be 99%+ measured monthly (allows ~7 hours downtime/month for maintenance)

**NFR3:** All services shall use NestJS framework with TypeScript for type safety and consistency

**NFR4:** Frontend shall use Angular 20 with standalone components and Signals for state management

**NFR5:** UI shall use PrimeNG components with Tailwind CSS for responsive design across desktop/mobile

**NFR6:** All inter-service authentication shall use JWT with HS256 or RS256 signing

**NFR7:** Passwords shall be hashed using bcrypt with minimum 10 salt rounds

**NFR8:** All database operations shall use TypeORM with parameterized queries preventing SQL injection

**NFR9:** Angular applications shall implement XSS prevention via built-in sanitization and Content Security Policy headers

**NFR10:** Each microservice shall have dedicated PostgreSQL 14+ database following database-per-service pattern

**NFR11:** Codebase shall use monorepo structure (Nx, Turborepo, or Yarn Workspaces) containing all services

**NFR12:** All API endpoints shall be documented using @nestjs/swagger with OpenAPI 3.0 specifications

**NFR13:** Production deployment shall use Docker containers with Docker Compose orchestration

**NFR14:** File storage shall use DigitalOcean Spaces with tenant-scoped folder structure: `bucket/{tenant_id}/{service}/{file_id}`

**NFR15:** JWT tokens shall expire after 24 hours requiring re-authentication

**NFR16:** HTTPS with TLS 1.2+ shall be enforced for all service communication

**NFR17:** CORS configuration shall whitelist service subdomains (notes.*, kanban.*, form-builder.*)

**NFR18:** Database queries shall use connection pooling optimized for multi-tenant workloads

**NFR19:** Real-time Kanban board updates shall be reflected within 5 seconds using WebSocket or polling strategy

**NFR20:** CI/CD pipeline shall use GitHub Actions with automated testing on pull requests

---
