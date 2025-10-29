# MicroService Structure - Turborepo Monorepo

Multi-tenant microservices platform built with Turborepo, NestJS, and Angular 20.

## Project Structure

This monorepo uses Turborepo to manage multiple applications and shared libraries:

```
MicroServiceStructure/
├── apps/                    # Microservice applications
│   ├── core-api/           # NestJS - Auth, tenants, users, files
│   ├── core-ui/            # Angular 20 - Landing, auth, dashboard
│   ├── notes-api/          # NestJS - Notes service (future)
│   ├── kanban-api/         # NestJS - Kanban service (future)
│   └── admin-api/          # NestJS - Admin service (future)
├── libs/                    # Shared libraries
│   └── shared-types/       # Shared TypeScript interfaces/DTOs
│       └── src/
│           ├── auth/       # JWT, user, auth types
│           ├── tenants/    # Tenant types
│           └── notes/      # Note types (future)
├── docker/                  # Docker compose and configurations
├── docs/                    # Project documentation (PRD, Architecture, Stories)
├── package.json            # Root workspace configuration
├── turbo.json              # Turborepo pipeline configuration
└── README.md               # This file
```

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL (for core-api)

## Getting Started

### Installation

Install all dependencies across workspaces:

```bash
npm install
```

### Development

Start all services in development mode:

```bash
npm run dev
```

This will start:
- core-api on port 3000
- core-ui on port 4200

### Build

Build all workspaces:

```bash
npm run build
```

Turborepo will build libs/shared-types first, then apps in parallel.

### Testing

Run tests across all workspaces:

```bash
npm run test
```

### Linting

Lint all workspaces:

```bash
npm run lint
```

## Available Workspaces

### Applications

- **@microservice/core-api** - Authentication, tenant management, user management, file uploads
- **@microservice/core-ui** - Landing page, authentication UI, dashboard

### Libraries

- **@microservice/shared-types** - Common TypeScript interfaces and DTOs shared across services

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build all workspaces |
| `npm run dev` | Start all services in dev mode |
| `npm run test` | Run tests across all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run clean` | Clean all build artifacts |

## Adding New Workspaces

### Add a New Application

1. Create directory in `apps/`:
   ```bash
   mkdir apps/new-api
   cd apps/new-api
   ```

2. Initialize NestJS or Angular project

3. Update package.json name to `@microservice/new-api`

4. Add scripts: `build`, `dev`, `test`, `lint`

### Add a New Library

1. Create directory in `libs/`:
   ```bash
   mkdir -p libs/new-lib/src
   ```

2. Create package.json with name `@microservice/new-lib`

3. Add TypeScript configuration

4. Export types from src/index.ts

## Technology Stack

### Backend
- NestJS (TypeScript)
- TypeORM
- PostgreSQL
- JWT Authentication

### Frontend
- Angular 20
- PrimeNG
- TypeScript

### Build Tools
- Turborepo
- TypeScript
- ESLint
- Prettier

## Documentation

Project documentation is located in the `docs/` folder:
- Product Requirements Document (PRD)
- Architecture Documentation
- User Stories and Implementation Notes

## License

UNLICENSED - Private project
