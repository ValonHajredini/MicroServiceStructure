# Security Architecture

## Threat Model

**Assets:**
- User credentials (passwords, JWT tokens)
- Tenant data (notes, kanban boards, form responses)
- File uploads (attachments, images)

**Threats:**
1. **Cross-Tenant Data Leaks** - Tenant A accessing Tenant B's data
2. **Unauthorized Access** - Unauthenticated users accessing protected endpoints
3. **JWT Theft** - Stolen tokens used to impersonate users
4. **SQL Injection** - Malicious SQL in user inputs
5. **XSS Attacks** - Malicious scripts in user content
6. **CSRF Attacks** - Unauthorized state-changing requests

**Mitigations:**

| Threat | Mitigation | Implementation |
|--------|-----------|----------------|
| Cross-Tenant Data Leaks | Automatic `tenant_id` filtering | Middleware + TypeORM where clauses |
| Unauthorized Access | JWT authentication guards | `@UseGuards(JwtAuthGuard)` on all routes |
| JWT Theft | Short token expiration (24h) | JWT `exp` claim |
| SQL Injection | Parameterized queries | TypeORM (no raw SQL) |
| XSS | Angular sanitization + CSP | DomSanitizer + CSP headers |
| CSRF | CSRF tokens (future) | Phase 2 enhancement |

---

## Security Checklist

**Authentication & Authorization:**
- [x] JWT with expiration (24 hours)
- [x] Password hashing with bcrypt (10 rounds)
- [x] Role-based access control (admin, user)
- [ ] Refresh token mechanism (Phase 2)
- [ ] Two-factor authentication (Phase 3+)

**Data Protection:**
- [x] HTTPS only (TLS 1.2+)
- [x] Tenant isolation via `tenant_id`
- [x] Input validation (class-validator)
- [ ] Data encryption at rest (Phase 2)
- [ ] Audit logging (Phase 2)

**API Security:**
- [x] CORS whitelist
- [x] Rate limiting (5 login attempts/minute)
- [x] JWT validation in every service
- [ ] API key management (Phase 2)
- [ ] Request signing (Phase 3+)

**File Security:**
- [x] Presigned URLs (DigitalOcean Spaces)
- [x] File size limits (25MB)
- [x] Tenant-scoped storage paths
- [ ] Virus scanning (Phase 2)
- [ ] Content-Type validation (Phase 1)

---
