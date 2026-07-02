# Unit of Work — Requirement Mapping

User Stories stage was skipped. This document maps **functional requirements (FR-*)** and **security findings (SEC-*)** to construction units for traceability.

---

## Mapping Overview

| Unit | Primary FR groups | Security findings |
|------|-------------------|-------------------|
| U1 unit-security-hardening | FR-1, FR-6 | SEC-001, SEC-002, SEC-003, SEC-004 (partial) |
| U2 unit-backend-controller-audit | FR-4, FR-6 | SEC-005, SEC-004, controller-specific |
| U3 unit-backend-layering | FR-2, FR-5 | — |
| U4 unit-frontend-restructure | FR-3, FR-5 | SEC-006 (partial/defer) |
| Build and Test | FR-5, FR-6, Success Criteria | All verification |

---

## U1: unit-security-hardening

| ID | Requirement / Finding | Acceptance hint |
|----|----------------------|-----------------|
| FR-1.1 | JWT on `/api/**` except login, health, swagger | 401 without cookie |
| FR-1.2 | BCrypt + migrate-on-login | Login re-hashes legacy password |
| FR-1.3 | Env CORS allowlist | Non-allowed origin blocked |
| FR-1.4 | `@PreAuthorize` on protected endpoints | Role denied returns 403 |
| FR-1.5 | Org scoping foundation | `OrgContextService` created |
| FR-1.6 | Swagger restriction | Per auth model |
| SEC-001 | permitAll removed | Integration test |
| SEC-002 | NoOpPasswordEncoder removed | BCrypt matches |
| SEC-003 | CORS hardened | Config test |
| FR-5.1 | Tests for changed code | Auth test classes |
| FR-6.1 | Audit log entry | aidlc-docs update |

---

## U2: unit-backend-controller-audit

| ID | Requirement / Finding | Acceptance hint |
|----|----------------------|-----------------|
| FR-4.1 | Audit all 22 controllers | Report 100% coverage |
| FR-4.2 | Fix critical + high | Zero open P0/P1 |
| FR-4.3 | Defer medium/low with tickets | findings-deferred.md |
| FR-4.4 | Remove dead code in touched areas | No orphan TEMP blocks |
| FR-4.5 | Knowledge graph impact check | Documented for major edits |
| FR-6.1 | Maintain findings list | Per-controller status |
| FR-6.2 | Record fixes applied | Changelog in aidlc-docs |
| SEC-005 | Org scoping audit | Service validation added |
| SEC-004 | Swagger exposure | Fix or ticket |
| NFR-1 | Input validation gaps | Per audit checklist |

### Per-controller assignment (audit ownership)

All controllers audited in U2; fixes applied in U2 if critical/high and localized, otherwise ticketed for U3 if layering-only:

| Controller | Unit | Notes |
|------------|------|-------|
| AuthController | U1 + U2 | Auth in U1; remainder audit U2 |
| UserController | U1 + U2 | Same |
| PatientController | U2 | Org scoping, validation |
| VisitController | U2 | High traffic clinical |
| AppointmentController | U2 | |
| BillingController | U2 | Financial data |
| PrescriptionController | U2 | |
| TreatmentPlanController | U2 | |
| TreatmentMasterController | U2 | |
| ExamItemMasterController | U2 | |
| InventoryController | U2 | |
| InventoryReportController | U2 | |
| VendorController | U2 | |
| LabController | U2 | |
| ChatController | U2 | |
| ChatWebSocketController | U2 | WebSocket auth |
| DoctorController | U2 | |
| OrganizationController | U2 | |
| ServiceProviderController | U2 | |
| EventController | U2 | |
| PatientReportController | U2 | |
| RevenueReportController | U2 | |
| AppointmentReportController | U2 | |

---

## U3: unit-backend-layering

| ID | Requirement | Acceptance hint |
|----|-------------|-----------------|
| FR-2.1 | controller → service → repository | No repo in controllers |
| FR-2.2 | Business logic in services | Grep verification |
| FR-2.3 | Preserve API contracts | Frontend unchanged |
| FR-2.4 | No package reorganization | Flat packages kept |
| FR-5.1 | Tests for changed services | New service tests |
| FR-5.2 | PBT for DTO round-trips | Where serialization touched |

### Service extraction mapping

| Controller | New/extended service | Unit |
|------------|---------------------|------|
| AuthController | AuthService (U1 may start; U3 completes) | U1/U3 |
| UserController | UserService | U1/U3 |
| PatientController | PatientService extend | U3 |
| PatientReportController | PatientReportService | U3 |
| DoctorController | DoctorService extend | U3 |
| OrganizationController | OrganizationService | U3 |
| VisitController | VisitService extend | U3 |
| PrescriptionController | PrescriptionService extend | U3 |
| RevenueReportController | RevenueReportService | U3 |
| AppointmentReportController | AppointmentReportService | U3 |
| ExamItemMasterController | ExamItemMasterService | U3 |
| InventoryReportController | InventoryService extend | U3 |

---

## U4: unit-frontend-restructure

| ID | Requirement / Finding | Acceptance hint |
|----|-------------|-----------------|
| FR-3.1 | Feature-based folders | Structure matches design |
| FR-3.2 | Shared hooks/services layer | Hooks used in features |
| FR-3.3 | Routes preserved | Same URLs |
| FR-3.4 | Standardized API usage | Domain api modules |
| FR-1.7 | localStorage fixes where touched | Reduced sensitive storage |
| FR-5.1 | Tests if any added | N/A unless JS tests added |
| SEC-006 | localStorage sensitive data | Partial fix or defer ticket |

### Page → feature module mapping

| Current path | Target feature |
|--------------|----------------|
| `pages/auth/LoginPage` | `features/auth/` |
| `pages/patient/*` | `features/patient/` |
| `pages/doctor/*` | `features/doctor/` |
| `pages/org/*` | `features/org/` |
| `pages/super-admin/*` | `features/admin/` |
| `pages/provider/*` | `features/provider/` |
| `pages/chat/*` | `features/chat/` |
| `pages/dashboards/UnifiedDashboard` | `features/dashboard/` |
| `pages/BillingView` | `features/billing/` |
| `pages/InventoryView`, `VendorEntry`, `LabEntryView` | `features/inventory/` |
| `pages/ScheduleView` | `features/schedule/` |
| `pages/ReportsView` | `features/reports/` |
| `pages/DiagnosisView`, `TreatmentPlanView`, `ConsentPostOpView` | `features/clinical/` |
| `pages/PatientEntry`, `PatientAdd`, `DoctorEntry` | respective feature |
| `components/layout/*`, `common/*`, `print/*`, `odontogram/*` | `shared/components/` |
| `hooks/*`, `utils/*` | `shared/hooks/`, `shared/utils/` |

---

## Build and Test (closure)

| ID | Requirement | Verification |
|----|-------------|--------------|
| Success 1 | `./gradlew test` | CI/local pass |
| Success 2 | `npm run lint`, `npm run build` | No errors |
| Success 3 | Smoke test login + clinical flow | Manual checklist |
| Success 4 | Security checklist sign-off | aidlc-docs artifact |
| Success 5 | Critical/high resolved | Cross-ref audit report |
| Success 6 | Layering + frontend structure | Design conformance |
| FR-6.3 | Security checklist sign-off | Q14 answer B |

---

## Unassigned / Deferred (by design)

| ID | Reason | Action |
|----|--------|--------|
| SEC-006 (full) | Q10 defer medium | Ticket in U2, partial U4 |
| SEC-004 (if medium) | Q10 | Ticket unless blocks auth |
| New features | Out of scope Q15 | — |
| Client folder sync | Out of scope | — |
| VPS deploy | Out of scope | — |

---

## Traceability completeness

| Source | Total items | Mapped |
|--------|-------------|--------|
| FR-1.* | 7 | 7 → U1 (+ U2/U4 partial) |
| FR-2.* | 4 | 4 → U3 |
| FR-3.* | 4 | 4 → U4 |
| FR-4.* | 5 | 5 → U2 |
| FR-5.* | 3 | 3 → all units |
| FR-6.* | 3 | 3 → U1/U2/Build |
| SEC-001–003 | 3 | 3 → U1 |
| SEC-004–006 | 3 | 3 → U1/U2/U4 |

**All in-scope requirements assigned.**
