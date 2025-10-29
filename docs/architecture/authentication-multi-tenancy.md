# Authentication & Multi-Tenancy

## JWT-Based SSO Flow

**1. User Registration Flow:**
```
User → Core UI (Register Form)
  ↓
Core Service: POST /api/v1/auth/register
  - Create tenant record
  - Create admin user
  - Hash password (bcrypt)
  - Return success message
```

**2. Login Flow:**
```
User → Core UI (Login Form)
  ↓
Core Service: POST /api/v1/auth/login
  - Validate email/password
  - Generate JWT with claims:
    {
      sub: user.id,
      email: user.email,
      tenantId: tenant.id,
      roles: ['admin'],
      enabledServices: ['notes', 'kanban']
    }
  - Return JWT + user info
  ↓
Angular: Store JWT in localStorage
```

**3. Accessing Notes Service:**
```
User → Notes UI (notes.mydomain.com)
  ↓
Angular: Retrieve JWT from localStorage
  ↓
HTTP Request: GET /api/v1/notes
  Headers: { Authorization: 'Bearer <token>' }
  ↓
Notes Service:
  - Validate JWT signature
  - Extract tenantId from payload
  - Query: SELECT * FROM notes WHERE tenant_id = :tenantId
  - Return tenant-scoped notes
```

**4. JWT Validation in Each Service:**
```typescript
// shared JWT strategy in all services
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET  // Shared secret
    });
  }

  async validate(payload: JwtPayload) {
    // Return user context attached to request
    return {
      userId: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      roles: payload.roles,
      enabledServices: payload.enabledServices
    };
  }
}
```

---

## Multi-Tenancy Implementation

**Tenant Context Middleware:**
```typescript
// common/middleware/tenant-context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    // Extract tenant from JWT (attached by JwtStrategy)
    if (req.user && req.user.tenantId) {
      req.tenantId = req.user.tenantId;
    } else {
      throw new UnauthorizedException('Tenant context missing');
    }
    next();
  }
}
```

**Apply Middleware Globally:**
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply tenant context middleware to all routes
  app.use(new TenantContextMiddleware().use);

  await app.listen(3000);
}
```

**Tenant-Scoped Repository:**
```typescript
// notes/notes.service.ts
@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(Note) private notesRepo: Repository<Note>
  ) {}

  async findAll(tenantId: string): Promise<Note[]> {
    // Always filter by tenant_id
    return this.notesRepo.find({
      where: { tenant_id: tenantId }
    });
  }

  async create(createNoteDto: CreateNoteDto, tenantId: string, userId: string): Promise<Note> {
    const note = this.notesRepo.create({
      ...createNoteDto,
      tenant_id: tenantId,  // Inject tenant
      user_id: userId
    });
    return this.notesRepo.save(note);
  }
}
```

---

## Security Considerations

**1. JWT Security:**
- **Secret Management**: Store JWT_SECRET in environment variables
- **Algorithm**: HS256 (symmetric) for Phase 1, consider RS256 (asymmetric) later
- **Token Expiration**: 24 hours (configurable)
- **Refresh Tokens**: Deferred to Phase 2

**2. Password Security:**
- **Hashing**: bcrypt with 10 salt rounds
- **Password Reset**: Email-based token (expires 1 hour)
- **Rate Limiting**: Limit login attempts (5 per minute per IP)

**3. Tenant Isolation:**
- **Automatic Filtering**: `tenant_id` in WHERE clause for all queries
- **Middleware Enforcement**: Reject requests without tenant context
- **Testing**: Comprehensive isolation tests (cross-tenant data access)

**4. CORS Configuration:**
```typescript
// main.ts
app.enableCors({
  origin: [
    'http://localhost:4200',  // Local dev
    'https://mydomain.com',
    'https://notes.mydomain.com',
    'https://kanban.mydomain.com',
    'https://admin.mydomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

**5. Input Validation:**
```typescript
// DTOs with class-validator
export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsUUID()
  @IsOptional()
  folder_id?: string;
}
```

---
