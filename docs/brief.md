# Project Brief: MicroServiceStructure

**Version:** 1.0
**Date:** 2025-10-29
**Status:** In Progress

---

## Executive Summary

**MicroServiceStructure** is a multi-tenant SaaS platform built on a microservices architecture, designed to provide enterprise-grade collaboration tools with flexible data isolation options. The platform offers modular services (Notes, Kanban, Form Builder) that can be selectively enabled per tenant, supporting both SMB and enterprise markets through a tiered architecture approach.

**Primary Problem:** Teams need to master microservices architecture while building a production-ready multi-tenant platform that can scale from initial customers to enterprise clients. Starting with complex schema-per-tenant isolation creates unnecessary risk and delays time-to-market, while purely shared-table architecture limits future enterprise opportunities.

**Target Market:** SMB to enterprise B2B SaaS customers requiring secure multi-tenant collaboration tools, with 50 tenants expected within 6-8 months. Initial focus on standard tier customers (shared schema with `tenant_id`), with enterprise tier (dedicated schema) available for clients requiring enhanced isolation.

**Key Value Proposition:** Pragmatic hybrid multi-tenancy architecture that balances speed-to-market (18-20 weeks) with enterprise scalability. Start simple with shared-schema approach to accelerate learning and customer acquisition, with clear upgrade path to dedicated schemas for premium enterprise clients—all built on modern NestJS/Angular stack with mob programming knowledge-sharing approach.

---

## Problem Statement

**Current State & Pain Points:**

Development teams face a critical dilemma when building modern SaaS platforms: choosing between rapid development with simple multi-tenancy, or building enterprise-ready architecture from day one at the cost of time, complexity, and learning curve.

**The core challenges:**

1. **Learning curve bottleneck** - 3-developer team experienced with monolithic applications needs to master microservices architecture (service boundaries, distributed auth, inter-service communication). Adding advanced multi-tenancy patterns (schema-per-tenant) simultaneously creates compounding complexity and high failure risk.

2. **Premature optimization trap** - Building schema-per-tenant isolation before validating market demand (signed enterprise contracts) invests 6-8 extra weeks solving hypothetical future problems instead of acquiring real customers.

3. **Monolithic technical debt** - Existing 90% complete Form Builder stuck in Express architecture cannot integrate with modern microservices platform. Team needs production experience with microservices before attempting migration of valuable asset.

4. **Time-to-market pressure** - Extended 26-week timeline (6.5 months) to accommodate schema-per-tenant complexity delays customer acquisition and revenue generation. Competitors with simpler architectures reach market faster.

5. **False binary choice** - Industry presents multi-tenancy as either/or decision (shared tables vs. dedicated schemas), ignoring hybrid approaches that optimize for both speed and future scalability.

**Impact (Quantified):**

- **Delayed revenue:** 6-8 week difference between simple (18-20 weeks) vs. complex (26 weeks) approach = 1.5-2 months delayed customer acquisition
- **Higher failure risk:** Learning microservices + advanced multi-tenancy simultaneously increases project abandonment risk by ~40% (based on team expertise gap)
- **Opportunity cost:** Time spent building schema-per-tenant POCs (2 weeks) + extra implementation complexity (6-8 weeks) = 8-10 weeks that could be spent on feature development or customer feedback iteration
- **Stranded asset:** Existing Form Builder investment remains unusable until team masters microservices fundamentals

**Why Existing Solutions Fall Short:**

- **"Start simple" approaches** (shared schema only) create painful migration paths when first enterprise client demands isolation (6-12 month rewrite risk, customer downtime)
- **"Enterprise-first" approaches** (schema-per-tenant from day one) over-engineer for hypothetical requirements, slowing learning and market validation
- **Off-the-shelf platforms** (AWS, Azure multi-tenancy patterns) assume team already understands microservices, don't address learning curve
- **Tutorial/course content** focuses on single approach, doesn't show pragmatic hybrid path

**Urgency & Importance:**

**Why now:**
- Team ready to commit 5-6 months to learning microservices through production implementation
- Form Builder asset needs modern architecture integration (revenue-generating opportunity)
- Market window for enterprise SaaS platform exists (50 potential customers identified)
- Delay risks: competitor platforms launching, team skill stagnation, Form Builder obsolescence

**Why hybrid approach:**
- Validates microservices fundamentals first (18-20 weeks to working platform)
- Preserves enterprise upgrade path (tier-based pricing model unlocks premium revenue)
- Reduces failure risk (master one complexity layer before adding second)
- Enables customer-driven architecture decisions (upgrade specific tenants based on real demand, not speculation)

---

## Proposed Solution

**MicroServiceStructure** implements a **pragmatic multi-tenant microservices architecture** using database-per-service pattern with shared-schema multi-tenancy, optimized for rapid development, team learning, and future enterprise scalability.

### Core Architecture

**Service-Based Domain Structure:**
```
mydomain.com                    → Core Service (landing page, auth, service catalog)
notes.mydomain.com              → Notes Service (note-taking with attachments)
kanban.mydomain.com             → Kanban Service (task boards and todos)
form-builder.mydomain.com       → Form Builder Service (forms and responses)
admin.mydomain.com              → Admin Dashboard (tenant management, monitoring)
```

**Key Concept: Single Domain, Multiple Services**
- All tenants share the same service domains (no per-tenant subdomains like `tenant-a.mydomain.com`)
- Users authenticate once at `mydomain.com`, receive JWT token with `tenant_id` claim
- Navigate to any service subdomain → automatically scoped to their tenant via JWT
- Clean user experience: users remember service URLs, not tenant-specific domains

**Database Architecture: Database-per-Service + Shared Schema**
```
┌─────────────────────────────────────────────────┐
│ Core Service (mydomain.com)                     │
│ Database: core_db                                │
│ Tables:                                          │
│   - users (tenant_id, email, password_hash)      │
│   - tenants (id, name, enabled_services)         │
│   - user_tenant_roles (tenant_id, user_id, role) │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Notes Service (notes.mydomain.com)              │
│ Database: notes_db                               │
│ Tables:                                          │
│   - notes (tenant_id, title, content, user_id)   │
│   - attachments (tenant_id, note_id, file_url)   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Kanban Service (kanban.mydomain.com)            │
│ Database: kanban_db                              │
│ Tables:                                          │
│   - boards (tenant_id, name, user_id)            │
│   - columns (tenant_id, board_id, title)         │
│   - todos (tenant_id, column_id, title, status)  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Form Builder Service (form-builder.mydomain.com)│
│ Database: forms_db                               │
│ Tables:                                          │
│   - forms (tenant_id, name, schema_json)         │
│   - form_responses (tenant_id, form_id, data)    │
└─────────────────────────────────────────────────┘
```

**Multi-Tenancy Implementation:**
- **Shared schema with `tenant_id` filtering** in every table across all services (no schema-per-tenant complexity)
- **Automatic tenant scoping** via TypeORM global scopes and NestJS middleware
- **JWT-based tenant context** - Token contains `tenant_id`, services extract and filter
- **Token storage** - localStorage + Authorization header (simple, debuggable, standard REST approach)
- **Cross-origin support** - CORS configured to allow service subdomains to communicate with auth endpoints

### Tenant Onboarding Flow (Self-Service Registration)

**New Tenant Registration:**
```
1. User visits mydomain.com landing page
2. Explores service landing pages (e.g., form-builder.mydomain.com)
   - Can try limited demo/preview without registration
   - Cannot publish/save work without account
3. Clicks "Sign Up" (can choose which service to start with)
4. Registration form:
   - Company/Organization name → Creates new tenant
   - User email + password → Creates first admin user
   - Select initial services to enable (Notes, Kanban, Form Builder)
5. System creates:
   - Tenant record with unique tenant_id
   - First user account with "admin" role
   - Enabled services configuration
6. User redirected to dashboard at mydomain.com
```

**Adding Users to Existing Tenant:**
```
Option A: Invitation by Tenant Admin
- Admin invites users via email → Send invite link with tenant_id
- Invited user registers → Automatically joins tenant
- Admin can manage user roles and permissions

Option B: User-Initiated Join Request
- New user searches for tenant/organization by name
- Finds tenant → Requests to join
- Tenant admin receives notification → Accepts/rejects request
- Approved user gains access with assigned role
```

### Service Discovery & Access Control

**Dashboard Experience (mydomain.com after login):**
```
┌──────────────────────────────────────────────────────┐
│  Welcome, User Name (Company X)                      │
├──────────────────────────────────────────────────────┤
│  Your Services:                                      │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Notes     │  │   Kanban    │  │ Form Builder│ │
│  │  Available  │  │  Available  │  │   Locked    │ │
│  │   [Open]    │  │   [Open]    │  │ [Request]   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                      │
│  [Manage Team] [Settings] [Request More Services]   │
└──────────────────────────────────────────────────────┘

Flow:
- Click "Open" on available service → Redirects to service subdomain
- Click "Request" on locked service → Opens request form for admin approval
- Services shown/hidden based on JWT `enabledServices` claim
```

### Authentication & Authorization Flow

**Login & Token Management:**
```
1. User visits mydomain.com → Sees landing page
2. User clicks "Login" → Enters credentials (email + password)
3. Core Service validates → Issues JWT with claims:
   {
     userId: "uuid",
     tenantId: "abc-123",
     email: "user@company.com",
     roles: ["admin"], // or ["user"]
     enabledServices: ["notes", "kanban"] // Form Builder not enabled
   }
4. Frontend stores JWT in localStorage
5. User sees dashboard with available services

Service Access:
6. User clicks "Notes" → Frontend redirects to notes.mydomain.com
7. Angular app loads → Retrieves JWT from localStorage
8. Every API call includes header: Authorization: Bearer <token>
9. Notes Service validates JWT → Extracts tenantId → Filters queries by tenant_id
10. User navigates to kanban.mydomain.com → Same flow repeats
```

**Security Notes:**
- **JWT stored in localStorage** (not HttpOnly cookies) for simplicity in Phase 1
  - Trade-off: Vulnerable to XSS attacks, but simpler to implement and debug
  - Mitigation: Angular sanitization, Content Security Policy headers
  - Future: Can migrate to HttpOnly cookies in Phase 2+ if security audit requires
- **Each service validates JWT independently** (shared secret or public key verification)
- **Token expiration:** 24 hours (configurable)
- **Refresh token strategy:** Optional for Phase 2 (MVP uses simple re-login flow)
- **CORS configuration:** Whitelist service subdomains (notes.*, kanban.*, form-builder.*)

**Phase 1 (MVP - Months 1-5): Core Platform**
- **Weeks 1-2:** POC validation (JWT SSO patterns, TypeORM tenant scoping)
- **Weeks 3-7:** Core Service (auth, tenant management, service enablement)
- **Weeks 8-11:** Notes Service (CRUD, file attachments via DigitalOcean Spaces)
- **Weeks 12-16:** Kanban Service (boards, columns, todos)
- **Weeks 17-18:** Deployment, polish, bug fixes
- **Architecture:** Database-per-service + shared-schema multi-tenancy (`tenant_id` only)
- **Outcome:** Working platform with 3 services, ready for customer acquisition

**Phase 2 (Form Builder Integration - Month 6+):**
- **Primary Goal:** Migrate existing 90% complete Express Form Builder to NestJS microservice
- **Timeline:** Weeks 19-26+ (estimate 8-12 weeks)
- **Prerequisites:** Team has proven microservices patterns from Phase 1
- **Approach:** Apply learned patterns to valuable existing asset
- **Architecture:** Continue using shared schema with `tenant_id` (no schema-per-tenant unless customer demands it)
- **Additional Features:**
  - Kafka integration for Form Builder → Kanban event flow (form submission creates tasks)
  - Redis caching if performance testing reveals need
  - Advanced API documentation phase (Swagger polish, SDK generation)

**Phase 3+ (Future Vision - Optional):**
- **Enterprise Tier with Dedicated Databases:** Only build if real customers require compliance isolation
- **Pricing Strategy:** Standard tier (shared schema) vs. Enterprise tier (dedicated database) at 3-5x premium
- **Decision Point:** Customer-driven, not speculation-driven
- **Important:** MVP does NOT include enterprise tier - this is optional future enhancement

### Key Differentiators

1. **Service-based subdomains, not tenant-based** - Simpler DNS, easier user experience (users navigate by service, not tenant identifier)

2. **Database-per-service pattern** - True microservices architecture where each service owns its data, enabling independent scaling and deployment

3. **Learning-first approach** - Team masters microservices fundamentals (service boundaries, JWT SSO, distributed databases) with simple `tenant_id` pattern before tackling advanced enterprise isolation

4. **Modular service enablement** - Tenants can have different services enabled (e.g., Tenant A gets Notes only, Tenant B gets Notes + Kanban + Form Builder)

5. **Future-proof hybrid architecture** - Phase 1 uses shared schema for speed; Phase 2 adds enterprise tier with dedicated databases when real demand exists

**Why This Solution Succeeds Where Others Haven't:**

- **Avoids subdomain complexity** - No wildcard DNS configuration, no tenant detection from URL, simpler deployment
- **Standard microservices pattern** - Database-per-service is industry best practice, easier for team to learn from existing resources
- **Reduces cognitive load** - Team learns one complexity layer at a time (microservices + simple multi-tenancy first, then optional enterprise features)
- **Clean JWT architecture** - Single token works across all services, no complex session management
- **Enables experimentation** - Faster MVP timeline (18-20 weeks) allows real-world validation before committing to complex patterns

**High-Level Vision:**

Transform from monolithic Express applications to production-ready microservices platform in **18-20 weeks** (Phase 1: Core + Notes + Kanban), where each service owns its database and tenants are isolated via JWT-based `tenant_id` filtering. Enable 3-developer team to master modern architecture patterns through real implementation. Phase 2 migrates existing 90% complete Form Builder to proven microservices patterns, protecting valuable asset while building sustainable competitive advantage through API-first, multi-service architecture. Enterprise tier (dedicated databases) remains optional future enhancement, only built when real customer demand justifies complexity.

---

## Target Users

### Primary User Segment: Development Teams & Small-to-Medium Organizations

**Profile:**
- **Organization Type:** Small-to-medium businesses (5-50 employees), startups, development agencies, consulting firms
- **Decision Makers:** Technical founders, CTOs, team leads, project managers
- **Team Size:** 3-50 users per tenant organization
- **Technical Sophistication:** Comfortable with SaaS tools, API integrations; value modern UX and reliability

**Current Behaviors & Workflows:**
- Use multiple disconnected tools for collaboration (Google Docs for notes, Trello/Asana for tasks, Google Forms/Typeform for data collection)
- Struggle with context switching across 5-10 different platforms
- Manually copy/paste data between tools (e.g., form responses → task board)
- Pay $50-500/month across multiple SaaS subscriptions
- Want integrated platform but hesitant about enterprise-price solutions ($10K+/year)

**Specific Needs & Pain Points:**
- **Need:** Single platform for notes, task management, and form/survey creation
- **Pain:** Context switching wastes 30-60 minutes/day per team member
- **Need:** Ability to enable/disable services per use case (e.g., only need Notes + Forms, not Kanban)
- **Pain:** Paying for unused features in all-in-one tools (e.g., Notion databases when only using docs)
- **Need:** API access for custom integrations and automation
- **Pain:** Consumer tools lack APIs; enterprise tools too expensive just for API access

**Goals They're Trying to Achieve:**
- Consolidate collaboration tools to reduce subscription costs (target: <$200/month for 10-20 users)
- Improve team productivity through integrated workflows (form submission → auto-create task)
- Maintain flexibility to adopt only needed services (pay for what you use model)
- Build custom automations via API without enterprise sales process

**Why They'll Choose This Platform:**
- **Modular pricing:** Pay only for enabled services, not forced bundle
- **API-first design:** Swagger documentation + programmatic access from day 1
- **Modern UX:** Angular 20 + PrimeNG = familiar, fast, responsive interface
- **Self-service:** Sign up and start using in <5 minutes, no sales call required

---

### Secondary User Segment: Development Teams Learning Microservices

**Profile:**
- **Organization Type:** Development agencies, consultancies, in-house dev teams exploring microservices
- **Decision Makers:** Senior developers, architects, engineering managers
- **Team Size:** 2-5 developers actively learning/building
- **Technical Sophistication:** Experienced with monoliths, learning distributed systems

**Current Behaviors & Workflows:**
- Building internal tools or client projects using traditional monolithic architectures
- Reading documentation/tutorials about microservices but lacking production experience
- Hesitant to apply microservices to revenue-critical projects without hands-on learning
- Looking for reference implementations and real-world patterns

**Specific Needs & Pain Points:**
- **Need:** Production-quality reference implementation to learn from
- **Pain:** Tutorial code is oversimplified; doesn't address real challenges (multi-tenancy, auth, deployment)
- **Need:** See working example of database-per-service with shared tenant_id pattern
- **Pain:** Most examples show schema-per-tenant (too complex) or ignore multi-tenancy entirely
- **Need:** Understand JWT SSO across multiple services
- **Pain:** Authentication tutorials focus on single-app scenarios

**Goals They're Trying to Achieve:**
- Master microservices fundamentals through studying production code
- Validate architecture patterns before applying to client projects
- Build confidence in distributed systems before career-critical implementations
- Understand trade-offs (when to use microservices, when monolith is better)

**Why They'll Choose This Platform:**
- **Open architecture:** Clear documentation of design decisions and trade-offs
- **Learning-first approach:** Explicitly designed for team mastery, not just delivery
- **Realistic scope:** Handles real problems (multi-tenancy, auth, file storage) without over-engineering
- **Phase-based progression:** Start simple (tenant_id), optionally add complexity (dedicated DBs) when needed

---

## Goals & Success Metrics

### Business Objectives

- **Launch working platform within 18-20 weeks (Phase 1: Core + Notes + Kanban)** to begin customer acquisition and revenue generation
  - Metric: Platform deployed and accepting tenant registrations by Week 18
  - Target: 5-10 pilot tenants onboarded within 4 weeks of launch

- **Acquire 50 paying tenants within 6-8 months post-launch** to validate market demand and achieve initial revenue target
  - Metric: Active tenants with at least 1 enabled service
  - Target: $5K-15K MRR (Monthly Recurring Revenue) at 6-month mark

- **Migrate Form Builder to microservices architecture within 10-12 weeks of Phase 2 start** to unlock revenue potential of existing asset
  - Metric: Form Builder service operational on microservices platform
  - Target: 80% of existing Form Builder users migrated successfully

- **Achieve 70%+ team proficiency in microservices patterns** measured by ability to implement new services independently
  - Metric: Team self-assessment + code review quality scores
  - Target: Team can implement new microservice (e.g., Calendar, Chat) in 3-4 weeks without external help

### User Success Metrics

- **Time-to-value <10 minutes:** New tenant can register, create first note/board, and invite team member within 10 minutes
  - Metric: Time from landing page visit to first productive action (note created, task added)
  - Target: 80% of tenants complete onboarding successfully

- **Daily active usage:** Tenants return to platform daily for core workflows
  - Metric: DAU (Daily Active Users) / MAU (Monthly Active Users) ratio
  - Target: 40%+ DAU/MAU ratio (indicates sticky, habitual usage)

- **Cross-service adoption:** Tenants enable and use multiple services (not just one)
  - Metric: Average services enabled per tenant
  - Target: 2.5+ services per tenant (e.g., Notes + Kanban + Form Builder)

- **API integration adoption:** Tenants build custom workflows using API
  - Metric: % of tenants making at least 1 API call per week
  - Target: 30%+ of tenants using API within 3 months of registration

### Key Performance Indicators (KPIs)

- **Platform Uptime: 99%+ availability** measured monthly (allows ~7 hours downtime/month for maintenance)
  - Definition: Percentage of time all services (Core, Notes, Kanban) are accessible
  - Monitoring: Health check endpoints, uptime tracking service
  - Target: 99.0% in Phase 1, improve to 99.5% in Phase 2

- **API Response Time: <200ms p95** (95th percentile) for CRUD operations within single service
  - Definition: Time from API request received to response sent (excluding network latency)
  - Monitoring: Per-service APM (Application Performance Monitoring)
  - Target: Core/Notes/Kanban APIs respond in <200ms for 95% of requests

- **Customer Acquisition Cost (CAC): <$500 per tenant** through self-service channels
  - Definition: Total marketing + sales spend / number of new paying tenants
  - Target: Organic growth (content, SEO, developer community) keeps CAC low
  - Acceptable: $200-500 CAC if customer LTV (Lifetime Value) >$2K

- **Service Enablement Rate: 60%+ of tenants enable 2+ services** within first month
  - Definition: % of tenants who activate multiple services vs. staying single-service
  - Target: Demonstrates platform value beyond single use case
  - Tracking: JWT `enabledServices` claim analysis

- **API Documentation Usage: 50%+ of tenants view Swagger docs** within first 90 days
  - Definition: % of tenants who access interactive Swagger UI for any service
  - Target: Indicates developer interest and potential API integration activity
  - Tracking: Swagger UI page views by tenant_id

- **Team Learning Velocity: 2-3 weeks per new microservice** after Phase 1 completion
  - Definition: Time required to implement new service from scratch (auth + CRUD + deployment)
  - Target: By end of Phase 1, team can add new services independently in 2-3 week sprints
  - Tracking: Velocity measurement for hypothetical Calendar or Chat service implementation

---

## MVP Scope

### Core Features (Must Have - Phase 1: Weeks 1-18)

**Week 1-2: POC Phase (De-Risk High-Complexity Areas)**
- **POC #1: JWT SSO Pattern**
  - Minimal NestJS app issuing JWT tokens with tenant_id claim
  - Second NestJS app validating tokens and filtering by tenant
  - Angular app demonstrating single login → access both services
  - **Rationale:** Prove distributed auth pattern works before building full platform

- **POC #2: TypeORM Tenant Scoping**
  - Simple CRUD app with tenant_id column in all tables
  - Global scopes/middleware automatically filtering by tenant
  - Test: Create data for Tenant A, verify Tenant B cannot access
  - **Rationale:** Validate automatic tenant isolation prevents data leaks

**Week 3-7: Core Service** (mydomain.com)
- **Authentication & Authorization:**
  - User registration (email + password) with bcrypt hashing
  - Login endpoint issuing JWT with claims: userId, tenantId, roles, enabledServices
  - Password reset flow (email-based token)
  - Logout (client-side token removal)

- **Tenant Management:**
  - Self-service tenant registration (first user creates organization)
  - Tenant CRUD (name, enabled services configuration)
  - Tenant admin can invite users (email invitation with signup link)
  - User can search for tenant by name and request to join (admin approval required)

- **User Management:**
  - User CRUD scoped to tenant (admin can view/edit tenant users)
  - Role assignment: admin vs. user (basic RBAC)
  - User profile management (name, email, avatar)
  - Team member list view

- **Service Enablement:**
  - Database table storing which services each tenant has access to
  - API endpoint to enable/disable services per tenant
  - JWT includes `enabledServices` array (e.g., ["notes", "kanban"])
  - Dashboard showing service cards with Available/Locked states

- **Landing Page & Dashboard:**
  - Public landing page showcasing platform services
  - Post-login dashboard displaying available services with "Open" buttons
  - Service request form for locked services
  - Navigation to tenant settings and team management

- **File Upload Service (DigitalOcean Spaces):**
  - Presigned URL generation for secure uploads
  - Tenant-scoped folder structure (spaces://bucket/{tenant_id}/...)
  - File metadata storage (filename, size, type, uploaded_by)
  - **Rationale:** Notes Service needs attachments; build once, reuse pattern

**Week 8-11: Notes Service** (notes.mydomain.com)
- **Note CRUD Operations:**
  - Create note (title, content, tenant_id, user_id)
  - Read notes list (filtered by tenant_id automatically)
  - Update note (only owner or admin can edit)
  - Delete note (soft delete, can restore within 30 days)
  - Rich text editor (basic formatting: bold, italic, lists, links)

- **File Attachments:**
  - Upload files to DigitalOcean Spaces via Core file service
  - Attach multiple files to notes
  - Download/preview attachments
  - File size limit: 25MB per file, 100MB total per note

- **Organization & Search:**
  - Folder/category system for organizing notes
  - Full-text search across note titles and content
  - Filter by date created, last modified, owner
  - Pin important notes to top of list

- **Angular UI:**
  - Notes list view with sidebar navigation
  - Note editor with autosave every 30 seconds
  - Attachment management UI
  - Responsive design (works on mobile/tablet)

**Week 12-16: Kanban Service** (kanban.mydomain.com)
- **Board Management:**
  - Create board (name, description, tenant_id, owner_id)
  - List boards (filtered by tenant_id)
  - Update/delete boards
  - Board templates (e.g., "Sprint Planning", "Bug Tracker")

- **Column Management:**
  - Add columns to board (e.g., "To Do", "In Progress", "Done")
  - Reorder columns (drag-and-drop position)
  - Edit column names and limits (WIP limit)
  - Delete columns (move tasks to default column)

- **Todo/Task Management:**
  - Create task in column (title, description, assignee, due_date)
  - Move tasks between columns (drag-and-drop)
  - Assign tasks to team members
  - Due dates and priority levels (high, medium, low)
  - Task comments and activity log

- **Collaboration Features:**
  - Real-time updates when team members modify board (WebSocket or polling)
  - Task assignment notifications
  - Activity feed per board (who did what, when)

- **Angular UI:**
  - Kanban board view with drag-and-drop
  - Task detail modal/sidebar
  - Board list and quick switcher
  - Responsive layout (stacked columns on mobile)

**Week 17-18: Deployment & Polish**
- **Infrastructure Setup:**
  - Docker containers for each service (Core, Notes, Kanban)
  - Docker Compose for local development
  - Production deployment (DigitalOcean Droplets or App Platform)
  - PostgreSQL database per service (core_db, notes_db, kanban_db)
  - DigitalOcean Spaces configuration

- **Monitoring & Logging:**
  - Health check endpoints for each service (/health, /ready)
  - Basic logging (console logs to stdout, collected by Docker)
  - Error tracking (consider Sentry or similar in Phase 2)

- **API Documentation:**
  - Swagger/OpenAPI setup with @nestjs/swagger
  - Basic decorators for all endpoints (ApiTags, ApiOperation)
  - Interactive Swagger UI accessible per service
  - **Note:** Comprehensive polish happens in Phase 2 (Weeks 19-22)

- **Bug Fixes & UX Polish:**
  - Address issues found during testing
  - Performance optimization (database indexes, query optimization)
  - UI/UX improvements based on internal feedback
  - Security audit (SQL injection, XSS, CSRF checks)

---

### Out of Scope for MVP (Phase 1)

**Deferred to Phase 2 or Later:**
- **Form Builder Service:** Existing Express app migration deferred until team masters microservices (Week 19+)
- **Kafka/Redis:** Event-driven architecture and caching deferred until proven need
- **Advanced API Documentation:** Comprehensive Swagger polish, SDK generation (Weeks 19-22 of Phase 2)
- **Admin Dashboard:** Super admin UI for tenant monitoring and provisioning (Weeks 23-26 of Phase 2)
- **Dark Theme:** Light theme only in Phase 1; dark mode in Phase 2
- **Refresh Token Strategy:** Simple re-login flow in MVP; refresh tokens in Phase 2
- **Real-time Collaboration:** Advanced WebSocket features (live cursors, operational transforms) deferred
- **Mobile Apps:** Web-responsive only; native iOS/Android in future phases
- **Advanced Analytics:** Basic metrics only; comprehensive analytics dashboard later
- **Enterprise Tier:** Dedicated database architecture deferred until customer demand exists

**Explicitly Not Included:**
- **Single Sign-On (SSO) Providers:** No Google/Microsoft OAuth in MVP (email/password only)
- **Two-Factor Authentication (2FA):** Basic password auth only in Phase 1
- **Advanced RBAC:** Simple admin/user roles only; complex permissions in Phase 2
- **Audit Logging:** Basic activity logs only; comprehensive audit trail later
- **Data Export:** No bulk export features in MVP
- **API Rate Limiting:** Basic throttling only; advanced rate limits later
- **Multi-Language Support:** English only in Phase 1
- **White-Label/Custom Branding:** Standard branding only; custom domains/logos in enterprise tier

---

### MVP Success Criteria

**Technical Success:**
- All 3 services (Core, Notes, Kanban) deployed and operational
- JWT authentication working across all services
- Tenant isolation verified (no cross-tenant data leaks)
- 99%+ uptime during 2-week pilot period
- API response times <200ms p95

**User Success:**
- 5-10 pilot tenants successfully onboarded
- Each pilot tenant has created at least 1 note and 1 kanban board
- At least 2 pilot tenants enable multiple services (not just one)
- No critical bugs reported during pilot (severity: data loss, security breach)

**Team Success:**
- 3-developer team comfortable implementing additional microservices independently
- Documented architecture patterns ready for Form Builder migration
- Team velocity: 2-3 weeks estimated for new service implementation
- Knowledge shared across team (no single point of failure)

---

## Post-MVP Vision

### Phase 2 Features (Months 6-8)

**Form Builder Service Migration (Weeks 19-26+)**
- Migrate existing 90% complete Express application to NestJS microservice architecture
- Preserve all existing functionality:
  - Drag-and-drop form builder UI (questions, logic, branching)
  - Multiple question types (text, multiple choice, file upload, etc.)
  - Form responses storage and analytics
  - Public/private form sharing
- Apply proven patterns from Phase 1 (JWT auth, tenant_id filtering, database-per-service)
- Integration with Kanban Service via Kafka events (form submission → auto-create task)
- **Outcome:** Revenue-generating Form Builder protected and modernized

**Advanced API Documentation Phase (Weeks 19-22)**
- Comprehensive Swagger/OpenAPI polish for all services
- Detailed request/response examples for every endpoint
- API integration guides and best practices documentation
- Client SDK generation (TypeScript, Python, potentially others)
- Postman/Insomnia collection exports for easy testing
- Unified API portal linking all service Swagger UIs
- **Outcome:** Enterprise-ready API documentation attracting developer community

**Event-Driven Architecture (Kafka Integration)**
- Kafka broker setup for inter-service communication
- Event schemas and producers/consumers in NestJS
- Primary use case: Form Builder → Kanban task creation workflow
  - Form completion event → Kanban service creates follow-up task
  - Quiz submission → Auto-assign review task to team member
  - Sales form → Create "process order" task in CRM board
- **Outcome:** Services can communicate asynchronously without tight coupling

**Performance Optimization (Redis Caching)**
- Redis cache layer for frequently accessed data
- Use cases:
  - Kanban board cache (avoid DB query for every page load)
  - Form Builder response aggregation cache
  - User session cache for faster auth checks
- Cache invalidation strategies and TTL policies
- **Outcome:** Sub-100ms response times for cached operations

**Admin Dashboard (Weeks 23-26)**
- Super admin interface at admin.mydomain.com
- Tenant management: CRUD, search, filter, bulk operations
- Service assignment matrix (enable/disable services per tenant visually)
- Per-tenant monitoring: API call rates, storage usage, active users
- Automated tenant provisioning (one-click schema setup)
- System health dashboard (uptime, error rates, resource utilization)
- **Outcome:** Operational efficiency for managing 50+ tenants

---

### Long-Term Vision (6-18 Months)

**Additional Microservices**
- **Calendar Service:** Shared team calendars, event scheduling, integrations with Notes/Kanban
- **Chat/Messaging Service:** Real-time team communication, channels, direct messages
- **CRM Service:** Customer relationship management, sales pipelines (leveraging Kanban patterns)
- **Time Tracking Service:** Time logs, project budgeting, reporting
- **Analytics Service:** Cross-service reporting, custom dashboards, data export

**Enterprise Tier (Optional - Customer-Driven)**
- Dedicated database per tenant for compliance-sensitive customers
- Connection routing layer selecting shared vs. dedicated architecture
- Pricing: 3-5x premium over Standard tier
- SLA guarantees: 99.9% uptime, priority support, dedicated resources
- **Only build when:** Real customer contracts require compliance isolation

**Advanced Features**
- **Dark Theme:** Complete theme system with light/dark toggle, user preference persistence
- **SSO Providers:** Google, Microsoft, GitHub OAuth integration
- **Two-Factor Authentication:** SMS, authenticator app, backup codes
- **Advanced RBAC:** Custom roles, fine-grained permissions, resource-level access control
- **Audit Logging:** Comprehensive activity trail for compliance (who did what, when)
- **Mobile Apps:** Native iOS/Android apps using React Native or Flutter
- **Multi-Language Support:** i18n framework, community translations
- **White-Label:** Custom domains, branding, logo replacement for enterprise customers

**Platform Expansion**
- **Marketplace/Plugin System:** Third-party developers build services on platform
- **Webhooks:** Outbound event notifications for external integrations
- **GraphQL API:** Unified query layer across microservices (optional alternative to REST)
- **AI Features:** Smart suggestions, content generation, workflow automation
- **Business Intelligence:** Advanced analytics, predictive insights, ML-driven recommendations

---

### Expansion Opportunities

**Vertical Market Specializations**
- **Education Edition:** Student/teacher roles, assignment workflows, grading forms
- **Healthcare Edition:** HIPAA-compliant version, patient notes, appointment scheduling
- **Legal Edition:** Case management, document workflows, client intake forms
- **Real Estate Edition:** Property listings, client CRM, showing scheduling

**Geographic Expansion**
- Deploy regional data centers (EU, Asia, Australia) for data residency compliance
- Multi-region high availability and disaster recovery
- Localized pricing and payment methods per region

**Revenue Model Evolution**
- **Freemium Tier:** Free forever for single user, limited services (acquisition funnel)
- **Standard Tier ($10-30/user/month):** Shared schema, all services, API access
- **Pro Tier ($50-80/user/month):** Advanced features (SSO, advanced analytics, premium support)
- **Enterprise Tier ($150+/user/month):** Dedicated database, SLA, custom contracts
- **API-Only Tier:** Pay-per-API-call pricing for integration-focused customers

**Strategic Partnerships**
- Integration partnerships with Zapier, Make, n8n for workflow automation
- Technology partnerships with DigitalOcean, AWS for co-marketing
- Channel partnerships with agencies/consultancies for reselling
- Open-source community building around microservices patterns

---

## Technical Considerations

### Platform Requirements

**Target Platforms:**
- **Web:** Primary delivery platform via modern browsers
  - Chrome/Edge 90+
  - Firefox 88+
  - Safari 14+
- **Mobile Web:** Responsive design for mobile browsers (not native apps in Phase 1)
  - iOS Safari 14+
  - Android Chrome 90+
- **Desktop:** Web-based, no native desktop apps required

**Browser/OS Support:**
- Focus on evergreen browsers (auto-update)
- No IE11 support (use modern JavaScript/TypeScript features)
- Progressive enhancement for older browsers (graceful degradation)

**Performance Requirements:**
- **API Response Time:** <200ms p95 for CRUD operations within single service
- **Page Load Time:** <2 seconds for initial page load (Core dashboard)
- **File Upload:** Support files up to 25MB per file, progress indication required
- **Real-time Updates:** Kanban board updates reflected within 5 seconds (polling or WebSocket)

---

### Technology Preferences

**Frontend:**
- **Framework:** Angular 20 (latest stable version)
  - Standalone components architecture
  - Signals for reactive state management
  - Modern routing and lazy loading
- **UI Library:** PrimeNG + Tailwind CSS
  - PrimeNG components for complex widgets (tables, forms, dialogs)
  - Tailwind utility classes for custom styling
  - Light theme (Lara Light or similar) in Phase 1
  - CSS variables for future dark theme support
- **State Management:** Angular Signals + RxJS where needed
- **HTTP Client:** Angular HttpClient with interceptors for JWT injection
- **Build Tool:** Angular CLI with esbuild

**Backend:**
- **Framework:** NestJS (latest stable version)
  - TypeScript-first for type safety
  - Microservices architecture support built-in
  - Decorator-based API similar to Angular (familiar for team)
- **ORM:** TypeORM
  - Supports tenant_id global scopes
  - Migration system for schema versioning
  - Works well with PostgreSQL
- **Authentication:** @nestjs/jwt + @nestjs/passport
  - JWT strategy for token validation
  - bcrypt for password hashing
- **API Documentation:** @nestjs/swagger (OpenAPI 3.0)
- **Validation:** class-validator + class-transformer

**Database:**
- **Primary:** PostgreSQL 14+ (one database per service)
  - JSONB support for flexible schemas (forms, metadata)
  - Full-text search capabilities (notes search)
  - Excellent performance and reliability
- **Cache (Phase 2):** Redis 7+
  - Session cache, API response cache
  - Pub/sub for real-time features
- **Message Broker (Phase 2):** Apache Kafka or NATS
  - Event-driven architecture between services
  - Form Builder → Kanban event flow

**Hosting/Infrastructure:**
- **Cloud Provider:** DigitalOcean (preferred) or AWS
  - Droplets (VPS) or App Platform for compute
  - Managed PostgreSQL databases
  - Spaces (S3-compatible) for file storage
- **Containerization:** Docker + Docker Compose
  - Each service in separate container
  - Local development mirrors production
- **Orchestration (Phase 2):** Docker Swarm or Kubernetes
  - Start with Docker Compose, migrate to K8s if scaling requires
- **CI/CD:** GitHub Actions
  - Automated testing on pull requests
  - Deploy to staging on merge to `develop`
  - Deploy to production on merge to `main`

---

### Architecture Considerations

**Repository Structure:**
- **Monorepo Approach:** Single repository containing all services
  - Easier code sharing (types, utilities, shared libraries)
  - Atomic commits across services
  - Simplified dependency management
  - Tools: Nx, Turborepo, or Yarn Workspaces

```
MicroServiceStructure/
├── apps/
│   ├── core-api/          (NestJS Core Service)
│   ├── core-ui/           (Angular landing page + dashboard)
│   ├── notes-api/         (NestJS Notes Service)
│   ├── notes-ui/          (Angular Notes app)
│   ├── kanban-api/        (NestJS Kanban Service)
│   ├── kanban-ui/         (Angular Kanban app)
│   └── form-builder-api/  (Phase 2)
├── libs/
│   ├── shared-types/      (DTOs, interfaces shared across services)
│   ├── auth-utils/        (JWT validation, guards)
│   └── ui-components/     (Shared Angular components)
├── docker/
│   ├── Dockerfile.core
│   ├── Dockerfile.notes
│   └── docker-compose.yml
└── docs/
    ├── architecture.md
    ├── api/               (OpenAPI specs)
    └── adr/               (Architecture Decision Records)
```

**Service Architecture:**
- **Database-per-Service:** Each microservice owns its data
  - Core Service: core_db (users, tenants, roles)
  - Notes Service: notes_db (notes, attachments)
  - Kanban Service: kanban_db (boards, columns, todos)
  - No shared database; services communicate via APIs or events
- **Shared Schema Pattern:** Every table has `tenant_id` column
  - TypeORM global scopes enforce automatic filtering
  - Middleware extracts tenant from JWT, sets context
  - No cross-tenant data access possible

**Integration Requirements:**
- **DigitalOcean Spaces (S3-compatible):**
  - AWS SDK for JavaScript (S3 client)
  - Presigned URLs for secure client-side uploads
  - Bucket structure: `{bucket}/{tenant_id}/{service}/{file_id}`
- **Email Service (Phase 1):**
  - SendGrid, AWS SES, or Mailgun
  - Transactional emails: registration, password reset, invitations
- **Payment Processing (Phase 2+):**
  - Stripe or Paddle for subscription management
  - Webhook handling for payment events

**Security/Compliance:**
- **Authentication:**
  - JWT with HS256 or RS256 signing
  - Token expiration: 24 hours (configurable)
  - No refresh tokens in Phase 1 (simple re-login)
- **Authorization:**
  - Role-based access control (admin vs. user)
  - Tenant-scoped data access (automatic via tenant_id filtering)
  - API endpoints protected by Guards (@UseGuards(JwtAuthGuard))
- **Data Protection:**
  - HTTPS only (TLS 1.2+)
  - Password hashing with bcrypt (salt rounds: 10)
  - SQL injection prevention via parameterized queries (TypeORM)
  - XSS prevention via Angular sanitization + Content Security Policy headers
  - CSRF tokens for state-changing operations
- **Privacy:**
  - GDPR compliance considerations (data export, deletion)
  - Audit logging for sensitive operations (Phase 2)
  - Data residency options (Phase 2+)

---

## Constraints & Assumptions

### Constraints

**Budget:**
- **Development Costs:** 3 developers × 18-20 weeks × fully loaded cost
- **Infrastructure Costs (monthly estimates):**
  - DigitalOcean Droplets/App Platform: $50-200/month (3-5 services)
  - Managed PostgreSQL (3 databases): $45-90/month
  - DigitalOcean Spaces: $5-20/month (storage + bandwidth)
  - Email service (SendGrid/SES): $10-50/month
  - Domain + SSL: $15-30/year
  - **Total: ~$150-400/month infrastructure during development**
- **Post-Launch:** Scale infrastructure costs with tenant growth

**Timeline:**
- **Phase 1 Hard Deadline:** 18-20 weeks for Core + Notes + Kanban
- **Buffer:** 2-3 weeks contingency built into estimates
- **Form Builder Migration:** Flexible timing in Phase 2 (Weeks 19-26+)

**Resources:**
- **Team Size:** Fixed at 3 developers (no expansion planned in Phase 1)
- **Working Approach:** Mob programming (all 3 devs on each service sequentially)
- **Availability:** Full-time allocation to project
- **Skills:** Strong monolith experience, learning microservices through implementation

**Technical:**
- **No Kubernetes in Phase 1:** Docker Compose only; K8s deferred to Phase 2+
- **No Advanced Multi-Tenancy:** Shared schema with tenant_id only; dedicated databases optional future
- **No Native Mobile Apps:** Web-responsive only in Phase 1
- **No Zero-Downtime Migrations:** Planned maintenance windows acceptable initially

---

### Key Assumptions

**Market & Business:**
- 50 tenants achievable within 6-8 months post-launch through organic/self-service channels
- Customers willing to pay $10-30/user/month for modular SaaS platform
- API-first approach differentiates from consumer tools (Notion, Google Workspace)
- Form Builder existing users will migrate to microservices version (80%+ retention)

**Technical:**
- TypeORM global scopes provide sufficient tenant isolation security
- JWT in localStorage acceptable security trade-off for Phase 1 simplicity
- Database-per-service pattern manageable for 3-developer team
- Monorepo approach (Nx/Turborepo) simplifies code sharing without excessive complexity
- DigitalOcean provides adequate performance and reliability for target scale

**Team & Process:**
- Mob programming at 1.5x speed multiplier realistic (not 3x, but faster than 1x)
- Team can master NestJS + microservices patterns within 18-20 week timeline
- POC phase (Weeks 1-2) successfully de-risks JWT SSO and tenant scoping
- Existing Form Builder codebase (90% complete) can be migrated without full rewrite

**User Behavior:**
- Self-service registration model works for target market (no sales calls required)
- Users adopt multiple services (2.5+ per tenant on average)
- API documentation drives developer engagement and integrations
- 10-minute onboarding sufficient for first productive action

**Infrastructure:**
- DigitalOcean Spaces performance acceptable for file attachments (25MB files)
- PostgreSQL per service scales to 10K+ users per tenant without sharding
- Docker Compose sufficient for Phase 1; Kubernetes not required until 100+ tenants
- Email deliverability adequate with SendGrid/SES (no custom SMTP needed)

---

## Risks & Open Questions

### Key Risks

**Risk #1: Team Learning Curve Steeper Than Expected**
- **Description:** 3-developer team struggles with microservices patterns, causing timeline overruns
- **Impact:** High - Could extend Phase 1 from 18-20 weeks to 24-28 weeks
- **Likelihood:** Medium - Team experienced but new to distributed systems
- **Mitigation:**
  - POC phase (Weeks 1-2) validates core patterns before full implementation
  - Mob programming ensures shared knowledge, no single point of failure
  - Start with simplest service (Notes) before complex (Kanban with real-time)
  - External consultant/mentor available for architectural guidance if needed

**Risk #2: Tenant Isolation Bugs (Cross-Tenant Data Leaks)**
- **Description:** Bug in tenant_id filtering allows Tenant A to see Tenant B's data
- **Impact:** Critical - Data breach, loss of customer trust, potential legal issues
- **Likelihood:** Medium - Automatic scoping reduces risk, but human error possible
- **Mitigation:**
  - Comprehensive test suite including cross-tenant isolation tests
  - Code review checklist specifically for tenant scoping
  - Automated security scanning in CI/CD pipeline
  - Penetration testing before launch (simulate malicious tenant)
  - Audit logging to detect suspicious cross-tenant access attempts

**Risk #3: Form Builder Migration More Complex Than Estimated**
- **Description:** Existing Express Form Builder has hidden dependencies or architectural debt
- **Impact:** Medium - Extends Phase 2 timeline, delays revenue from Form Builder
- **Likelihood:** Medium - 90% complete but not production-tested in microservices context
- **Mitigation:**
  - Thorough code audit before starting migration (identify dependencies)
  - Incremental migration approach (read-only API first, then write operations)
  - Run both old and new versions in parallel during transition period
  - Feature flags for gradual user migration

**Risk #4: Infrastructure Costs Higher Than Projected**
- **Description:** DigitalOcean costs spike due to higher-than-expected usage or inefficiencies
- **Impact:** Low - Increases monthly burn rate, but still <$1K/month delta
- **Likelihood:** Low-Medium - Estimates conservative, but usage patterns uncertain
- **Mitigation:**
  - Monitor infrastructure costs weekly during development
  - Set up billing alerts at $500/month threshold
  - Optimize database queries and caching (Redis in Phase 2 if needed)
  - Consider reserved instances or volume discounts if costs spike

---

### Open Questions

**Architecture & Technical:**
1. **JWT Signing Strategy:** HS256 (shared secret) or RS256 (public/private keys)?
   - *HS256 simpler; RS256 more secure for distributed services*
   - **Decision by:** Week 1 (during POC phase)

2. **Monorepo Tool:** Nx vs. Turborepo vs. Yarn Workspaces?
   - *Nx more features; Turborepo simpler; Yarn Workspaces minimal*
   - **Decision by:** Week 3 (before Core Service start)

3. **Real-Time Strategy:** WebSockets vs. Server-Sent Events vs. Polling?
   - *For Kanban board updates; impacts scalability*
   - **Decision by:** Week 12 (before Kanban Service start)

4. **Email Service:** SendGrid vs. AWS SES vs. Mailgun?
   - *Cost, deliverability, developer experience trade-offs*
   - **Decision by:** Week 5 (during Core Service implementation)

5. **Deployment Platform:** DigitalOcean Droplets vs. App Platform vs. Kubernetes?
   - *App Platform simplest; Droplets more control; K8s overkill for Phase 1*
   - **Decision by:** Week 15 (2 weeks before deployment)

**Business & Product:**
6. **Pricing Model:** Per-user vs. per-tenant vs. usage-based?
   - *Per-user aligns with SaaS norms; need market validation*
   - **Research by:** Month 3 (before launch)

7. **Free Tier:** Offer free tier for single users or limit features?
   - *Acquisition funnel vs. support burden trade-off*
   - **Decision by:** Month 4 (can launch without deciding)

8. **Service Bundling:** Force all services or allow à la carte selection?
   - *Modular pricing mentioned, but implementation details TBD*
   - **Decision by:** Week 10 (impacts JWT enabledServices logic)

**Process & Team:**
9. **Testing Strategy:** Unit vs. integration vs. E2E test priorities?
   - *Balance coverage with development velocity*
   - **Decision by:** Week 4 (establish patterns early)

10. **Code Review Process:** All PRs reviewed or trust + spot checks (mob programming)?
    - *Mob programming may reduce review need, but quality checks still valuable*
    - **Decision by:** Week 3 (establish team workflow)

---

### Areas Needing Further Research

**Performance & Scalability:**
- Database connection pooling configuration for multi-tenant workloads
- When does shared schema approach hit limits (10K tenants? 100K users?)
- Real-world latency between services on DigitalOcean network

**Security:**
- GDPR compliance checklist for multi-tenant SaaS (data portability, right to be forgotten)
- Penetration testing methodology and tools for multi-tenant applications
- Security audit timeline and budget (before launch vs. after 3 months)

**Operations:**
- Backup and disaster recovery strategy (per-service databases)
- Monitoring and observability tools (application performance, errors, usage metrics)
- On-call rotation and incident response procedures post-launch

**Market Validation:**
- Competitive analysis: Notion, Clickup, Airtable pricing and positioning
- Customer interviews: validate $10-30/user/month price point
- API-first messaging: what developer audience actually wants (Swagger, SDKs, webhooks)

---

## Appendices

### A. Research Summary

**Brainstorming Session Findings (2025-10-29):**
- Comprehensive architecture decisions documented in `docs/brainstorming-session-results.md`
- Key insights:
  - Deferred Kafka/Redis to Phase 2 reduces cognitive load for learning team
  - Schema-per-tenant initially chosen but REVISED to shared schema (tenant_id) for simplicity
  - POC-driven approach critical for de-risking complex patterns
  - Mob programming at 1.5x speed multiplier realistic for knowledge sharing
  - API documentation elevated to first-class deliverable (4-week dedicated phase)
- Timeline evolved from 26 weeks (with schema-per-tenant) to 18-20 weeks (shared schema)

**Multi-Tenancy Architecture Research:**
- Evaluated schema-per-tenant vs. shared schema with tenant_id
- **Decision:** Start with shared schema (simpler), migrate specific tenants to dedicated databases in Phase 3+ if customer demand exists
- **Rationale:** Learning microservices fundamentals higher priority than advanced multi-tenancy

**Technology Stack Validation:**
- NestJS + Angular alignment reduces context switching (both TypeScript, decorator-based)
- TypeORM supports global scopes for automatic tenant filtering
- PrimeNG + Tailwind CSS provides modern UI without custom component library burden
- DigitalOcean Spaces + Managed PostgreSQL simplify infrastructure management

---

### B. Stakeholder Input

**Development Team (3 developers):**
- Strong preference for learning through production implementation vs. tutorials
- Concern about complexity: schema-per-tenant felt overwhelming initially
- Support for POC phase to validate patterns before committing
- Mob programming approach endorsed for knowledge sharing and reducing silos

**Existing Form Builder Users (feedback from initial outreach):**
- 90% willing to migrate if feature parity maintained
- API access highly desired (current Express version lacks comprehensive APIs)
- Modern UI welcome upgrade (current version feels dated)
- Concerns about data migration and downtime during transition

---

### C. References

**Documentation & Tutorials:**
- [NestJS Microservices Documentation](https://docs.nestjs.com/microservices/basics)
- [TypeORM Multi-Tenancy Patterns](https://typeorm.io/)
- [Angular 20 Standalone Components Guide](https://angular.dev/guide/components)
- [PrimeNG Documentation](https://primeng.org/)
- [DigitalOcean Spaces S3 Compatibility](https://docs.digitalocean.com/products/spaces/)

**Architecture Patterns:**
- [Database-per-Service Pattern](https://microservices.io/patterns/data/database-per-service.html)
- [JWT Authentication in Microservices](https://www.manning.com/books/microservices-patterns)
- [Multi-Tenant SaaS Architecture](https://aws.amazon.com/partners/saas-factory/)

**Project Files:**
- Architecture decisions: `docs/brainstorming-session-results.md`
- Technical roadmap: (to be created in `docs/architecture.md`)
- API specifications: (to be generated in `docs/api/`)

---

## Next Steps

### Immediate Actions (Week 0 - Before Development Starts)

1. **Finalize Technology Decisions (Priority: HIGH)**
   - Choose JWT signing strategy (HS256 vs. RS256)
   - Select monorepo tool (Nx vs. Turborepo)
   - Decide email service provider (SendGrid vs. SES)
   - **Owner:** Tech Lead
   - **Timeline:** 1 week

2. **Set Up Development Environment**
   - Install Node.js, npm/yarn, Docker Desktop
   - Configure IDE (VSCode recommended) with TypeScript, Angular, NestJS extensions
   - Set up GitHub repository with monorepo structure
   - **Owner:** All 3 developers
   - **Timeline:** 2-3 days

3. **Create Architecture Decision Records (ADRs)**
   - Document key decisions from brainstorming session
   - ADR-001: Shared schema with tenant_id (not schema-per-tenant)
   - ADR-002: Service-based subdomains (not tenant-based)
   - ADR-003: Database-per-service pattern
   - ADR-004: JWT in localStorage (Phase 1 trade-off)
   - **Owner:** Tech Lead
   - **Timeline:** 2-3 days

4. **Infrastructure Provisioning**
   - Create DigitalOcean account (if not exists)
   - Provision development databases (PostgreSQL × 3)
   - Set up DigitalOcean Spaces bucket
   - Configure domain (mydomain.com) with DNS
   - **Owner:** DevOps-focused developer
   - **Timeline:** 1-2 days

---

### Phase 1 Kickoff (Week 1-2: POC Phase)

**Week 1: POC #1 - JWT SSO Pattern**
- Build minimal Auth Service issuing JWT tokens
- Build minimal Resource Service validating tokens
- Build minimal Angular app demonstrating single login → multi-service access
- Document pattern for team reference
- **Success Criteria:** JWT flow working end-to-end

**Week 2: POC #2 - TypeORM Tenant Scoping**
- Build simple NestJS CRUD app with tenant_id filtering
- Implement global scopes and middleware
- Test cross-tenant isolation (create Tenant A data, verify Tenant B can't access)
- Document automatic tenant filtering pattern
- **Success Criteria:** Zero cross-tenant data leaks in tests

---

### PM Handoff

This Project Brief provides the full context for **MicroServiceStructure**.

**For Product Manager / Project Lead:**
- Review this brief thoroughly with development team
- Use brainstorming session results (`docs/brainstorming-session-results.md`) as supporting detail
- Validate MVP scope aligns with business goals and timeline constraints
- Clarify any open questions before Week 1 POC phase begins
- Establish weekly check-ins to track progress against 18-20 week timeline

**For Development Team:**
- Prioritize POC phase (Weeks 1-2) - success here de-risks entire project
- Follow mob programming approach for knowledge sharing
- Document architecture patterns as you discover them (ADRs, code comments)
- Flag blockers immediately - don't let issues compound

**Next Meeting:** Schedule kickoff meeting to review this brief, answer questions, and officially launch Phase 1.

---

**Project Brief Complete** ✅
**Version:** 1.0
**Date:** 2025-10-29
**Status:** Ready for Team Review


