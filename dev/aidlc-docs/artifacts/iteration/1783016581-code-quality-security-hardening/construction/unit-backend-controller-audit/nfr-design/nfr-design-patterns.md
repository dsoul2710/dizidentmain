# NFR Design — unit-backend-controller-audit

Design patterns for org-scoped reporting and audit remediation (U2).

---

## ReportScopeService Pattern

Centralizes owner resolution for report endpoints so controllers do not duplicate role-switch logic.

```
SecurityUtils (current user role/id/org)
        ↓
ReportScopeService.resolveOwnerUserIdForReports()
        ↓
null → super-admin global view (intentional)
Long → filter repository queries by owner_id
```

| Role | Owner resolution |
|------|------------------|
| SUPER_ADMIN / SUPERADMIN | `null` (all orgs) |
| ORG_HOSPITAL / ORG | `getCurrentUserId()` |
| DOCTOR / SERVICE_PROVIDER / PATIENT | `getActiveOrgId()` |
| Other | `getCurrentUserId()` fallback |

---

## Scoped Query Pattern (reports)

Replace `repository.findAll()` with role-aware queries:

| Controller | Before | After |
|------------|--------|-------|
| PatientReportController | `visitRepository.findAll()` | `findByOwner_Id` / `findByDoctor_Id` / `findByPatient_IdIn` |
| RevenueReportController | `billRepository.findAll()` | `loadScopedBills()` → `findByOwner_Id` |
| AppointmentReportController | `appointmentRepository.findAll()` | date range + `findByOwner_Id` |
| InventoryReportController | `itemRepository.findAll()` | `loadScopedItems()` + movement filter |

---

## Authorization Pattern

Report controllers use class-level `@PreAuthorize`:

- Patient reports: `isAuthenticated()` (patient self-view supported)
- Revenue / appointment / inventory reports: `hasAnyRole('SUPER_ADMIN', 'SUPERADMIN', 'ORG_HOSPITAL', 'ORG', 'DOCTOR')`

Clinical controllers (Patient, Visit, Billing) — role matrix deferred to U2-deferred-004 after U3 org scoping verified in services.

---

## Deferred Finding Pattern

Medium/low findings documented in `findings-deferred.md` with ticket IDs (U2-deferred-00x, U3-deferred-001). No silent drops — every audit item has status: Fixed or Deferred with target unit.

---

## Verification Design

1. `./gradlew test` — regression gate
2. Manual: authenticated org user sees only org data in reports
3. Manual: unauthenticated API → 401 (U1 baseline)
