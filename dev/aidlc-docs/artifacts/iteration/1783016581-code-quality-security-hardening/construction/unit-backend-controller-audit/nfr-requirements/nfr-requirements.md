# NFR Requirements — unit-backend-controller-audit

Non-functional requirements for the controller audit unit (U2). Functional Design skipped — audit-driven fixes only.

---

## Scope

U2 addresses **org-scoped data access in report endpoints**, **role checks on report APIs**, and **documented deferrals** for medium/low findings across 22 controllers. Builds on U1 JWT enforcement.

---

## Security Requirements

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-SEC-U2-01 | Report endpoints must not use unscoped `findAll()` on org-owned entities | Owner/doctor/patient filters per role | Fixed (AUD-H01–H04) |
| NFR-SEC-U2-02 | Report controllers require authenticated role appropriate to data | `@PreAuthorize` on report controllers | Fixed (partial — clinical controllers deferred AUD-M06) |
| NFR-SEC-U2-03 | Super-admin global view preserved where intentional | `ReportScopeService` returns null owner for super-admin | Implemented |
| NFR-SEC-U2-04 | Swagger public access | Restrict in prod profile | Deferred U2-deferred-001 |
| NFR-SEC-U2-05 | WebSocket JWT validation | Align STOMP with cookie JWT | Deferred U2-deferred-002 |
| NFR-SEC-U2-06 | Chat thread IDOR | Membership check in ChatService | Deferred U2-deferred-003 |

---

## Performance Requirements

| ID | Requirement | Notes |
|----|-------------|-------|
| NFR-PERF-U2-01 | Scoped queries replace full-table scans | Acceptable for clinic-scale data volumes |
| NFR-PERF-U2-02 | No new caching layer in U2 | Defer optimization until layering (U3) |

---

## Testability Requirements

| ID | Requirement | Notes |
|----|-------------|-------|
| NFR-TEST-U2-01 | Unit tests for new `ReportScopeService` | Mockito-based role resolution tests |
| NFR-TEST-U2-02 | `./gradlew test` must pass after fixes | Gate before U3 |
| NFR-TEST-U2-03 | Tests only for changed code | No full controller integration suite in U2 |

---

## Traceability

- FR-4.1–FR-4.4 (controller audit checklist)
- FR-6.1–FR-6.2 (org scoping, role enforcement)
- SEC-005 (object-level authorization — partial via report scoping)
