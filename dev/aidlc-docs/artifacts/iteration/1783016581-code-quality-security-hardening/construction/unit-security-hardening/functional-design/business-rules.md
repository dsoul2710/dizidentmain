# Business Rules — unit-security-hardening

Validation logic, security policies, and error handling for U1.

---

## Authentication Rules

### BR-AUTH-01: Credential verification

- Login MUST reject invalid mobile/password with a **single generic message**: `"Invalid mobile or password"`.
- MUST NOT reveal whether mobile exists (prevent user enumeration).
- Invalid credentials → HTTP 401 via `GlobalExceptionHandler` (replace raw `RuntimeException`).

### BR-AUTH-02: Active user only

- Users with `isActive == false` MUST NOT receive JWT.
- Error message: `"User is inactive"` → HTTP 403.

### BR-AUTH-03: JWT required on protected API

- All `/api/**` endpoints except:
  - `POST /api/auth/login`
  - `/actuator/health`
  - Swagger/OpenAPI paths (`/swagger-ui/**`, `/v3/api-docs/**`, etc.)
- Missing/invalid JWT → HTTP 401, no body leakage of internal details.

### BR-AUTH-04: JWT cookie attributes

| Attribute | Value | Rule |
|-----------|-------|------|
| Name | `hms_token` | Unchanged (frontend depends on cookie auth) |
| HttpOnly | true | Required |
| Secure | configurable | `false` local HTTP; `true` when HTTPS enabled |
| SameSite | Lax | Required for SPA cross-origin with credentials |
| Path | `/` | Required |
| Max-Age | 3600s | 1 hour (unchanged) |

### BR-AUTH-05: JWT claims

- Token contains: userId, role, mobile (existing `JwtUtil` contract).
- Token validation MUST check expiry and signature before setting `SecurityContext`.

---

## Password Rules

### BR-PWD-01: Encoding algorithm

- Default encoder ID: `bcrypt` (BCryptPasswordEncoder strength 10).
- Legacy support via `DelegatingPasswordEncoder` with `{noop}` id for transition.

### BR-PWD-02: Migrate-on-login

- When `matches()` succeeds against legacy stored password:
  - MUST re-encode with BCrypt before returning login response.
  - MUST persist in same transaction.
- After migration, stored value MUST NOT contain `{noop}`.

### BR-PWD-03: No plain text in logs

- Passwords MUST NOT appear in logs, MDC, or exception messages.

### BR-PWD-04: CustomUserDetails

- `getPassword()` returns stored hash only; never logged.

---

## Authorization Rules

### BR-AUTHZ-01: Role authorities

- Spring authorities: `ROLE_{UserRole.name()}` (e.g. `ROLE_DOCTOR`).
- `@PreAuthorize("hasRole('SUPER_ADMIN')")` or `hasAnyRole(...)` on U1 endpoints:
  - `UserController` list/get permissions → admin roles only (define exact roles in code gen from existing behavior).

### BR-AUTHZ-02: Method security enabled

- `@EnableMethodSecurity` on security configuration class.
- Prefer controller-level `@PreAuthorize`; service-level optional for U1.

### BR-AUTHZ-03: CSRF

- CSRF disabled (stateless JWT cookie API — existing pattern retained).

---

## CORS Rules

### BR-CORS-01: Allowlist only

- Origins from configuration property `app.cors.allowed-origins` (comma-separated).
- Default dev value: `http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000`
- MUST NOT use `allowedOriginPatterns("*")` with `allowCredentials(true)`.

### BR-CORS-02: WebSocket CORS

- `/ws/**` uses same origin allowlist as `/api/**`.

### BR-CORS-03: Methods and headers

- Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS.
- Allowed headers: Authorization, Content-Type, X-Active-Org-Id, X-Requested-With.
- `allowCredentials`: true (required for cookies).

---

## Org Scoping Rules

### BR-ORG-01: Header name

- Active org header: `X-Active-Org-Id` (matches `AppConstants.Headers.ACTIVE_ORG_ID` and frontend `api.js`).

### BR-ORG-02: Doctor/SP mandatory org

- DOCTOR and SERVICE_PROVIDER requests to org-scoped endpoints MUST include valid `X-Active-Org-Id`.
- Missing header → 400 with clear message.
- Invalid mapping → 403.

### BR-ORG-03: OrgContextService contract

| Method | Behavior |
|--------|----------|
| `getActiveOrgId()` | Delegates to `SecurityUtils.getActiveOrgId()` |
| `requireActiveOrgId()` | Returns orgId or throws if null when required for role |
| `validateOrgAccess(userId, orgId)` | Explicit check via mapping repositories |

### BR-ORG-04: SUPER_ADMIN global access

- SUPER_ADMIN may operate without org header; services handle `orgId == null` as global scope (existing behavior preserved).

---

## Module Permission Rules

### BR-PERM-01: Bootstrap defaults

- If user has zero permissions at login, bootstrap defaults **unchanged** from current `AuthController.getOrBootstrapPermissions()` logic per role.
- Bootstrap MUST be transactional.

### BR-PERM-02: Permission response shape

- `ModulePermissionResponse`: moduleName, canView, canEdit, canDelete — unchanged for frontend compatibility.

---

## Error Handling Rules

### BR-ERR-01: Auth exceptions

| Scenario | HTTP | Response |
|----------|------|----------|
| Bad credentials | 401 | Generic message |
| Inactive user | 403 | Inactive message |
| Missing JWT on protected route | 401 | Standard Spring or custom handler |
| @PreAuthorize denial | 403 | Access denied |
| Missing org header (doctor) | 400 | Header missing message |
| Invalid org mapping | 403 | Not associated with clinic |

### BR-ERR-02: GlobalExceptionHandler

- Replace `RuntimeException` throws in auth flow with typed exceptions (`AuthenticationException`, `AccessDeniedException`, or custom `AuthException`).
- Include `traceId` from MDC in error body (existing pattern).

---

## Configuration Rules

### BR-CFG-01: Externalized secrets

| Property | Purpose |
|----------|---------|
| `app.cors.allowed-origins` | CORS allowlist |
| `app.security.cookie-secure` | JWT cookie Secure flag |
| `jwt.secret` / existing JWT config | Signing key from env (verify not hardcoded) |

### BR-CFG-02: Docker Compose

- Document CORS env var in `aidlc-docs` or `.env.example` for local stack.

---

## Security Baseline Alignment (U1)

| Rule ID | U1 action |
|---------|-----------|
| SECURITY-05 | LoginRequest validation via `@Valid` |
| SECURITY-03 | Structured logging via MdcLoggingFilter — no PII in logs |
| SECURITY-08 | No hardcoded credentials in SecurityConfig |
| SECURITY-09 | Auth failure generic messages (BR-AUTH-01) |

Other SECURITY rules addressed in NFR Requirements/Design stage or marked N/A for local-only deployment.
