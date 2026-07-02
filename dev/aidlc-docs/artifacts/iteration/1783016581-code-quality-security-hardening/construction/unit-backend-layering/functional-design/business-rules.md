# Business Rules — unit-backend-layering

Rules governing service extraction and layering enforcement (U3).

---

## Structural Rules

| ID | Rule |
|----|------|
| BL-U3-01 | No class in `controller/` package may import `com.clinic.hms.repository.*` |
| BL-U3-02 | Controllers may inject only services, utilities (e.g. SecurityUtils for legacy paths being migrated), and framework types |
| BL-U3-03 | Service methods that access org-owned data must apply org scoping before returning entities |
| BL-U3-04 | Report services must use `ReportScopeService.resolveOwnerUserIdForReports()` for owner filtering |
| BL-U3-05 | `@Transactional` boundaries belong on service methods, not controllers |

---

## Per-domain Rules

### Patient / PatientReport

- Patient lookups by ID must respect org/doctor/provider scope (existing PatientService patterns)
- Report patient lists use same scope as current controller logic — behavior unchanged

### Reports (Revenue, Appointment, Inventory)

- Super-admin (`ownerId == null`) may access global aggregates — preserve U2 behavior
- Org-scoped roles see only owner-filtered data

### Organization (super-admin only)

- Mobile uniqueness enforced in service before save
- Soft-delete semantics preserved (`isDeleted` flags)

### Prescription templates

- Doctor role: templates for doctor + global (`findByDoctor_IdOrDoctorIsNull`)
- Non-doctor: scoped list only — fix AUD-M03 `findAll()` in service layer

### ExamItemMaster

- Read-only master list; service returns active items ordered by display order

---

## Non-goals (U3)

- No new REST endpoints or DTO field changes
- No `@PreAuthorize` expansion (deferred U2-deferred-004)
- No WebSocket auth (deferred U2-deferred-002)

---

## Testing Rules

- Add/update unit tests for new service methods with Mockito
- `./gradlew test` must pass before U3 approval
