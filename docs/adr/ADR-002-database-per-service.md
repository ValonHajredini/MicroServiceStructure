# ADR-002: Database-per-Service Pattern

**Date:** 2025-10-29
**Status:** Accepted
**Decision Makers:** Development Team, Business Analyst

## Context

In a microservices architecture, data management is a critical decision. The team needed to decide between:
1. **Shared database** - All services access a single database
2. **Database-per-service** - Each service has its own database

The project aims to build a true microservices architecture where services are independently deployable, scalable, and maintainable.

## Decision

**Each microservice will have its own dedicated PostgreSQL database.**

Service-to-database mapping:
- Core Service → `core_db` (users, tenants, roles, file_metadata)
- Notes Service → `notes_db` (notes, attachments, folders)
- Kanban Service → `kanban_db` (boards, columns, todos, comments)
- Admin Service → `admin_db` (system_logs, metrics, alerts)

Services will **not** share databases or perform cross-database joins. Inter-service data access will be via HTTP APIs or events (Kafka in Phase 2).

## Alternatives Considered

### Option 1: Shared Database (Monolithic Data Layer)
- **Pros:**
  - Simple joins across entities
  - ACID transactions across services
  - Single schema to maintain
- **Cons:**
  - Tight coupling between services
  - Single point of failure
  - Cannot scale databases independently
  - Deployment dependencies (schema changes affect all services)
  - Not true microservices

### Option 2: Hybrid Approach (Some Shared, Some Separate)
- **Pros:**
  - Balance between simplicity and independence
- **Cons:**
  - Inconsistent architecture
  - Confusing boundaries
  - Team doesn't learn true microservices patterns

## Consequences

### Positive
- **Service independence**: Each service can evolve its schema without affecting others
- **Fault isolation**: Database failures don't cascade across services
- **Independent scaling**: Scale databases based on service-specific load (e.g., Kanban DB under heavy load, Notes DB not)
- **Technology flexibility**: Can use different database technologies per service in future (e.g., MongoDB for Form Builder responses)
- **Clear ownership**: Each team/service owns its data completely
- **Deployment independence**: Can deploy Core Service without touching Notes database

### Negative
- **No cross-service joins**: Cannot write `SELECT * FROM core_db.users JOIN notes_db.notes` queries
- **Data consistency challenges**: Distributed transactions require eventual consistency patterns
- **Duplicate data**: Some data may need to be duplicated (e.g., user names in multiple services)
- **Increased complexity**: More databases to manage, backup, monitor
- **Higher infrastructure cost**: 4 databases vs 1 (mitigated by managed PostgreSQL)

### Neutral
- **HTTP calls for cross-service data**: Notes Service calls Core Service API to get user details (acceptable latency)
- **Event-driven architecture in Phase 2**: Kafka enables eventual consistency patterns

## Implementation Notes

1. **Logical foreign keys only:**
```typescript
// notes-api/src/entities/note.entity.ts
@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;  // Logical FK to core_db.tenants

  @Column('uuid')
  user_id: string;  // Logical FK to core_db.users (no DB constraint)

  @Column()
  title: string;

  @Column('text')
  content: string;
}
```

2. **Inter-service communication via HTTP:**
```typescript
// notes-api/src/users/users-client.service.ts
@Injectable()
export class UsersClientService {
  constructor(private httpService: HttpService) {}

  async getUserDetails(userId: string, token: string): Promise<User> {
    const response = await this.httpService
      .get(`${CORE_SERVICE_URL}/api/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .toPromise();

    return response.data.data;
  }
}
```

3. **Database connection configuration per service:**
```typescript
// core-api/src/app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.CORE_DB_HOST,
      port: 5432,
      database: 'core_db',
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false,  // Use migrations
      migrations: [__dirname + '/migrations/*{.ts,.js}']
    })
  ]
})
export class AppModule {}
```

4. **Backup strategy:**
- Each database backed up independently
- DigitalOcean Managed PostgreSQL includes daily automated backups
- Point-in-time recovery per database
- Restore strategy documented per service

5. **Migration strategy:**
- Each service has its own migration folder
- Migrations run independently per service
- No cross-database migration dependencies

## References

- [Microservices Pattern: Database per Service](https://microservices.io/patterns/data/database-per-service.html)
- [NestJS Microservices Documentation](https://docs.nestjs.com/microservices/basics)
- [Project Brief](../brief.md) - Architecture section
- [Architecture Design](../architecture-design.md) - Database Architecture section
