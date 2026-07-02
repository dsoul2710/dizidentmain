# Security Checklist Sign-Off — DiziDental Dev Hardening

**Sign-off date:** 2026-07-02  
**Iteration:** Code quality & security hardening (brownfield, no new features)  
**Verifier:** AIdLC Build and Test phase (automated + documented manual steps)

---

## SEC findings

| ID | Description | Status | Evidence |
|----|-------------|--------|----------|
| SEC-001 | JWT required on `/api/**` | **Fixed** | U1 `SecurityConfig` |
| SEC-002 | BCrypt passwords + migrate-on-login | **Fixed** | U1 `LegacyCompatiblePasswordEncoder` |
| SEC-003 | CORS env allowlist | **Fixed** | U1 `app.cors.allowed-origins` |
| SEC-004 | Swagger publicly accessible | **Deferred** | U2-deferred-001 |
| SEC-005 | Object-level org scoping | **Partial** | U2 report scoping; clinical IDOR review deferred |
| SEC-006 | localStorage session data | **Partial** | U4-deferred-001; cookie JWT primary |

---

## Authentication & authorization

| Item | Status | Notes |
|------|--------|-------|
| Deny-by-default on protected API | Pass | 401 without valid JWT |
| `@PreAuthorize` on admin/report endpoints | Pass | UserController, report controllers |
| JSON 401/403 error responses | Pass | U1 handlers |
| Method security enabled | Pass | `@EnableMethodSecurity` |
| Clinical role matrix complete | Deferred | U2-deferred-004 |

---

## Data access & audit

| Item | Status | Notes |
|------|--------|-------|
| Report `findAll()` org leaks | Fixed | U2 AUD-H01–H04 |
| Controller → service → repository | Pass | U3 — 0 repo imports in controllers |
| WebSocket auth aligned with JWT | Deferred | U2-deferred-002 |
| Chat thread IDOR | Deferred | U2-deferred-003 |

---

## Infrastructure & ops

| Item | Status | Notes |
|------|--------|-------|
| JWT secret via env in production | Documented | Set `JWT_SECRET` for prod |
| CORS origins via env | Documented | `APP_CORS_ALLOWED_ORIGINS` |
| Login rate limiting | Deferred | U1-deferred-001 |
| Cookie secure flag | Configurable | `app.security.cookie-secure` |

---

## Test evidence

- `./gradlew test` — BUILD SUCCESSFUL (2026-07-02)
- `npm run build` — SUCCESS (2026-07-02)

---

## Sign-off statement

All **critical and high** security findings from inception are **resolved or explicitly deferred with tickets**. Automated test and build gates pass. Medium/low items are tracked in `findings-deferred.md` for follow-up iterations.

**Construction security hardening iteration: APPROVED for closure** (pending operator manual smoke test optional confirmation).
