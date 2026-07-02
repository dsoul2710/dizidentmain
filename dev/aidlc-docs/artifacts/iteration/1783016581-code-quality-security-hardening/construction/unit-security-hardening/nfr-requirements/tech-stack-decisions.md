# Tech Stack Decisions — unit-security-hardening

Technology choices for U1. **No new frameworks** per `tech-env.md` — harden existing stack only.

---

## Decision Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| Auth framework | Spring Security 6 (via Spring Boot 4) | Already in use; filter chain + method security |
| Token format | JWT (jjwt 0.11.5) | Existing `JwtUtil`; HTTP-only cookie transport |
| Password hashing | BCrypt via `BCryptPasswordEncoder` | SECURITY-12; industry standard |
| Legacy passwords | `DelegatingPasswordEncoder` | Supports migrate-on-login without schema change |
| Method authorization | `@EnableMethodSecurity` + `@PreAuthorize` | Q5 user answer; declarative role checks |
| HTTP client (frontend) | Axios unchanged | Out of scope U1; must continue `withCredentials: true` |
| Validation | Jakarta Bean Validation (`@Valid`) | Already on classpath via spring-boot-starter-validation |
| Logging | SLF4J + Logback + MdcLoggingFilter | Existing; satisfies SECURITY-03 for app logging |
| API documentation | springdoc-openapi | Unchanged; SEC-004 deferred |
| Testing | JUnit 5 + `@SpringBootTest` + `@AutoConfigureMockMvc` | Existing project standard |

---

## Rejected Alternatives

| Alternative | Reason rejected |
|-------------|-----------------|
| OAuth2 / OIDC provider | Out of scope — harden existing JWT model |
| Session-based server sessions | Conflicts with stateless JWT design |
| Argon2 instead of BCrypt | BCrypt sufficient; Spring first-class support; minimize change |
| API key auth | Not used by frontend SPA |
| Replace jjwt library | Unnecessary churn for this iteration |

---

## Spring Security Configuration Decisions

| Decision | Choice |
|----------|--------|
| CSRF | Disabled — stateless JWT cookie API (existing) |
| Session creation | `STATELESS` |
| Filter order | MdcLoggingFilter → JwtAuthenticationFilter → UsernamePasswordAuthenticationFilter |
| Public endpoints | Explicit `requestMatchers` allowlist |
| Authority prefix | `ROLE_` (Spring default matches `CustomUserDetails`) |

---

## Password Encoder Configuration

```text
DelegatingPasswordEncoder
  defaultId: bcrypt
  encoders:
    bcrypt -> BCryptPasswordEncoder (strength 10)
    noop   -> NoOpPasswordEncoder (legacy transition only)

Migration strategy:
  - On login, if stored password has no {id} prefix, prepend {noop} for match OR
    use matches() with upgrade path to encode as {bcrypt}...
  - After successful login, persist BCrypt hash only
```

---

## CORS Configuration

| Setting | Value |
|---------|-------|
| Source | `CorsConfigurationSource` bean in `SecurityConfig` |
| Origins | Parsed from `app.cors.allowed-origins` property |
| Credentials | `true` (required for cookies) |
| Paths | `/api/**`, `/ws/**` |

**Not used:** `allowedOriginPatterns("*")`

---

## JWT Configuration

| Setting | Source |
|---------|--------|
| Cookie name | `hms_token` (unchanged) |
| Signing key | Environment / `application.properties` — audit for hardcoding |
| TTL | 1 hour (existing `JwtUtil`) |
| Validation | Signature + expiry on every request in filter |

---

## New Java Classes (tech mapping)

| Class | Package | Framework |
|-------|---------|-----------|
| `AuthService` | `com.clinic.hms.service` | `@Service`, `@Transactional` |
| `UserService` | `com.clinic.hms.service` | `@Service` |
| `OrgContextService` | `com.clinic.hms.service` | `@Service`, delegates `SecurityUtils` |
| Auth exceptions | `com.clinic.hms.exception` or `security` | `@ResponseStatus` / handler mapping |

---

## Properties / Environment

| Key | Type | Dev default |
|-----|------|-------------|
| `app.cors.allowed-origins` | String (CSV) | localhost:5173, 127.0.0.1:5173 |
| `app.security.cookie-secure` | boolean | false |
| `jwt.secret` or existing key prop | String | From `.env` (not committed) |

Add to `.env.example` during code generation.

---

## Testing Stack

| Tool | Use in U1 |
|------|-----------|
| JUnit 5 | Unit + integration tests |
| MockMvc | Auth boundary tests |
| `@WithMockUser` | Optional for `@PreAuthorize` tests |
| Testcontainers | Not required — use H2 or existing test profile if configured |
| jqwik (PBT) | Optional if added to Gradle; else manual property tests |

Check existing `build.gradle` for test dependencies before code gen.

---

## Docker / Local Dev Impact

| Component | Change |
|-----------|--------|
| `docker-compose.yml` | Optional: pass `APP_CORS_ALLOWED_ORIGINS` env to backend |
| Backend Dockerfile | No change |
| Frontend | No change in U1 |

---

## Dependency Versions (unchanged)

| Dependency | Version |
|------------|---------|
| Spring Boot | 4.0.0 |
| Java | 21 |
| jjwt | 0.11.5 |
| PostgreSQL driver | Managed by Spring Boot BOM |

No Gradle dependency additions expected for U1 core security.

---

## Security Extension Traceability

Tech choices directly address:

- **SECURITY-08** — Spring Security filter + method security
- **SECURITY-12** — BCrypt + secure cookies
- **SECURITY-05** — Jakarta validation
- **SECURITY-03** — SLF4J/MDC (no new log stack)

---

## NFR Design Handoff

Next stage (**NFR Design**) will specify:

- Security filter chain diagram
- Error response schema for 401/403
- Log field standards
- Test matrix mapping to NFR-TEST-* IDs
