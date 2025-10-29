# Epic 2: Core Service & Dashboard

**Epic Goal:** Complete tenant self-service onboarding, user invitation and join request workflows, service enablement configuration, file upload service, and Angular dashboard UI providing central navigation hub for all microservices. Users can register organizations, manage teams, and navigate to available services.

## Story 2.1: Tenant Self-Service Registration UI

**As a** new user,
**I want** a registration form to create my organization account,
**so that** I can start using the platform immediately without sales interaction.

**Acceptance Criteria:**
1. Angular registration form at mydomain.com/register with fields: company name, email, password, first name, last name
2. Client-side validation: email format, password strength (min 8 chars, 1 uppercase, 1 number), required fields
3. Form submission calls POST /auth/register with form data
4. Success: User redirected to /dashboard with JWT stored in localStorage
5. Error handling displays validation errors inline on form
6. "Already have account? Login" link navigates to /login
7. Responsive design works on mobile and desktop

## Story 2.2: Login UI & Token Management

**As a** returning user,
**I want** to login and access my dashboard,
**so that** I can use platform services.

**Acceptance Criteria:**
1. Angular login form at mydomain.com/login with email and password fields
2. Form submission calls POST /auth/login, receives JWT token
3. JWT stored in localStorage with key 'auth_token'
4. HttpInterceptor automatically adds Authorization: Bearer <token> header to all API requests
5. Invalid credentials display error message: "Invalid email or password"
6. Successful login redirects to /dashboard
7. "Forgot password?" link navigates to /forgot-password

## Story 2.3: User Invitation Flow

**As a** tenant admin,
**I want** to invite team members via email,
**so that** I can build my organization on the platform.

**Acceptance Criteria:**
1. POST /users/invite endpoint accepts email, role assignment (admin or user)
2. Invitation token generated and stored with 7-day expiration
3. Email sent with invitation link: mydomain.com/accept-invite?token=xyz
4. GET /users/invite/:token endpoint validates token and returns invitation details
5. User completes registration through invite link, automatically joins tenant
6. Invited user assigned specified role in user_tenant_roles table
7. Expired or invalid tokens show appropriate error message

## Story 2.4: User Join Request Flow

**As a** user,
**I want** to search for organizations and request to join,
**so that** I can access my company's workspace.

**Acceptance Criteria:**
1. GET /tenants/search?name=query endpoint returns matching tenant names (public search)
2. POST /tenants/:id/join-requests creates join request record with status: pending
3. Tenant admins see pending requests in dashboard notifications
4. PATCH /tenants/join-requests/:id endpoint allows admin to approve/reject request
5. Approved request creates user_tenant_roles entry granting access
6. Rejected request notifies user via email with reason (optional)
7. User can only have one pending request per tenant at a time

## Story 2.5: Service Enablement Configuration

**As a** tenant admin,
**I want** to enable/disable services for my organization,
**so that** I only pay for and see services I need.

**Acceptance Criteria:**
1. PATCH /tenants/:id/services endpoint accepts array of service names: ["notes", "kanban", "forms"]
2. Tenant enabled_services field updated in database
3. Future JWT tokens include updated enabledServices claim
4. GET /tenants/:id endpoint returns current enabled services
5. Only tenant admins can modify service enablement
6. Invalid service names rejected with validation error
7. Dashboard UI immediately reflects service availability changes

## Story 2.6: File Upload Service

**As a** service (Notes, Kanban, Forms),
**I want** centralized file upload capability,
**so that** I can handle attachments consistently across services.

**Acceptance Criteria:**
1. POST /files/presigned-url endpoint generates DigitalOcean Spaces presigned URL
2. Request includes: fileName, fileSize, mimeType, targetService (notes, kanban, forms)
3. Presigned URL scoped to tenant: bucket/{tenantId}/{service}/{fileId}
4. URL valid for 15 minutes
5. File metadata stored in files table: id, tenant_id, service, file_name, file_size, uploaded_by, created_at
6. GET /files/:id returns file metadata and download URL
7. DELETE /files/:id marks file as deleted (soft delete) and removes from Spaces

## Story 2.7: Dashboard UI - Service Cards & Navigation

**As a** logged-in user,
**I want** a dashboard showing available services,
**so that** I can navigate to the tools I need.

**Acceptance Criteria:**
1. Angular dashboard at mydomain.com/dashboard displays service cards
2. Each card shows: service icon, name, description, status (Available/Locked)
3. Available services have "Open" button redirecting to service subdomain
4. Locked services have "Request Access" button opening request modal
5. Service availability determined by JWT enabledServices claim
6. Top navigation includes: company name, user avatar/menu, logout option
7. Responsive grid layout: 3 columns desktop, 2 columns tablet, 1 column mobile

## Story 2.8: User & Team Management UI

**As a** tenant admin,
**I want** to view and manage team members,
**so that** I can control who has access to my organization.

**Acceptance Criteria:**
1. GET /tenants/:id/users endpoint returns all users in tenant with roles
2. Team management page displays user list with: name, email, role, status
3. Admin can change user role (admin ↔ user) via PATCH /users/:id/role
4. Admin can remove user from tenant (soft delete) via DELETE /tenants/:id/users/:userId
5. Invite user button opens modal with invitation form
6. Pending join requests shown in separate tab/section with approve/reject actions
7. Non-admin users see read-only team list without management controls

---
