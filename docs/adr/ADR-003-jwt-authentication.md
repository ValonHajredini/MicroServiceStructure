# ADR-003: JWT Authentication with HS256 (Phase 1)

**Date:** 2025-10-29
**Status:** Accepted
**Decision Makers:** Development Team, Security Review

## Context

The microservices architecture requires a stateless authentication mechanism that works across multiple services (Core, Notes, Kanban, Admin). Users should authenticate once and access all services without re-login.

Key requirements:
- Single Sign-On (SSO) across all services
- Stateless (no session storage)
- Simple implementation for learning team
- Secure enough for Phase 1 MVP

## Decision

**Use JWT (JSON Web Tokens) with HS256 symmetric signing for Phase 1.**

**Token Structure:**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "tenantId": "tenant-uuid",
  "roles": ["admin"],
  "enabledServices": ["notes", "kanban"],
  "iat": 1635724800,
  "exp": 1635811200
}
```

**Token Lifecycle:**
1. User logs in at Core Service → receives JWT
2. Angular stores JWT in `localStorage`
3. Every API call includes `Authorization: Bearer <token>` header
4. Each service validates JWT independently
5. Token expires after 24 hours → user must re-login

## Alternatives Considered

### Option 1: Session-Based Authentication
- **Pros:**
  - Server controls session lifetime
  - Can revoke sessions immediately
  - Familiar pattern for team
- **Cons:**
  - Requires session storage (Redis, database)
  - Not stateless (violates microservices principle)
  - Session replication across services is complex
  - Doesn't scale horizontally easily

### Option 2: OAuth2 with External Provider (Google, Microsoft)
- **Pros:**
  - No password management
  - Industry standard
  - Social login convenience
- **Cons:**
  - External dependency (provider downtime = app downtime)
  - Complex implementation for learning team
  - Not all users have Google/Microsoft accounts
  - Deferred to Phase 2+

### Option 3: JWT with RS256 (Asymmetric)
- **Pros:**
  - Private key only in Core Service (more secure)
  - Public key distributed to other services
  - Cannot forge tokens without private key
- **Cons:**
  - More complex key management
  - Requires public key distribution
  - Overkill for Phase 1
  - Can migrate to RS256 in Phase 2

## Consequences

### Positive
- **Stateless**: No session storage required, scales horizontally easily
- **Single Sign-On**: One login accesses all services
- **Simple implementation**: NestJS `@nestjs/jwt` and Passport make this straightforward
- **Independent validation**: Each service validates tokens without calling Core Service
- **Standard protocol**: Industry-standard authentication mechanism

### Negative
- **Token revocation challenge**: Cannot revoke tokens before expiration (24 hours)
  - *Mitigation:* Short expiration time (24 hours), implement blacklist in Phase 2 if needed
- **Shared secret security**: All services must have access to JWT_SECRET
  - *Mitigation:* Environment variable management, consider RS256 in Phase 2
- **XSS vulnerability**: JWT in localStorage vulnerable to XSS attacks
  - *Mitigation:* Angular sanitization, Content Security Policy headers, consider HttpOnly cookies in Phase 2
- **Token size**: JWT tokens larger than session IDs (adds bandwidth overhead)
  - *Mitigation:* Keep claims minimal, acceptable trade-off for stateless architecture

### Neutral
- **No refresh tokens in Phase 1**: Simple re-login flow, can add refresh tokens in Phase 2 if user feedback demands it
- **24-hour expiration**: Balance between security and UX (users re-login daily)

## Implementation Notes

1. **Core Service - Token Generation:**
```typescript
// core-api/src/auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(user: User): Promise<{ access_token: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      enabledServices: user.tenant.enabledServices,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400  // 24 hours
    };
    return {
      access_token: this.jwtService.sign(payload)
    };
  }
}
```

2. **All Services - Token Validation:**
```typescript
// shared JWT strategy
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

3. **Angular - HTTP Interceptor:**
```typescript
// core-ui/src/app/interceptors/auth.interceptor.ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('access_token');
    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}
```

4. **Environment Configuration:**
```bash
# .env (shared across all services)
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRATION=86400  # 24 hours in seconds
```

5. **Security Best Practices:**
- Use strong JWT_SECRET (minimum 256 bits)
- Store JWT_SECRET in environment variables (never commit to Git)
- Use HTTPS only (TLS 1.2+)
- Implement rate limiting on login endpoint (5 attempts per minute)
- Log failed authentication attempts

## Migration Path to RS256 (Phase 2+)

If security audit requires asymmetric signing:

1. Generate RSA key pair:
```bash
ssh-keygen -t rsa -b 4096 -m PEM -f jwt.key
openssl rsa -in jwt.key -pubout -outform PEM -out jwt.key.pub
```

2. Core Service uses private key to sign:
```typescript
jwtService.sign(payload, { algorithm: 'RS256', privateKey: fs.readFileSync('jwt.key') });
```

3. Other services use public key to verify:
```typescript
jwtService.verify(token, { algorithms: ['RS256'], publicKey: fs.readFileSync('jwt.key.pub') });
```

## POC Validation (2025-10-29)

**Status:** ✅ Decision validated through POC implementation

### POC Results

A comprehensive proof-of-concept was implemented to validate this decision (see [POC Documentation](../pocs/jwt-sso-pattern.md)).

**Key Findings:**

1. **HS256 Performance:**
   - Token generation: 2ms average
   - Token validation: < 1ms
   - Successfully demonstrated SSO across auth-service and resource-service

2. **RS256 Evaluation:**
   - Implementation complexity significantly higher
   - Key management requires additional infrastructure
   - Performance impact: ~5-10ms token generation (acceptable but slower)

3. **Decision Confirmation:**
   - HS256 confirmed as optimal choice for Phase 1
   - Simple deployment with shared secret via environment variables
   - Migration path to RS256 remains viable for future phases

**POC Components Built:**
- `poc/poc-auth-service/` - JWT token generation (HS256/RS256)
- `poc/poc-resource-service/` - JWT validation middleware
- `poc/poc-client/` - Angular demo with SSO flow

### Production Readiness

Based on POC findings, this ADR decision is **ready for Story 1.4 implementation** with the following confirmations:

- ✅ Token structure validated
- ✅ Passport JWT integration verified
- ✅ Tenant context extraction working
- ✅ Performance metrics acceptable (2ms generation)
- ✅ Security considerations documented
- ✅ Migration path to RS256 preserved

**Recommendation:** Proceed with HS256 implementation in Core Service (Story 1.4).

## References

- [JWT.io - Introduction to JSON Web Tokens](https://jwt.io/introduction)
- [NestJS JWT Authentication](https://docs.nestjs.com/security/authentication)
- [OWASP JWT Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Project Brief](../brief.md) - Authentication & Authorization Flow
- [POC Documentation](../pocs/jwt-sso-pattern.md) - Validation Results
