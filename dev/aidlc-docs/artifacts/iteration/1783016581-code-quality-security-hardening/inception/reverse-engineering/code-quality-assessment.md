# Code Quality Assessment

## Test Coverage

| Area | Status |
|------|--------|
| **Overall** | **Poor** — ~2 test classes for 200+ Java source files |
| Unit tests | `ClinicHmsApplicationTests`, `BoundaryIsolationTests` only |
| Integration tests | Minimal boundary isolation tests |
| Frontend tests | **None** configured |

## Code Quality Indicators

| Indicator | Status |
|-----------|--------|
| Backend linting | Gradle checkstyle/spotbugs not configured |
| Frontend linting | ESLint configured (`npm run lint`) |
| Code style | Generally consistent Java/React; some TEMP comments in security |
| Documentation | Good — FRONTEND_ARCHITECTURE.md, DESIGN_SYSTEM.md, PROJECT_CONTEXT (parent) |
| Knowledge graph | Available — `.understand-anything/knowledge-graph.json` |

## Security Findings (preliminary — for this iteration)

| ID | Finding | Location | Severity |
|----|---------|----------|----------|
| SEC-001 | All API endpoints permitAll — no authorization enforced | SecurityConfig.java:37 | Critical |
| SEC-002 | Plain-text password encoder (NoOpPasswordEncoder) | SecurityConfig.java:64 | Critical |
| SEC-003 | CORS allows any origin with credentials | SecurityConfig.java:74 | High |
| SEC-004 | Swagger/API docs open without auth | SecurityConfig.java:39-44 | Medium |
| SEC-005 | Org scoping relies on header without server-side validation audit | Services layer | High (needs review) |
| SEC-006 | Sensitive session data in localStorage | App.jsx, PatientEntry.jsx | Medium |

## Technical Debt

- SecurityConfig marked "TEMP" — auth bypass for development never removed
- Password hashing not implemented despite comment "later -> BCrypt"
- Controllers bypass service layer for some operations
- Frontend pages mix concerns (API calls + localStorage + UI in single files)
- No centralized frontend error boundary or API error mapping

## Patterns and Anti-patterns

**Good patterns:**
- GlobalExceptionHandler with traceId and validation error map
- Centralized Axios client with org header injection
- DTO separation for API contracts
- Modular permission system (ModulePermission)

**Anti-patterns:**
- Security theater (JWT filter present but permitAll)
- Repository access from controllers
- localStorage as pseudo-database for visits/appointments
- Insufficient automated tests for security-sensitive paths

## Recommended iteration priority

1. **P0**: Fix SEC-001, SEC-002, SEC-003 (auth, passwords, CORS)
2. **P1**: Org-scoping audit across services; controller→service layering
3. **P2**: Frontend structure normalization; reduce localStorage misuse
4. **P3**: Expand JUnit coverage for auth and patient/billing flows
