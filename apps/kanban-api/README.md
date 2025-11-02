# Kanban API Service

The Kanban API provides boards, columns, tasks, and task comments for the microservice platform. It exposes NestJS endpoints backed by PostgreSQL with TypeORM and enforces multi-tenant isolation via JWT-derived tenant context.

## Getting Started

```bash
npm run start:dev
```

Ensure a PostgreSQL instance is running and the `.env` file has valid connection values. You can copy `.env.example` as a starting point.

## Database Migrations

```bash
# Generate schema changes
npm run migration:generate -- --name AddSomething

# Apply migrations
npm run migration:run

# Rollback last migration
npm run migration:revert
```

## Seed Data

Populate local development data (two boards, sample columns, tasks, and comments):

```bash
npm run seed
```

Environment overrides:

- `SEED_TENANT_ID`
- `SEED_OWNER_USER_ID`
- `SEED_COMMENT_USER_ID`

By default, the seed script uses deterministic UUIDs for quick testing.

## Testing

```bash
npm test
```

The test suite covers entity mappings, tenant context middleware, JWT authentication, and migration/seed smoke tests.
