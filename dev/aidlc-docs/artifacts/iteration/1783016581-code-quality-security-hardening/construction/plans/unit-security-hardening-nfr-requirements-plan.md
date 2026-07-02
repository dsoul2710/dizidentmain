# NFR Requirements Plan — unit-security-hardening

## Context

NFR assessment for U1 based on functional design artifacts and Security Baseline extension (enabled).

## Questions (resolved from requirements + tech-env)

### Performance target for login

A) No explicit SLA — imperceptible for local dev (< 500ms typical)  
B) < 200ms p95  
C) Other

[Answer]: A

### Rate limiting on login

A) Defer to follow-up iteration (document ticket)  
B) Implement basic lockout after N failures in U1  
C) Other

[Answer]: A — document deferred; SECURITY-12 partial gap ticketed

### Centralized log service

A) Local stdout/MDC sufficient for dev; document production CloudWatch/etc. as future  
B) Must integrate centralized logging in U1  
C) Other

[Answer]: A — SECURITY-03 compliant via MdcLoggingFilter + SLF4J; centralized aggregation N/A for local dev

### TLS for PostgreSQL local

A) N/A local Docker; document TLS requirement for production JDBC URL  
B) Enable TLS in docker-compose now  
C) Other

[Answer]: A — SECURITY-01 N/A local; documented in NFR

### JWT secret management

A) Must load from env/property; fail startup if default placeholder in prod profile  
B) Keep as-is in application.properties for dev only  
C) Other

[Answer]: A — verify and externalize if hardcoded

---

## Execution Checklist

- [x] Analyze functional design artifacts
- [x] Assess scalability, performance, availability, security, reliability
- [x] Map Security Baseline rules (compliant / gap / N/A)
- [x] Map Resiliency Baseline (design-time for critical auth path)
- [x] Document tech stack decisions (no new frameworks)
- [x] Generate `nfr-requirements.md`
- [x] Generate `tech-stack-decisions.md`
