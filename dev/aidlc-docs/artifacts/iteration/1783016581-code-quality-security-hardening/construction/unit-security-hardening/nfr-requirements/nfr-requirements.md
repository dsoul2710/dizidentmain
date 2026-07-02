# NFR Requirements — unit-security-hardening

Non-functional requirements for the security hardening construction unit (U1).

---

## Scope

U1 addresses **authentication, authorization foundation, password encoding, and CORS**. Object-level authorization (IDOR) across all controllers is primarily U2; U1 establishes deny-by-default and auth infrastructure.

---

## Performance Requirements

| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-PERF-01 | Login endpoint latency | No perceptible regression vs current; acceptable for local dev (~< 500ms typical) | Single-user clinic HMS; no load test in U1 |
| NFR-PERF-02 | JWT filter overhead | < 5ms per request excluding DB lookup for UserDetails | Stateless filter; cache UserDetails optional future |
| NFR-PERF-03 | BCrypt cost factor | Strength 10 (Spring default) | Balance security vs login time |
| NFR-PERF-04 | Permission bootstrap | One-time at first login only | Avoid repeated DB writes |

**Measurement:** Manual smoke test + optional `@SpringBootTest` timing; no formal perf test gate for U1.

---

## Scalability Requirements

| ID | Requirement | Notes |
|----|-------------|-------|
| NFR-SCALE-01 | Concurrent users | N/A — monolith local/dev; no horizontal scaling in this iteration |
| NFR-SCALE-02 | Stateless auth | JWT + no server session store — supports future horizontal scale |
| NFR-SCALE-03 | Connection pooling | Existing HikariCP defaults sufficient |

---

## Availability & Reliability Requirements

| ID | Requirement | Notes |
|----|-------------|-------|
| NFR-AVAIL-01 | Auth path fail-closed | Invalid/missing JWT → 401; never bypass to anonymous on protected routes (SECURITY-15) |
| NFR-AVAIL-02 | Login transaction | Password rehash + user update atomic; rollback on failure |
| NFR-AVAIL-03 | Database unavailable | GlobalExceptionHandler returns safe error; no credential leakage |
| NFR-REL-01 | Critical workload | Auth classified **Critical** (Resiliency RESILIENCY-01) — clinic unusable without login |

**RTO/RPO:** Not defined this iteration (local dev focus); deferred to Operations placeholder.

---

## Security Requirements

### Primary (U1 must implement)

| ID | Requirement | Maps to |
|----|-------------|---------|
| NFR-SEC-01 | Deny-by-default API auth | SEC-001, SECURITY-08 |
| NFR-SEC-02 | BCrypt password storage + migrate-on-login | SEC-002, SECURITY-12 |
| NFR-SEC-03 | Restrictive CORS allowlist with credentials | SEC-003, SECURITY-08 |
| NFR-SEC-04 | Server-side JWT validation every request | SECURITY-08 |
| NFR-SEC-05 | `@PreAuthorize` on UserController and auth-adjacent admin endpoints | SECURITY-08, SECURITY-06 |
| NFR-SEC-06 | `@Valid` on LoginRequest; max length on mobile/password | SECURITY-05 |
| NFR-SEC-07 | Generic auth error messages | SECURITY-09, SECURITY-15, BR-AUTH-01 |
| NFR-SEC-08 | No passwords/tokens/PII in logs | SECURITY-03, BR-PWD-03 |
| NFR-SEC-09 | JWT secret from environment; no hardcoded production secrets | SECURITY-12, SECURITY-09 |
| NFR-SEC-10 | HttpOnly + SameSite cookie; Secure configurable | SECURITY-12, BR-AUTH-04 |
| NFR-SEC-11 | GlobalExceptionHandler for auth exceptions | SECURITY-15 |
| NFR-SEC-12 | Security logic in dedicated module (`security/`, `AuthService`) | SECURITY-11 |

### Deferred (ticket in aidlc-docs)

| ID | Requirement | Reason |
|----|-------------|--------|
| NFR-SEC-D01 | Login rate limiting / account lockout | Q10 defer medium; SECURITY-12 partial |
| NFR-SEC-D02 | MFA for admin accounts | Out of scope; future iteration |
| NFR-SEC-D03 | Swagger auth restriction | SEC-004 medium — U2 ticket |
| NFR-SEC-D04 | Breached password list check | Future enhancement |
| NFR-SEC-D05 | Security alerting (CloudWatch alarms) | No cloud deploy this iteration; SECURITY-14 N/A local |
| NFR-SEC-D06 | Dependency vulnerability scanner in CI | SECURITY-10 — document in build-and-test |

### Object-level authorization

| ID | Requirement | Unit |
|----|-------------|------|
| NFR-SEC-13 | Org header validation via OrgContextService | U1 foundation |
| NFR-SEC-14 | IDOR checks on all resource endpoints | U2 audit (full controller coverage) |

---

## Security Baseline Compliance Matrix (U1)

| Rule | Status | U1 action / rationale |
|------|--------|------------------------|
| SECURITY-01 | N/A (local) | Document TLS for production JDBC and HTTPS |
| SECURITY-02 | N/A | No load balancer/API gateway in dev |
| SECURITY-03 | **Implement** | MdcLoggingFilter + SLF4J; no PII in logs; traceId in MDC |
| SECURITY-04 | N/A (API) | JSON API not HTML; frontend headers in U4/nginx note |
| SECURITY-05 | **Implement** | `@Valid` LoginRequest; JPA parameterized queries (existing) |
| SECURITY-06 | **Partial** | Role-based `@PreAuthorize`; full least-privilege per endpoint in U2 |
| SECURITY-07 | N/A | No cloud network config in scope |
| SECURITY-08 | **Implement** | Core U1 deliverable |
| SECURITY-09 | **Implement** | Remove TEMP permitAll; generic errors; no default creds in code |
| SECURITY-10 | **Partial** | Gradle lock via gradle.lockfile if present; scan deferred to build-and-test |
| SECURITY-11 | **Partial** | Dedicated security module; rate limit deferred D01 |
| SECURITY-12 | **Partial** | BCrypt + cookie attrs + session expiry; MFA/brute-force deferred |
| SECURITY-13 | Compliant | JPA/Jackson standard deserialization; no unsafe custom deser |
| SECURITY-14 | N/A (local) | No centralized alerting infra; log auth failures at WARN |
| SECURITY-15 | **Implement** | Fail closed; GlobalExceptionHandler |

**Blocking for U1 code generation:** All **Implement** and **Partial** rows must be addressed or explicitly ticketed with user-approved deferral (D01–D06).

---

## Resiliency Baseline (design-time)

| Rule | Application to U1 |
|------|---------------------|
| RESILIENCY-01 | Auth = Critical workload; documented in components.md |
| RESILIENCY-02 | DR targets deferred (local dev) |
| RESILIENCY-03–04 | CI/CD unchanged this unit |
| Error handling | Auth failures fail closed; no partial auth state |

---

## Maintainability Requirements

| ID | Requirement |
|----|-------------|
| NFR-MAINT-01 | AuthService extracts login logic from controller — single place to change |
| NFR-MAINT-02 | CORS origins externalized to `application.properties` / env |
| NFR-MAINT-03 | Security config removes TEMP comments; clear public endpoint list |
| NFR-MAINT-04 | Tests for changed auth code only (FR-5.1) |

---

## Testability Requirements

| ID | Requirement |
|----|-------------|
| NFR-TEST-01 | Integration test: login success returns cookie |
| NFR-TEST-02 | Integration test: GET `/api/users` without cookie → 401 |
| NFR-TEST-03 | Unit test: password migration rehash on legacy password |
| NFR-TEST-04 | PBT optional: LoginResponse JSON round-trip (PBT extension) |

---

## Usability Requirements

| ID | Requirement |
|----|-------------|
| NFR-USE-01 | Login UX unchanged — same LoginPage contract |
| NFR-USE-02 | 401 responses must not break frontend; existing axios error handling applies |
| NFR-USE-03 | Cookie SameSite Lax preserves local dev SPA flow |

---

## Compliance & Regulatory

| ID | Requirement | Notes |
|----|-------------|-------|
| NFR-COMP-01 | Clinical data (PHI) | Auth protects access; full HIPAA not assessed this iteration |
| NFR-COMP-02 | Audit trail for auth events | Log login success/failure at INFO/WARN without PII |

---

## Logging Requirements (SECURITY-03 detail)

| Event | Level | Fields | Excluded |
|-------|-------|--------|----------|
| Request received | INFO | method, uri, traceId, IP | body, cookies |
| Response sent | INFO | status, duration, traceId | |
| Login success | INFO | userId (optional), role | password, token |
| Login failure | WARN | mobile hash or omit mobile | password |
| Auth denied | WARN | uri, traceId | token value |

---

## Configuration Requirements

| Property | Required | Example |
|----------|----------|---------|
| `app.cors.allowed-origins` | Yes | `http://localhost:5173,http://127.0.0.1:5173` |
| `app.security.cookie-secure` | Yes | `false` (dev), `true` (prod profile) |
| JWT secret / signing key | Yes | From env var |
| `spring.profiles.active` | Optional | `dev` vs `prod` behavior for cookie secure |

Document in `.env.example` when code is generated.

---

## Acceptance Criteria (NFR gate for U1)

1. Security Baseline **Implement** rules satisfied in code or documented deferral ticket
2. No `permitAll` on protected API paths
3. CORS not wildcard with credentials
4. BCrypt default encoder active
5. Auth integration tests pass
6. `./gradlew test` passes
