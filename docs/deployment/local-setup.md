# Local Development Setup

This guide explains how to set up and run the Core API microservice locally using Docker Compose.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker**: Version 20.10 or higher
  - Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
  - Verify installation: `docker --version`
- **Docker Compose**: Version 2.0 or higher
  - Usually included with Docker Desktop
  - Verify installation: `docker-compose --version`
- **Node.js**: Version 18 or higher (for local development without Docker)
  - Download from [https://nodejs.org](https://nodejs.org)
  - Verify installation: `node --version`
- **Git**: For cloning the repository
  - Download from [https://git-scm.com](https://git-scm.com)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd MicroServiceStructure
```

### 2. Configure Environment Variables

Copy the example environment file and update it with your configuration:

```bash
cd apps/core-api
cp .env.example .env
```

Edit the `.env` file and update the following variables:

**Required Changes:**

- `JWT_SECRET`: Change to a secure random string (minimum 32 characters)
  - Generate with: `openssl rand -base64 32`

**Email Service Configuration (Choose One):**

**Option A: SendGrid**
- `SENDGRID_API_KEY`: Your SendGrid API key
  - Sign up at [https://sendgrid.com](https://sendgrid.com)
- `EMAIL_FROM`: Your verified sender email

**Option B: AWS SES**
- Uncomment AWS SES variables
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_REGION`: AWS region (e.g., us-east-1)

**Optional Changes:**

- `FRONTEND_URL`: Your frontend application URL (default: http://localhost:4200)
- `PORT`: API port (default: 3000)
- `DATABASE_URL`: Database connection string (default is configured for Docker Compose)

### 3. Return to Project Root

```bash
cd ../..
```

## Running with Docker Compose

### Start Services

Start all services (PostgreSQL + Core API) in detached mode:

```bash
docker-compose up -d
```

This command will:
1. Pull the PostgreSQL 14 Alpine image
2. Build the Core API Docker image
3. Create a network for service communication
4. Start PostgreSQL and wait for it to be healthy
5. Start the Core API service

### View Logs

**All services:**
```bash
docker-compose logs -f
```

**Core API only:**
```bash
docker-compose logs -f core-api
```

**PostgreSQL only:**
```bash
docker-compose logs -f postgres
```

### Stop Services

```bash
docker-compose down
```

To stop services and remove volumes (deletes database data):
```bash
docker-compose down -v
```

### Rebuild Services

If you make changes to the code, rebuild the images:

```bash
docker-compose up -d --build
```

## Health Checks

The Core API provides two health check endpoints for monitoring:

### Liveness Check

Verifies the service is running (no external dependencies checked):

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "core-api",
  "version": "1.0.0",
  "timestamp": "2025-10-29T10:00:00Z"
}
```

### Readiness Check

Verifies the service is ready to handle requests (checks database connectivity):

```bash
curl http://localhost:3001/ready
```

**Expected Response (Healthy):**
```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2025-10-29T10:00:00Z"
}
```

**Expected Response (Unhealthy):**
```json
HTTP 503 Service Unavailable

{
  "status": "not ready",
  "database": "disconnected",
  "timestamp": "2025-10-29T10:00:00Z"
}
```

## Database Migrations

Run database migrations inside the Core API container:

### Apply Migrations

```bash
docker-compose exec core-api npm run migration:run
```

### Revert Last Migration

```bash
docker-compose exec core-api npm run migration:revert
```

### Generate New Migration

```bash
docker-compose exec core-api npm run migration:generate -- -n MigrationName
```

## Testing API Endpoints

### Access Swagger Documentation

Open your browser and navigate to:
```
http://localhost:3001/api/docs
```

### Test Authentication Endpoints

**Register a New User:**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "tenantId": "tenant-001"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**Get Current User Profile:**
```bash
# Use the token from the login response
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Troubleshooting

### Database Connection Errors

**Problem:** Core API can't connect to PostgreSQL

**Solutions:**
1. Check if PostgreSQL is healthy:
   ```bash
   docker-compose ps
   ```
2. Verify PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```
3. Ensure PostgreSQL is running:
   ```bash
   docker-compose up -d postgres
   ```
4. Check DATABASE_URL in `.env` matches Docker Compose configuration

### Port Conflicts

**Problem:** Port 3001 or 5432 already in use

**Solutions:**
1. Check what's using the port:
   ```bash
   # macOS/Linux
   lsof -i :3001
   lsof -i :5432

   # Windows
   netstat -ano | findstr :3001
   netstat -ano | findstr :5432
   ```
2. Stop the conflicting service or change ports in `docker-compose.yml`

### Environment Variable Issues

**Problem:** Service starts but features don't work (email, auth, etc.)

**Solutions:**
1. Verify `.env` file exists in `apps/core-api/`
2. Check all required variables are set
3. Restart services after changing environment variables:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Container Restart Loops

**Problem:** Core API container keeps restarting

**Solutions:**
1. Check health check status:
   ```bash
   docker-compose ps
   ```
2. View detailed logs:
   ```bash
   docker-compose logs core-api
   ```
3. Common causes:
   - Database not ready (wait for health check)
   - Missing environment variables
   - Syntax errors in code
   - Port already in use

### Build Errors

**Problem:** Docker build fails

**Solutions:**
1. Clear Docker cache and rebuild:
   ```bash
   docker-compose build --no-cache
   ```
2. Check Dockerfile syntax
3. Ensure all dependencies in `package.json` are valid
4. Verify Node.js version compatibility

### Data Persistence Issues

**Problem:** Database data lost after restart

**Solutions:**
1. Ensure you're not using `docker-compose down -v` (removes volumes)
2. Check volume configuration in `docker-compose.yml`
3. Verify volume exists:
   ```bash
   docker volume ls | grep postgres_data
   ```

## Local Development Without Docker

If you prefer to run services locally without Docker:

### Prerequisites
- PostgreSQL 14 installed locally
- Node.js 18+ installed

### Setup

1. Start PostgreSQL locally
2. Update `.env` with local database connection:
   ```
   DATABASE_URL=postgresql://postgres:password@localhost:5432/core_db
   ```
3. Install dependencies:
   ```bash
   cd apps/core-api
   npm install
   ```
4. Run migrations:
   ```bash
   npm run migration:run
   ```
5. Start development server:
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000` (or your configured PORT).

## Next Steps

- Review the [API Documentation](http://localhost:3001/api/docs)
- Explore the [Architecture Documentation](../architecture/)
- Read the [Testing Guide](../testing/)
- Learn about [Deployment to Production](./production-setup.md)

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Docker Documentation](https://docs.docker.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeORM Documentation](https://typeorm.io)
