# API Contracts & Communication

## API Design Principles

1. **RESTful Design** - Standard HTTP methods (GET, POST, PUT, DELETE)
2. **Versioning** - URL-based versioning (`/api/v1/`, `/api/v2/`)
3. **Consistent Response Format** - Standard error/success responses
4. **OpenAPI 3.0** - Swagger documentation for all endpoints
5. **HATEOAS (Optional)** - Hypermedia links in responses (future)

---

## Standard Response Format

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "My Note",
    "content": "Note content..."
  },
  "meta": {
    "timestamp": "2025-10-29T10:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required",
    "details": {
      "field": "title",
      "constraint": "isNotEmpty"
    }
  },
  "meta": {
    "timestamp": "2025-10-29T10:00:00Z",
    "requestId": "req-12345"
  }
}
```

**Paginated Response:**
```json
{
  "success": true,
  "data": [
    { "id": "1", "title": "Note 1" },
    { "id": "2", "title": "Note 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Inter-Service Communication

**Phase 1: HTTP/REST**
- Services call each other via HTTP APIs
- JWT passed in `Authorization` header
- Synchronous request/response

**Example: Notes Service calling Core Service for file metadata**
```typescript
// notes-api/src/files/files-client.service.ts
@Injectable()
export class FilesClientService {
  constructor(private httpService: HttpService) {}

  async getFileMetadata(fileId: string, token: string): Promise<FileMetadata> {
    const response = await this.httpService
      .get(`${CORE_SERVICE_URL}/api/v1/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .toPromise();

    return response.data.data;
  }
}
```

**Phase 2: Event-Driven (Kafka)**
- Asynchronous events for Form Builder → Kanban
- Decouples services
- Deferred to Phase 2+

---

## Shared Types Library

**Monorepo Structure:**
```
MicroServiceStructure/
├── libs/
│   └── shared-types/
│       ├── src/
│       │   ├── auth/
│       │   │   ├── jwt-payload.interface.ts
│       │   │   └── user.interface.ts
│       │   ├── tenants/
│       │   │   └── tenant.interface.ts
│       │   ├── notes/
│       │   │   ├── note.dto.ts
│       │   │   └── note.interface.ts
│       │   └── index.ts
│       └── package.json
```

**Example: Shared JWT Payload**
```typescript
// libs/shared-types/src/auth/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string;          // User ID
  email: string;
  tenantId: string;
  roles: string[];      // ['admin', 'user']
  enabledServices: string[];  // ['notes', 'kanban']
  iat: number;
  exp: number;
}
```

**Usage in Services:**
```typescript
// core-api/src/auth/auth.service.ts
import { JwtPayload } from '@shared/types';

@Injectable()
export class AuthService {
  async generateToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      enabledServices: user.tenant.enabledServices,
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 86400  // 24 hours
    };
    return this.jwtService.sign(payload);
  }
}
```

---
