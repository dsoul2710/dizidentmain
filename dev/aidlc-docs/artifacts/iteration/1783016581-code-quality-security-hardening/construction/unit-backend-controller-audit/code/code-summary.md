# Code Summary — unit-backend-controller-audit

## Audit outcome

| Severity | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| Critical | 0 (U1 resolved) | — | — |
| High | 4 | 4 | 0 |
| Medium | 6 | 0 | 6 |
| Low | 8+ | 0 | 8+ |

Full per-controller matrix: `audit-report.md`  
Deferred tickets: `../findings-deferred.md`

---

## High findings fixed

| ID | Controller | Fix |
|----|------------|-----|
| AUD-H01 | PatientReportController | Scoped visits by owner/doctor/patient ids |
| AUD-H02 | RevenueReportController | `loadScopedBills()` via `ReportScopeService` |
| AUD-H03 | AppointmentReportController | Date-range query + owner filter |
| AUD-H04 | InventoryReportController | `loadScopedItems()` + scoped movements |

---

## Files created

| File | Purpose |
|------|---------|
| `service/ReportScopeService.java` | Org owner resolution for reports |
| `test/.../ReportScopeServiceTest.java` | Role-based owner resolution tests |

## Files modified

| File | Change |
|------|--------|
| `controller/PatientReportController.java` | Scoped visit queries + `@PreAuthorize` |
| `controller/RevenueReportController.java` | `loadScopedBills()` + `@PreAuthorize` |
| `controller/AppointmentReportController.java` | Owner-filtered appointments + `@PreAuthorize` |
| `controller/InventoryReportController.java` | `loadScopedItems()` + `@PreAuthorize` |
| `repository/VisitRepository.java` | `findByOwner_Id`, `findByDoctor_Id`, `findByPatient_IdIn` |
| `repository/BillRepository.java` | `findByOwner_Id` |
| `repository/AppointmentRepository.java` | `findByOwner_Id` |

---

## Deferred (not fixed in U2)

| Ticket | Item |
|--------|------|
| U2-deferred-001 | Swagger public (SEC-004) |
| U2-deferred-002 | WebSocket JWT (`/ws/**`) |
| U2-deferred-003 | Chat thread IDOR |
| U2-deferred-004 | Clinical `@PreAuthorize` matrix |
| U3-deferred-001 | 12 controllers with direct repo injection |

---

## Verification

- `./gradlew test` — **BUILD SUCCESSFUL**

## Manual smoke test (recommended)

1. Login as org admin — revenue/inventory reports show only org data
2. Login as super-admin — reports may show cross-org aggregates
3. Call report endpoint without cookie — expect 401
