# NFR Design Plan — unit-security-hardening

## Questions (resolved from NFR requirements)

### 401 vs 403 handling

A) Spring Security default entry point for 401; `@PreAuthorize` → 403  
B) Custom JSON ErrorResponse for all auth failures  
C) Other

[Answer]: B — extend GlobalExceptionHandler + AuthenticationEntryPoint for consistent ErrorResponse JSON

### Invalid JWT in filter

A) Silent continue (no SecurityContext) → 401 at authorization  
B) Log WARN and continue  
C) Other

[Answer]: B — log WARN without token value; authorization layer returns 401

### JWT secret default in JwtUtil

A) Remove default; require env var always  
B) Keep default for dev profile only; fail startup in prod if placeholder  
C) Other

[Answer]: B — document in logical components; code gen implements profile check

---

## Execution Checklist

- [x] Analyze NFR requirements and tech-stack-decisions.md
- [x] Define security patterns (filter chain, fail-closed, defense in depth)
- [x] Define logical components (filters, services, handlers)
- [x] Define error response schema for 401/403/400 auth paths
- [x] Define logging pattern integration with MDC
- [x] Map patterns to SECURITY rule IDs
- [x] Generate `nfr-design-patterns.md`
- [x] Generate `logical-components.md`
