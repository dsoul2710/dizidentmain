# Requirements — DiziDental Dev Code Quality & Security Hardening

## Intent Analysis

| Attribute | Assessment |
|-----------|------------|
| **User request** | Brownfield hardening iteration: restructure `backend/` and `frontend/`, audit and fix bugs/vulnerabilities, improve maintainability — no new product features |
| **Request type** | Refactoring + Enhancement (security) + Bug Fix |
| **Scope estimate** | System-wide — all 22 backend controllers, full frontend restructure |
| **Complexity estimate** | Complex — critical security gaps, poor test coverage, layering violations across modules |
| **Requirements depth** | Comprehensive — high-risk clinical HMS with security findings and multi-module audit |

**Source documents:** `docs/vision.md`, `docs/tech-env.md`, reverse-engineering artifacts, user answers in `requirement-verification-questions.md`.

---

## Extension Configuration (from Q1–Q3)

| Extension | Enabled | Enforcement |
|-----------|---------|-------------|
| Security Baseline | Yes | Blocking constraints across all applicable phases |
| Property-Based Testing | Yes (full) | Blocking for business logic, transformations, serialization |
| Resiliency Baseline | Yes | Design-time guidance for business-critical workloads |

---

## Business Goals

1. Make `dev/` safe and maintainable before syncing to client production folders (`clientabc/`, `clientxyz/`).
2. Eliminate critical and high-severity security vulnerabilities without changing core business behavior.
3. Establish consistent Spring Boot layering and React/Vite feature-oriented structure.
4. Document deferred medium/low findings with rationale for follow-up iterations.

---

## Functional Requirements

### FR-1 — Security hardening (priority: P0/P1 first)

| ID | Requirement | Source |
|----|-------------|--------|
| FR-1.1 | Remove `permitAll` on `/api/**`; enforce JWT on all API routes except `/api/auth/login`, health checks, and Swagger/OpenAPI docs | Q4, Q5, SEC-001 |
| FR-1.2 | Replace `NoOpPasswordEncoder` with BCrypt; migrate existing plain-text passwords on next successful login | Q4, Q6, SEC-002 |
| FR-1.3 | Replace permissive CORS (`allowedOriginPatterns("*")` with credentials) with explicit environment-driven allowlist (e.g. `localhost:5173`, `localhost:3000`, deployment domains from config) | Q4, Q7, SEC-003 |
| FR-1.4 | Apply role-based authorization via `@PreAuthorize` or equivalent method security on protected endpoints | Q5 |
| FR-1.5 | Audit and fix org-scoping: validate `X-Org-Id` (or equivalent) server-side; no trust of client-supplied org context without verification | SEC-005 |
| FR-1.6 | Restrict Swagger/API docs exposure per hardened auth model (address SEC-004 as part of auth rollout) | SEC-004 |
| FR-1.7 | Fix frontend security-sensitive patterns: reduce misuse of `localStorage` for session/sensitive data where applicable | SEC-006, Q9 |

**Sequencing constraint (Q4):** All P0/P1 security fixes MUST complete before structural refactors begin.

### FR-2 — Backend structure (moderate — Q8)

| ID | Requirement |
|----|-------------|
| FR-2.1 | Enforce controller → service → repository layering project-wide; remove direct repository injection from controllers |
| FR-2.2 | Controllers delegate business logic to services; repositories accessed only from services |
| FR-2.3 | Preserve existing API contracts and response shapes unless a security fix requires a backward-compatible correction |
| FR-2.4 | No package reorganization beyond what moderate layering enforcement requires |

### FR-3 — Frontend structure (comprehensive — Q9)

| ID | Requirement |
|----|-------------|
| FR-3.1 | Introduce feature-based folder layout (group pages/components/hooks by domain) |
| FR-3.2 | Establish shared hooks and services layer used consistently across pages |
| FR-3.3 | Preserve existing routes and WowDash visual language (`DESIGN_SYSTEM.md`) — structure only, no re-skin |
| FR-3.4 | Standardize API usage via `src/api/api.js`, error handling, and loading states |

### FR-4 — Codebase audit and remediation

| ID | Requirement |
|----|-------------|
| FR-4.1 | Perform full parallel audit across all 22 backend controllers | Q11 |
| FR-4.2 | Fix all critical and high-severity findings in this iteration | Q10 |
| FR-4.3 | Log medium and low findings in `aidlc-docs/` with tickets/deferred items and rationale | Q10 |
| FR-4.4 | Remove or refactor dead code, duplicated logic, and confirmed anti-patterns in touched areas |
| FR-4.5 | Use `.understand-anything/knowledge-graph.json` to assess refactor impact before changes |

### FR-5 — Testing (minimum bar — Q12)

| ID | Requirement |
|----|-------------|
| FR-5.1 | Add or update unit/integration tests only for code changed during fixes |
| FR-5.2 | Where changed code includes business logic, DTO mapping, or serialization, apply PBT rules (round-trip, invariants) per extension |
| FR-5.3 | Do not mandate new test classes for untouched modules |

### FR-6 — Documentation and traceability

| ID | Requirement |
|----|-------------|
| FR-6.1 | Maintain audit list of findings (ID, severity, location, status) in `aidlc-docs/` |
| FR-6.2 | Record fixes applied and explicitly deferred items with rationale |
| FR-6.3 | Produce security checklist sign-off document for construction completion | Q14 |

---

## Non-Functional Requirements

### NFR-1 — Security (Security Baseline extension)

- Encryption in transit for all external data movement (TLS for DB and HTTP in deployed environments).
- Input validation on all API parameters; parameterized queries only (no SQL concatenation).
- Structured application logging with correlation IDs; no passwords, tokens, or PII in logs.
- HTTP security headers on HTML-serving endpoints where applicable (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- Secrets and credentials MUST NOT be hardcoded; use environment configuration.
- Authentication failures MUST NOT leak user enumeration details.

### NFR-2 — API compatibility (Q13)

- **No breaking API changes.** Security enforcement (JWT required) is acceptable because the frontend already sends HTTP-only JWT cookies; response shapes and endpoint paths remain unchanged.
- Undocumented direct API access without JWT will fail after hardening — expected and in scope.

### NFR-3 — Reliability and resiliency (Resiliency Baseline extension)

- Classify backend and frontend as **Critical** workloads (clinical HMS).
- Document dependency map (frontend → API → PostgreSQL, WebSocket chat).
- Error handling MUST be consistent: `GlobalExceptionHandler` patterns preserved and extended where touched.
- Graceful degradation for non-critical paths where practical; no single-point silent failures in auth flow.

### NFR-4 — Maintainability

- Consistent naming, package layout, and separation of concerns per Spring Boot and React/Vite conventions.
- Focused diffs — minimal change per fix; avoid drive-by refactors outside audit scope.

### NFR-5 — Performance

- No regression in login or primary clinical flows (patient → visit → appointment → billing) after hardening.
- Security filters and validation MUST NOT add unacceptable latency to hot paths (target: imperceptible for local/dev use).

### NFR-6 — Testability

- Changed code MUST be testable; prefer integration tests for auth boundary when security config changes.
- PBT where applicable per extension (serialization round-trips, permission mapping invariants).

---

## Known Security Findings (from reverse engineering)

| ID | Finding | Severity | Iteration action |
|----|---------|----------|------------------|
| SEC-001 | All API endpoints `permitAll` | Critical | Fix (FR-1.1) |
| SEC-002 | Plain-text password encoder | Critical | Fix (FR-1.2) |
| SEC-003 | CORS allows any origin with credentials | High | Fix (FR-1.3) |
| SEC-004 | Swagger open without auth | Medium | Fix during auth rollout or defer with ticket |
| SEC-005 | Org scoping header trust | High | Audit and fix (FR-1.5) |
| SEC-006 | Sensitive data in localStorage | Medium | Defer with ticket (Q10) |

---

## Constraints

### Must not change

- Multi-client sync workflow (`dev/` → scripts → client folders).
- Core JWT auth model and role/module permission concept (harden, do not replace).
- PostgreSQL as sole database.
- Tech stack (Spring Boot 4, React 19, Vite 7, Axios, JPA).
- WowDash layout and visual design system.
- Business behavior of working features except confirmed bug fixes.

### Out of scope (Q15)

- New product features or HMS modules.
- Changes to `../clientabc/` and `../clientxyz/`.
- VPS deployment or infrastructure changes.
- Database schema migrations unless required for BCrypt or security fix.
- Full design-system rewrite or UI redesign.

---

## Success Criteria (Q14)

1. `./gradlew test` passes.
2. `npm run lint` and `npm run build` pass.
3. Manual smoke test: login and one clinical flow (e.g. patient lookup or visit).
4. Security checklist sign-off documented in `aidlc-docs/`.
5. Critical and high findings resolved; medium/low documented and deferred.
6. Backend layering enforced; frontend feature-based structure applied.

---

## Execution Sequencing Summary

```text
Phase 1: Security (P0/P1)
  - SEC-001, SEC-002, SEC-003, auth model, CORS, org-scoping audit
Phase 2: Full parallel controller audit (22 controllers)
  - Fix critical/high; ticket medium/low
Phase 3: Backend layering (moderate)
  - controller -> service -> repository project-wide
Phase 4: Frontend restructure (comprehensive)
  - Feature folders, shared hooks/services
Phase 5: Tests for changed code + security checklist sign-off
```

---

## Assumptions and Clarifications

1. **Auth vs breaking changes:** Requiring JWT is in scope and not treated as a breaking API contract change for the SPA, which already authenticates via cookies.
2. **Password migration:** Users with plain-text passwords authenticate once; successful login re-hashes with BCrypt transparently.
3. **CORS allowlist:** Configuration via environment/properties; local dev origins included by default.
4. **Medium findings (SEC-004, SEC-006):** Deferred per Q10 unless blocking security rollout.
5. **Resiliency DR/CI/CD decisions:** Deferred to Workflow Planning and NFR stages where applicable (local dev focus this iteration).

---

## Traceability — User Answers

| Question | Answer | Key decision |
|----------|--------|--------------|
| Q1 Security extension | A | Full enforcement |
| Q2 PBT extension | A | Full enforcement |
| Q3 Resiliency extension | A | Design-time guidance |
| Q4 Security scope | A | P0/P1 before refactors |
| Q5 Auth model | A | JWT + `@PreAuthorize` |
| Q6 Password migration | A | Migrate on next login |
| Q7 CORS | A | Env allowlist |
| Q8 Backend structure | B | Moderate layering |
| Q9 Frontend structure | C | Comprehensive feature layout |
| Q10 Medium/low | A | Fix critical+high; defer rest |
| Q11 Audit order | C | Full parallel 22 controllers |
| Q12 Testing | A | Tests for changed code only |
| Q13 Breaking changes | A | Backward compatible |
| Q14 Success validation | B | Builds + security checklist |
| Q15 Out of scope | A | Per vision.md |
