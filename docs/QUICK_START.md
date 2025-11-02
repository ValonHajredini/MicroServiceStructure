# Quick Start Guide

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Git

## Initial Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd MicroServiceStructure

# Install dependencies
npm install
```

### 2. Database Setup

```bash
# Start PostgreSQL (if not running)
# macOS (Homebrew)
brew services start postgresql@14

# Linux
sudo systemctl start postgresql

# Windows
# Start PostgreSQL from Services

# Create database
psql -U postgres -c "CREATE DATABASE microservice_dev;"
```

### 3. Environment Configuration

```bash
# Core API
cd apps/core-api
cp .env.example .env
# Edit .env if needed (defaults should work for local development)

# Notes API
cd ../notes-api
cp .env.example .env
# Edit .env if needed (defaults should work for local development)
```

### 4. Run Database Migrations

```bash
# Core API migrations
cd apps/core-api
npm run migration:run

# Notes API migrations
cd ../notes-api
npm run migration:run
```

### 5. Seed Database (Optional)

```bash
# Core API seed data
cd apps/core-api
npm run seed

# Notes API seed data
cd ../notes-api
npm run seed
```

## Starting the Applications

### Option 1: Start All Services (Recommended)

```bash
# From project root - starts all services in parallel using Turborepo
npm run dev
```

### Option 2: Start Services Individually

Open 4 terminal windows:

**Terminal 1 - Core API:**
```bash
cd apps/core-api
npm run start:dev
# Runs on http://localhost:3000
```

**Terminal 2 - Notes API:**
```bash
cd apps/notes-api
npm run start:dev
# Runs on http://localhost:3001
```

**Terminal 3 - Core UI:**
```bash
cd apps/core-ui
npm run dev
# Runs on http://localhost:4200
```

**Terminal 4 - Notes UI:**
```bash
cd apps/notes-ui
npm run dev
# Runs on http://localhost:4201
```

## Access the Applications

| Service | URL | Credentials |
|---------|-----|-------------|
| **Core UI** | http://localhost:4200 | See below |
| **Notes UI** | http://localhost:4201 | Dev Login button |

### Default Test User

**Email:** admin@tenant1.com
**Password:** Admin123!
**Tenant:** tenant-001
**Roles:** admin
**Services:** notes, kanban

### Development Mode Login

The Notes UI has a **Dev Login** button that appears in development mode:
- Orange button in top-right corner
- Click to instantly login as admin@tenant1.com
- No need to go through Core UI login flow

## Project Structure

```
MicroServiceStructure/
├── apps/
│   ├── core-api/          # Port 3000 - Auth & Users
│   ├── core-ui/           # Port 4200 - Main Frontend
│   ├── notes-api/         # Port 3001 - Notes Service
│   └── notes-ui/          # Port 4201 - Notes Frontend
├── docs/
│   ├── architecture/      # Architecture documentation
│   ├── prd/              # Product requirements
│   └── stories/          # User stories
└── package.json          # Root package.json
```

## Common Commands

### Development

```bash
# Start all services (from project root)
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build all services
npm run build

# Clean all builds and dependencies
npm run clean
```

### Database

```bash
# Create migration
cd apps/core-api  # or notes-api
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert

# Seed database
npm run seed
```

### Building

```bash
# Build all
npm run build

# Build individual service
npm run build:core-api
npm run build:notes-api
npm run build:core-ui
npm run build:notes-ui
```

## Troubleshooting

### Port Already in Use

```bash
# Check what's using a port
lsof -i :4200  # or :3000, :3001, :4201

# Kill process
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -U postgres -l | grep microservice_dev

# Recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS microservice_dev;"
psql -U postgres -c "CREATE DATABASE microservice_dev;"
```

### CORS Errors

1. Ensure backend services are running
2. Check CORS_ORIGIN in .env files
3. Restart all services after environment changes

### Proxy Not Working (Frontend)

1. Ensure using `npm run dev` (not `ng serve`)
2. Check proxy.conf.json exists
3. Verify environment.ts uses empty apiUrl: ''
4. Restart dev server

## API Documentation

Once running, access Swagger documentation at:

- **Core API:** http://localhost:3000/api
- **Notes API:** http://localhost:3001/api

## Next Steps

1. ✅ Follow this quick start guide
2. 📖 Read the [Architecture Documentation](./architecture/services-ports-environment.md)
3. 📋 Check [User Stories](./stories/) for features
4. 🚀 Start developing!

## Getting Help

- Check [Architecture Documentation](./docs/architecture/)
- Review [User Stories](./docs/stories/)
- Check console errors in browser DevTools
- Check backend logs in terminal

---

**Need Help?** Create an issue in the repository or contact the development team.
