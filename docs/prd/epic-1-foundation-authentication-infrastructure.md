# Epic 1: Foundation & Authentication Infrastructure

**Epic Goal:** Establish Turborepo monorepo structure, validate JWT SSO and tenant scoping patterns through POCs, implement core authentication service, and deliver basic tenant management with health-check endpoint demonstrating deployable infrastructure. This epic provides the secure multi-tenant foundation enabling all subsequent microservices development.

## Story 1.1: Initialize Turborepo Monorepo Structure

**As a** developer,
**I want** a Turborepo monorepo with workspace structure for all services,
**so that** we have consistent build tooling and can share code across microservices.

**Acceptance Criteria:**
1. Turborepo installed and configured with turbo.json defining pipeline tasks
2. Workspace structure created: apps/ (for services), libs/ (for shared code), docker/ (for containers)
3. Package.json workspaces configured for apps/core-api, apps/core-ui as initial services
4. Shared libs/shared-types workspace created for common TypeScript interfaces/DTOs
5. Turbo build, dev, test, and lint scripts working for all workspaces
6. .gitignore properly configured excluding node_modules and build artifacts
7. README.md documents monorepo structure and common commands

## Story 1.2: POC - JWT SSO Pattern Validation

**As a** developer,
**I want** to validate JWT-based single sign-on across multiple services,
**so that** we prove the authentication pattern before building full platform.

**Acceptance Criteria:**
1. Minimal NestJS auth-service issues JWT tokens containing userId, tenantId, roles claims
2. Minimal NestJS resource-service validates JWT and extracts tenant context
3. Basic Angular app demonstrates: login → receive token → access both services with same token
4. JWT signing uses chosen strategy (HS256 or RS256) decided during POC
5. Token validation middleware implemented in resource-service protecting endpoints
6. POC documented in docs/pocs/jwt-sso-pattern.md with code examples
7. Decision recorded: HS256 vs RS256 choice with rationale in ADR-001

## Story 1.3: POC - TypeORM Tenant Scoping Validation

**As a** developer,
**I want** to prove TypeORM global scopes prevent cross-tenant data access,
**so that** we validate tenant isolation security before building real services.

**Acceptance Criteria:**
1. Simple NestJS CRUD app with PostgreSQL database and TypeORM
2. Entity has tenant_id column with global scope automatically filtering queries
3. Middleware extracts tenant from JWT and sets AsyncLocalStorage context
4. Test creates data for Tenant A, verifies Tenant B cannot read/update/delete it
5. Test verifies queries automatically include WHERE tenant_id = ? clause
6. POC documented in docs/pocs/tenant-scoping-pattern.md with security test results
7. Pattern codified in libs/auth-utils for reuse across all services

## Story 1.4: Core Authentication Service - User Registration & Login

**As a** new user,
**I want** to register with email/password and login to receive JWT token,
**so that** I can access the platform securely.

**Acceptance Criteria:**
1. POST /auth/register endpoint accepts email, password, firstName, lastName
2. Passwords hashed using bcrypt with 10 salt rounds before storage
3. User record created in core_db.users table with tenant_id (auto-created for first user)
4. Email validation prevents duplicate registrations
5. POST /auth/login endpoint validates credentials and returns JWT token
6. JWT includes claims: userId, tenantId, roles: ['user'], enabledServices: []
7. Token expiration set to 24 hours
8. Basic error handling: invalid credentials, duplicate email, weak password

## Story 1.5: Core Authentication Service - Password Reset Flow

**As a** user who forgot password,
**I want** to request password reset via email,
**so that** I can regain access to my account.

**Acceptance Criteria:**
1. POST /auth/forgot-password endpoint accepts email, generates reset token
2. Reset token stored in database with 1-hour expiration
3. Email sent to user with reset link containing token (email service integrated)
4. POST /auth/reset-password endpoint validates token and updates password
5. Token invalidated after successful password reset
6. Expired tokens rejected with appropriate error message
7. Security: Reset tokens use cryptographically secure random generation

## Story 1.6: Basic Tenant Management

**As a** first user registering,
**I want** a tenant organization automatically created,
**so that** I have a workspace for my team.

**Acceptance Criteria:**
1. Tenant record created automatically during first user registration
2. Tenant table includes: id (UUID), name (from user's email domain or prompt), created_at
3. First user assigned 'admin' role for the tenant
4. Tenant has default enabled_services: [] (empty, to be configured later)
5. GET /tenants/:id endpoint returns tenant details (admin only)
6. PATCH /tenants/:id endpoint allows admin to update tenant name
7. User-tenant relationship tracked in user_tenant_roles table

## Story 1.7: Health Check Endpoints & Basic Deployment

**As a** DevOps engineer,
**I want** health check endpoints for monitoring service availability,
**so that** we can verify deployments and monitor uptime.

**Acceptance Criteria:**
1. GET /health endpoint returns 200 OK with basic status message
2. GET /ready endpoint checks database connectivity and returns 200 or 503
3. Dockerfile created for core-api with multi-stage build optimizing image size
4. Docker Compose configuration runs core-api + PostgreSQL locally
5. Service starts successfully and responds to health checks
6. Environment variables configured for database connection, JWT secret
7. Local deployment documented in docs/deployment/local-setup.md

---
