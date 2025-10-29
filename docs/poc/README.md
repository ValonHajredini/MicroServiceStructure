# POC Phase Documentation

**Duration:** Weeks 1-2
**Purpose:** De-risk high-complexity architectural patterns before full implementation

---

## POC Overview

This phase validates two critical patterns:
1. **Week 1:** TypeORM Multi-Tenancy (shared-schema with `tenant_id` filtering)
2. **Week 2:** JWT SSO Between Services (single authentication across multiple services)

---

## Prerequisites

### Required Tools

1. **Node.js 18+ and npm/yarn**
   ```bash
   node --version  # Should be v18.x or higher
   npm --version   # Should be v9.x or higher
   ```

2. **Docker Desktop**
   ```bash
   docker --version  # Should be 20.x or higher
   docker-compose --version  # Should be 2.x or higher
   ```

3. **PostgreSQL 14+** (via Docker)
   - Will be provided in docker-compose.yml

4. **IDE: VSCode** (recommended)
   - Extensions to install:
     - ESLint
     - Prettier
     - TypeScript
     - NestJS Files
     - Angular Language Service

5. **Git**
   ```bash
   git --version  # Any recent version
   ```

---

## Environment Setup

### 1. Install Node.js Dependencies Globally

```bash
# NestJS CLI
npm install -g @nestjs/cli

# Angular CLI
npm install -g @angular/cli

# TypeScript
npm install -g typescript

# Verify installations
nest --version
ng version
tsc --version
```

### 2. Clone/Create Repository

```bash
# If starting fresh
mkdir MicroServiceStructure-POC
cd MicroServiceStructure-POC
git init
```

### 3. Create Docker Compose for PostgreSQL

See `docker-compose.poc.yml` in this directory.

```bash
# Start PostgreSQL
docker-compose -f docker-compose.poc.yml up -d

# Verify databases are running
docker-compose -f docker-compose.poc.yml ps
```

---

## POC Structure

```
MicroServiceStructure-POC/
├── poc-1-multi-tenancy/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── poc-2-jwt-sso/
│   ├── auth-service/
│   ├── resource-service/
│   ├── angular-client/
│   └── README.md
├── docker-compose.poc.yml
└── docs/
    ├── poc-1-learnings.md
    └── poc-2-learnings.md
```

---

## Quick Start

### Week 1: Multi-Tenancy POC

```bash
cd poc-1-multi-tenancy
npm install
npm run start:dev

# Test endpoints
curl http://localhost:3000/health
```

### Week 2: JWT SSO POC

```bash
# Terminal 1: Auth Service
cd poc-2-jwt-sso/auth-service
npm install
npm run start:dev

# Terminal 2: Resource Service
cd poc-2-jwt-sso/resource-service
npm install
npm run start:dev

# Terminal 3: Angular Client
cd poc-2-jwt-sso/angular-client
npm install
ng serve
```

---

## Success Criteria

### POC #1: Multi-Tenancy
- [ ] Tenant A can create notes
- [ ] Tenant B can create notes
- [ ] Tenant A cannot see Tenant B's notes
- [ ] Middleware correctly extracts tenant from request
- [ ] Pattern documented and reproducible

### POC #2: JWT SSO
- [ ] User logs in via Auth Service
- [ ] Receives JWT token
- [ ] Can call Resource Service with same token
- [ ] Angular stores and reuses token
- [ ] Pattern documented and reproducible

---

## Next Steps After POCs

1. Review learnings with team
2. Update architecture design based on POC insights
3. Begin Core Service implementation (Week 3)
4. Apply proven patterns from POCs

---

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if containers are running
docker-compose -f docker-compose.poc.yml ps

# Check logs
docker-compose -f docker-compose.poc.yml logs postgres-poc

# Restart containers
docker-compose -f docker-compose.poc.yml restart
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### TypeORM Connection Error
- Verify DATABASE_URL in .env file
- Check PostgreSQL is running
- Verify database exists: `docker exec -it postgres-poc psql -U postgres -l`
