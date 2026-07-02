# Functional Design Plan — unit-security-hardening

## Unit Context

- **Unit**: U1 — unit-security-hardening
- **Scope**: Backend security foundation only (no frontend changes in this unit)
- **Requirements**: FR-1.1–FR-1.7, FR-5.1, FR-6.1; SEC-001–SEC-003

## Design Questions (resolved from requirements + codebase)

### Password migration encoding prefix

How should legacy plain-text passwords be detected for migrate-on-login?

A) `{noop}` prefix via `DelegatingPasswordEncoder` (Spring standard)  
B) Length/heuristic detection  
C) Separate migration flag column  
D) Other

[Answer]: A — use `DelegatingPasswordEncoder` with `{bcrypt}` default and `{noop}` for unmigrated hashes stored as `{noop}rawpassword` OR detect passwords without `{` prefix and treat as noop during transition

### Org context service vs SecurityUtils

`SecurityUtils.getActiveOrgId()` already validates org mappings. Should `OrgContextService` wrap it?

A) Yes — thin facade delegating to `SecurityUtils` for U1; extend in U2  
B) Replace SecurityUtils entirely in U1  
C) Other

[Answer]: A — `OrgContextService` delegates to existing `SecurityUtils`; avoids duplicate logic

### Public endpoints

Which paths remain unauthenticated?

A) `/api/auth/login`, `/actuator/health`, swagger paths only  
B) Also `/api/auth/logout` if added  
C) Other

[Answer]: A plus B — login public; logout requires valid session or is no-op safe

### Swagger in dev

SEC-004 medium — restrict swagger in U1?

A) Keep swagger open in dev profile only  
B) Require auth for swagger in all profiles  
C) Defer to U2 ticket  
D) Other

[Answer]: C — defer SEC-004 unless trivial; document ticket

### JWT cookie secure flag

A) `secure=false` for local HTTP; configurable via `app.security.cookie-secure`  
B) Always secure  
C) Other

[Answer]: A — match existing behavior; env-driven for production

---

## Execution Checklist

- [x] Analyze unit context from unit-of-work.md and story map
- [x] Resolve design questions (requirements + codebase)
- [x] Generate `business-logic-model.md`
- [x] Generate `business-rules.md`
- [x] Generate `domain-entities.md`
- [x] Validate PBT property candidates (login response, password round-trip)
- [x] Skip `frontend-components.md` (backend-only unit)
