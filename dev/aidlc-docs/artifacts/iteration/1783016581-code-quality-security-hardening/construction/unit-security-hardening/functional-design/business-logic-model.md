# Business Logic Model — unit-security-hardening

Technology-agnostic description of security and authentication workflows for U1.

---

## Actors

| Actor | Description |
|-------|-------------|
| **Anonymous client** | Unauthenticated HTTP caller (browser or API client) |
| **Authenticated user** | User with valid JWT in `hms_token` HttpOnly cookie |
| **Spring Security filter chain** | Validates JWT and populates `SecurityContext` |
| **AuthService** | Orchestrates login, password migration, profile resolution |
| **UserService** | User listing and permission queries (admin operations) |
| **OrgContextService** | Resolves and validates active org for multi-tenant requests |

---

## Core Workflows

### WF-1: User Login

```text
Input:  mobile, password
Output: LoginResponse + Set-Cookie hms_token

1. Validate LoginRequest (mobile not blank, password not blank)
2. Find User by mobile
   - Not found → generic auth failure (no user enumeration)
3. Verify password via PasswordEncoder.matches
   - Fail → generic auth failure
4. If password stored without BCrypt prefix and matches:
   - Re-encode with BCrypt
   - Persist updated hash on User
5. Check user.isActive == true
   - False → inactive user error
6. Generate JWT (userId, role, mobile)
7. Build HttpOnly cookie (hms_token, maxAge 1h, SameSite Lax)
8. Resolve display name by UserRole (patient/doctor/org/provider/admin)
9. Load or bootstrap ModulePermissions for user
10. Return LoginResponse + cookie header
11. Update user.updatedAt
```

### WF-2: Authenticated API Request

```text
Input:  HTTP request with optional hms_token cookie
Output: Controller response or 401/403

1. MdcLoggingFilter assigns trace/correlation ID
2. JwtAuthenticationFilter extracts hms_token from cookies
3. If token valid:
   - Load UserDetails by mobile from JWT
   - Set SecurityContext authentication with ROLE_* authority
4. If token missing/invalid on protected path:
   - SecurityFilterChain returns 401 Unauthorized
5. If @PreAuthorize fails:
   - Return 403 Forbidden
6. Controller invokes service layer
7. OrgContextService called when org scope required
```

### WF-3: Password Migration (migrate-on-login)

```text
Trigger: Successful login with legacy plain-text hash

1. PasswordEncoder is DelegatingPasswordEncoder (idForEncode=bcrypt)
2. Stored password formats supported:
   - {bcrypt}...  → already migrated
   - {noop}plain  → explicit legacy
   - plain text without prefix → treat as legacy (transition: prefix with noop for match)
3. On successful match with legacy format:
   - newHash = bcrypt.encode(plainPassword)
   - user.password = newHash (with {bcrypt} prefix via encoder)
   - save user in same transaction as login timestamp update
```

### WF-4: Org Context Resolution

```text
Input:  Authenticated user + optional X-Active-Org-Id header
Output: orgId or exception

Role-specific rules (existing SecurityUtils logic, exposed via OrgContextService):

| Role | Org resolution |
|------|----------------|
| SUPER_ADMIN | null (global) or header if provided |
| ORG_HOSPITAL | userId IS orgId |
| DOCTOR | Require X-Active-Org-Id; verify doctor-org mapping ACTIVE |
| SERVICE_PROVIDER | Require header; verify SP-org mapping ACTIVE |
| PATIENT | Optional header; if present verify patient-org mapping |
| Other | null |

Failure modes:
- Missing required header → 400 IllegalArgumentException → mapped by GlobalExceptionHandler
- Invalid mapping → 403 SecurityException
```

### WF-5: Module Permission Bootstrap

```text
Trigger: User has zero ModulePermission rows at login

1. Determine default module list by UserRole (existing AuthController logic)
2. Create ModulePermission rows (canView, canEdit, canDelete flags per role)
3. Persist permissions
4. Return as ModulePermissionResponse list in LoginResponse

Note: Bootstrap logic moves unchanged to AuthService.getOrBootstrapPermissions()
```

### WF-6: User List (admin)

```text
Input:  optional role filter
Output: List<UserSummaryResponse>

Precondition: Authenticated; @PreAuthorize admin or user-management role
1. Query users by role or all
2. Resolve display name per role (same mapping as login)
3. Return summary DTOs (no password exposure)
```

---

## State Transitions

### User authentication state (request-scoped)

```text
Anonymous ──login success──> Authenticated (JWT in cookie)
Authenticated ──cookie expired/missing──> Anonymous (401 on protected routes)
Authenticated ──logout──> Anonymous (cookie cleared)
```

### Password storage state (persistent)

```text
Legacy plain ──first successful login──> BCrypt hash
BCrypt hash ──subsequent login──> unchanged (verify only)
```

---

## Integration Points

| Integration | Direction | Data |
|-------------|-----------|------|
| Frontend LoginPage | In | mobile, password |
| Frontend LoginPage | Out | LoginResponse JSON + cookie |
| Frontend api.js | Out | X-Active-Org-Id header on requests |
| PostgreSQL | Both | users, module_permissions, role profile tables |
| JwtUtil | Internal | Token create/validate |

---

## Testable Properties (PBT candidates)

| Property | Category | Invariant |
|----------|----------|-----------|
| LoginResponse serialization | Round-trip | JSON serialize/deserialize preserves fields |
| BCrypt rehash | Idempotence | Second login does not re-hash BCrypt password |
| JWT validate | Oracle | Token from generateToken always validates within TTL |
| Permission bootstrap | Invariant | Bootstrap creates same module set for same role |

Detailed PBT specs in Code Generation planning.

---

## Out of Scope (U1)

- Per-controller `@PreAuthorize` on all 22 controllers (U2 audit applies patterns)
- WebSocket STOMP auth (U2)
- Frontend localStorage changes (U4)
- Swagger restriction (SEC-004 deferred ticket)
