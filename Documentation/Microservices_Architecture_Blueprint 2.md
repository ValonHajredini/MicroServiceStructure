# Microservices Architecture Blueprint and Roadmap

This document consolidates the uploaded blueprint into a developer-friendly Markdown and adds visual **Mermaid** diagrams to explain how the system should work end-to-end.

---

## Overview

- **Backend:** Node.js + Express microservices (independently deployable), each with its own Postgres database/schema.
- **Frontend:** Angular 20 apps per service (Core, Form Builder, Short Link), with a **Shared UI Library** (PrimeNG + Tailwind).
- **Auth:** JWT-based SSO issued by **Core** and trusted by all services.
- **Messaging:** **Kafka** for events; **Redis** for caching/rate limits/locks.
- **Tenancy:** Single-tenant and multi-tenant modes; evolve from shared tables with `tenant_id` to schema-per-tenant or DB-per-tenant.
- **Ops:** CI/CD, Docker-ready (and optional Kubernetes), with simple non-Docker local dev.

---

## High-Level System Context

```mermaid
graph LR
    subgraph Client["Users & Browsers"]
      U[User]
    end

    subgraph Frontends["Angular 20 Apps"]
      CoreUI["Core UI (Home/Auth)"]
      FBUI["Form Builder UI"]
      SLUI["Short Link UI"]
      SharedLib["Shared UI Library<br/>(PrimeNG + Tailwind)"]
      CoreUI -. uses .-> SharedLib
      FBUI -. uses .-> SharedLib
      SLUI -. uses .-> SharedLib
    end

    subgraph Services["Node.js + Express Microservices"]
      Core["Core Service<br/>(Auth, Tenants, Services Registry)"]
      FB["Form Builder Service"]
      SL["Short Link Service"]
    end

    subgraph Infra["Infrastructure"]
      PG_Core["PostgreSQL (core)"]
      PG_FB["PostgreSQL (form-builder)"]
      PG_SL["PostgreSQL (short-link)"]
      Redis[(Redis Cache)]
      Kafka[(Kafka Broker)]
    end

    U --> CoreUI
    U --> FBUI
    U --> SLUI

    CoreUI --> Core
    FBUI --> FB
    SLUI --> SL

    Core --- PG_Core
    FB --- PG_FB
    SL --- PG_SL

    Core <--> Kafka
    FB <--> Kafka
    SL <--> Kafka

    SL <--> Redis
    FB <--> Redis
    Core <--> Redis
```
---

## JWT SSO Login Flow (Sequence)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant CoreUI as Core UI (Angular)
    participant Core as Core Service (Auth)
    participant FBUI as Form Builder UI
    participant FB as Form Builder API

    User->>FBUI: Open /forms (not authenticated)
    FBUI->>CoreUI: Redirect to login (Core domain)
    CoreUI->>Core: POST /auth/login (credentials)
    Core-->>CoreUI: 200 OK + JWT (and optional refresh cookie)
    CoreUI->>FBUI: Redirect back with token (or shared cookie)
    FBUI->>FB: API calls with Authorization: Bearer JWT
    FB-->>FBUI: 200 OK (claims validate: tenant + service access)
    FBUI-->>User: Form Builder dashboard
```

**Notes**
- Stateless access tokens; consider short TTL + refresh token (httpOnly) for UX.
- Each service verifies signature + required claims (e.g., `services` includes `form_builder`, `tenant` enforced in queries).

---

## Service Responsibilities

### Core Service
- Auth (/login, /logout, optional /refresh, /register)
- Tenants, users, roles, service access matrix
- Optional Services registry endpoint (`GET /services`) for UI cards
- Emits/consumes events (e.g., `user.registered`)

### Form Builder Service
- CRUD for forms, fields, responses
- Tenant-scoped data
- Emits events: `form.created`, `form.response.created`
- Optional caching of form definitions in Redis

### Short Link Service
- Create/manage short URLs; public redirect endpoint `/l/:code`
- Heavy Redis caching for code→target lookup
- Emits `link.created`, `link.clicked`

---

## Event-Driven Interactions (Kafka)

```mermaid
flowchart LR
    Core((Core)) -- "user.registered" --> Email[Email/Notification svc]
    Core -- "user.registered" --> FB[(Form Builder)]
    FB -- "form.response.created" --> Analytics[Analytics svc]
    SL((Short Link)) -- "link.clicked" --> Analytics

    classDef svc fill:#eef,stroke:#99f,stroke-width:1px;
    class Core,FB,SL svc;
```
*Consumers can be added/removed independently; services remain loosely coupled.*

---

## Multi‑Tenancy Options

```mermaid
graph TD
    A[Start simple: Shared Tables<br/>tenant_id on every row] --> B[Schema-per-tenant (Postgres schemas)]
    B --> C[Database-per-tenant (strongest isolation)]
```
**Enforcement**
- Read/write always filtered by `tenant` claim from JWT.
- Consider ORM middleware/scopes and composite unique keys per tenant.

---

## Data Model Starters (Illustrative)

```mermaid
erDiagram
    USERS ||--o{ USER_TENANT_ROLES : has
    TENANTS ||--o{ USER_TENANT_ROLES : defines
    USERS {
      uuid id PK
      string email
      string password_hash
      timestamptz created_at
    }
    TENANTS {
      uuid id PK
      string name
      jsonb config
    }
    USER_TENANT_ROLES {
      uuid id PK
      uuid user_id FK
      uuid tenant_id FK
      text role
      text[] services_enabled
    }
```

```mermaid
erDiagram
    FORMS ||--o{ FORM_FIELDS : has
    FORMS ||--o{ FORM_RESPONSES : collects
    FORMS {
      uuid id PK
      uuid tenant_id
      uuid created_by
      text name
      text description
      timestamptz created_at
    }
    FORM_FIELDS {
      uuid id PK
      uuid form_id FK
      text field_type
      text label
      jsonb options
      int sort_order
    }
    FORM_RESPONSES {
      uuid id PK
      uuid form_id FK
      uuid submitted_by
      jsonb answers
      timestamptz submitted_at
    }
```

```mermaid
erDiagram
    LINKS {
      text code PK
      uuid tenant_id
      uuid created_by
      text target_url
      int click_count
      timestamptz created_at
    }
```

---

## Caching & Rate Limiting (Redis)

```mermaid
flowchart LR
    Client --> SLAPI[Short Link API]
    SLAPI -->|GET /l/:code| Cache{Redis GET code}
    Cache -- hit --> Redirect[/302 → target/]
    Cache -- miss --> DB[(Postgres)] --> CacheSet[Redis SETEX code→url]
    CacheSet --> Redirect
```
- Token blacklists / allowlists (optional)
- Login throttling keys (`ip:login`)

---

## CI/CD & Deployment

```mermaid
flowchart TD
    Dev[Commit/PR] --> CI[CI: build & test]
    CI --> Images[Build Docker images per service/ui]
    Images --> Registry[(Container Registry)]
    Registry --> Deploy[Deploy: docker-compose or Kubernetes]
    Deploy --> Monitor[Logging/metrics/alerts]
```
**Local Dev**
- Run Postgres, Kafka, Redis (Docker ok), services with `npm run dev`, Angular with `ng serve` + proxy.

**Production**
- One domain with reverse-proxy routing (`/core-api`, `/form-api`, `/shortlink-api`, static UIs)
- Secrets via env vars; HTTPS everywhere.

---

## Add a New Service (Playbook)

```mermaid
flowchart LR
    A[Scaffold Node/Express + Angular app] --> B[Add DB schema + JWT middleware]
    B --> C[Define service-id & update Core claims issuance]
    C --> D[Wire Kafka topics (produce/consume)]
    D --> E[Add to Docker/Compose/K8s + CI/CD]
    E --> F[Expose UI link in Core dashboard]
```
Checklist:
- `tenant_id` on every table (or schema/DB per tenant)
- JWT `services` claim enforcement
- Topic names convention `{service}.{event}`
- Shared UI library for consistent UX

---

## Security Notes
- Hash passwords (bcrypt/argon2); secure cookies for refresh tokens.
- Validate inputs; strict CORS; same-site cookies where applicable.
- Short token TTL + refresh rotation; consider JTI blacklist for revocation.
- Per-tenant RBAC; audit events via Kafka or logs.

---

## Roadmap (Milestones)

1. **Scaffold repos + Nx/monorepo (optional).**
2. **Core auth + tenants + JWT issuance.**
3. **Core UI with login & services dashboard.**
4. **Form Builder API + UI (basic CRUD).**
5. **Short Link API + UI; Redis cache on redirect.**
6. **Kafka events across services; simple consumer.**
7. **Dockerfiles + docker-compose; basic CI.**
8. **Multi-tenant hardening + RBAC.**
9. **Reverse proxy + HTTPS + secrets mgmt.**
10. **Monitoring + analytics + docs.**

---

*End of document.*
