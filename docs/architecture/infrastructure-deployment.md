# Infrastructure & Deployment

## Deployment Architecture

**Target Platform:** DigitalOcean App Platform or Droplets + Docker

**Phase 1: Docker Compose (Local Development)**
```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL Databases
  postgres-core:
    image: postgres:14
    environment:
      POSTGRES_DB: core_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - core-db-data:/var/lib/postgresql/data

  postgres-notes:
    image: postgres:14
    environment:
      POSTGRES_DB: notes_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"
    volumes:
      - notes-db-data:/var/lib/postgresql/data

  postgres-kanban:
    image: postgres:14
    environment:
      POSTGRES_DB: kanban_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5434:5432"
    volumes:
      - kanban-db-data:/var/lib/postgresql/data

  postgres-admin:
    image: postgres:14
    environment:
      POSTGRES_DB: admin_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5435:5432"
    volumes:
      - admin-db-data:/var/lib/postgresql/data

  # Core Service
  core-api:
    build:
      context: ./apps/core-api
      dockerfile: Dockerfile
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-core:5432/core_db
      - JWT_SECRET=your-secret-key
      - DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
      - DO_SPACES_BUCKET=your-bucket
      - DO_SPACES_ACCESS_KEY=your-key
      - DO_SPACES_SECRET_KEY=your-secret
    depends_on:
      - postgres-core

  # Notes Service
  notes-api:
    build:
      context: ./apps/notes-api
      dockerfile: Dockerfile
    ports:
      - "3002:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-notes:5432/notes_db
      - JWT_SECRET=your-secret-key
      - CORE_SERVICE_URL=http://core-api:3000
    depends_on:
      - postgres-notes
      - core-api

  # Kanban Service
  kanban-api:
    build:
      context: ./apps/kanban-api
      dockerfile: Dockerfile
    ports:
      - "3003:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-kanban:5432/kanban_db
      - JWT_SECRET=your-secret-key
      - CORE_SERVICE_URL=http://core-api:3000
    depends_on:
      - postgres-kanban
      - core-api

  # Admin Service
  admin-api:
    build:
      context: ./apps/admin-api
      dockerfile: Dockerfile
    ports:
      - "3004:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres-admin:5432/admin_db
      - JWT_SECRET=your-secret-key
      - CORE_SERVICE_URL=http://core-api:3000
    depends_on:
      - postgres-admin
      - core-api

volumes:
  core-db-data:
  notes-db-data:
  kanban-db-data:
  admin-db-data:
```

---

## Production Deployment (DigitalOcean)

**Option 1: DigitalOcean App Platform (Recommended for Phase 1)**

**Advantages:**
- Fully managed platform (no server management)
- Auto-scaling and load balancing
- Built-in CI/CD from GitHub
- Automatic HTTPS/SSL
- Simple pricing ($12-50/month per service)

**Setup:**
```yaml
# .do/app.yaml (App Platform spec)
name: microservice-structure
services:
  - name: core-api
    github:
      repo: your-org/MicroServiceStructure
      branch: main
      deploy_on_push: true
    source_dir: /apps/core-api
    build_command: npm run build
    run_command: npm run start:prod
    envs:
      - key: DATABASE_URL
        value: ${core-db.DATABASE_URL}
      - key: JWT_SECRET
        type: SECRET
        value: your-secret
    http_port: 3000
    routes:
      - path: /
    instance_count: 2
    instance_size_slug: basic-xs  # $12/month

  - name: notes-api
    # Similar config...

  - name: kanban-api
    # Similar config...

  - name: admin-api
    # Similar config...

databases:
  - name: core-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb  # $15/month

  - name: notes-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb

  - name: kanban-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb

  - name: admin-db
    engine: PG
    version: "14"
    size: db-s-1vcpu-1gb
```

**Cost Estimate:**
- 4 services × $12/month = $48/month
- 4 databases × $15/month = $60/month
- DigitalOcean Spaces: $5-20/month
- **Total: ~$115-150/month**

---

**Option 2: DigitalOcean Droplets + Docker (More Control)**

**Architecture:**
```
DigitalOcean Droplet ($24/month)
├── Docker Compose
│   ├── core-api:3001
│   ├── notes-api:3002
│   ├── kanban-api:3003
│   └── admin-api:3004
├── Nginx (Reverse Proxy)
│   ├── mydomain.com → core-api:3001
│   ├── notes.mydomain.com → notes-api:3002
│   ├── kanban.mydomain.com → kanban-api:3003
│   └── admin.mydomain.com → admin-api:3004
└── Let's Encrypt SSL

Managed PostgreSQL Cluster ($45-90/month)
├── core_db
├── notes_db
├── kanban_db
└── admin_db
```

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/microservices

# Core Service
server {
    listen 80;
    server_name mydomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Notes Service
server {
    listen 80;
    server_name notes.mydomain.com;

    location / {
        proxy_pass http://localhost:3002;
        # ... same proxy settings
    }
}

# Kanban Service
server {
    listen 80;
    server_name kanban.mydomain.com;

    location / {
        proxy_pass http://localhost:3003;
        # ... same proxy settings
    }
}

# Admin Service
server {
    listen 80;
    server_name admin.mydomain.com;

    location / {
        proxy_pass http://localhost:3004;
        # ... same proxy settings
    }
}
```

**Cost Estimate:**
- Droplet (2 CPU, 4GB RAM): $24/month
- Managed PostgreSQL: $45-90/month
- DigitalOcean Spaces: $5-20/month
- Domain + SSL: Free (Let's Encrypt)
- **Total: ~$75-135/month**

---

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy Microservices

on:
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:all  # Run tests for all services

  build-core:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Core Service
        run: |
          cd apps/core-api
          docker build -t core-api:latest .
      - name: Push to Registry
        run: |
          docker push registry.digitalocean.com/your-registry/core-api:latest

  # Similar jobs for notes, kanban, admin...

  deploy:
    needs: [build-core, build-notes, build-kanban, build-admin]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to DigitalOcean
        run: |
          doctl apps create-deployment ${{ secrets.APP_ID }}
```

---
