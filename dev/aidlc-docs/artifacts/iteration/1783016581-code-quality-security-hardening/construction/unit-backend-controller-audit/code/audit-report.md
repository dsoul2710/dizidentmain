# Controller Audit Report — unit-backend-controller-audit

Audit date: 2026-07-02 | Post U1 JWT enforcement

## Summary

| Severity | Found | Fixed this unit | Deferred |
|----------|-------|-----------------|----------|
| Critical | 0 (U1 resolved SEC-001–003) | — | — |
| High | 4 | 4 | 0 |
| Medium | 6 | 0 | 6 |
| Low | 8+ | 0 | 8+ |

---

## High — Fixed

| ID | Controller | Finding | Fix |
|----|------------|---------|-----|
| AUD-H01 | PatientReportController | `visitRepository.findAll()` leaked cross-org visit data | Scoped visits by owner/doctor/patient ids |
| AUD-H02 | RevenueReportController | `billRepository.findAll()` exposed all clinic bills | `loadScopedBills()` via `ReportScopeService` |
| AUD-H03 | AppointmentReportController | `appointmentRepository.findAll()` global leak | Date-range query + owner filter |
| AUD-H04 | InventoryReportController | `itemRepository.findAll()` global inventory | `loadScopedItems()` + movement filter |

---

## Per-controller status

| Controller | Auth (U1) | Org scope | Role checks | Layering | Notes |
|------------|-------------|-----------|-------------|----------|-------|
| AuthController | OK | N/A | Public login | Service (U1) | — |
| UserController | OK | N/A | @PreAuthorize admin | Service (U1) | — |
| PatientController | JWT | Via PatientService | Partial | Repo inject (U3) | Medium: IDOR review in U3 |
| PatientReportController | JWT + @PreAuthorize | Fixed H01 | isAuthenticated | Direct repos (U3) | — |
| VisitController | JWT | Via VisitService | Partial | Mixed (U3) | — |
| AppointmentController | JWT | Service | Partial | Service OK | — |
| BillingController | JWT | Service | Partial | Service OK | — |
| PrescriptionController | JWT | Partial | Partial | Repo inject (U3) | Medium: template findAll |
| TreatmentPlanController | JWT | Service | Partial | Service OK | — |
| TreatmentMasterController | JWT | Service | Partial | Service OK | — |
| ExamItemMasterController | JWT | Weak | Partial | Repo inject (U3) | Medium |
| InventoryController | JWT | Service | Partial | Service OK | — |
| InventoryReportController | JWT + roles | Fixed H04 | @PreAuthorize | Direct repos | — |
| VendorController | JWT | Service | Partial | Service OK | — |
| LabController | JWT | Service | Partial | Service OK | — |
| EventController | JWT | Service | Partial | Service OK | — |
| ChatController | JWT | Service | Partial | Service OK | Thread auth U2 defer |
| ChatWebSocketController | WS open | Defer U2 | Defer | Service | AUD-M05 |
| DoctorController | JWT | SecurityUtils | Partial | Repo inject (U3) | — |
| OrganizationController | JWT | SecurityUtils | Partial | Repo inject (U3) | — |
| ServiceProviderController | JWT | SecurityUtils | Partial | Service OK | — |
| RevenueReportController | JWT + roles | Fixed H02 | @PreAuthorize | Direct repos (U3) | — |
| AppointmentReportController | JWT + roles | Fixed H03 | @PreAuthorize | Direct repos | — |

---

## Medium — Deferred (tickets)

| ID | Finding | Ticket |
|----|---------|--------|
| AUD-M01 | SEC-004 Swagger open without auth | U2-deferred-001 |
| AUD-M02 | `/ws/**` STOMP without JWT | U2-deferred-002 |
| AUD-M03 | PrescriptionController `templateRepository.findAll()` | U3 layering |
| AUD-M04 | Silent catch blocks in PatientReportController loadSnapshots | U3 cleanup |
| AUD-M05 | Chat thread/attachment IDOR review | U2-deferred-003 |
| AUD-M06 | Missing @PreAuthorize on clinical controllers | U2-deferred-004 |

---

## Low — Deferred

- Controller→repository layering violations (12 controllers) → **unit-backend-layering**
- RuntimeException instead of typed exceptions in some controllers → incremental
- Input validation gaps on path variables → incremental
- SEC-006 frontend localStorage → **unit-frontend-restructure**

See `findings-deferred.md`.

---

## New artifacts (U2)

- `ReportScopeService` — shared org owner resolution for reports
- Repository methods: `findByOwner_Id`, `findByPatient_IdIn`, etc.

---

## Verification

- `./gradlew test` required after changes
- Manual: org user reports show only org data; unauthenticated API returns 401
