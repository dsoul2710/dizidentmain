# Business Logic Model — unit-backend-layering

Technology-agnostic layering model for U3. Controllers handle HTTP only; services own business logic and data access.

---

## Layer Responsibilities

| Layer | Responsibility | Must NOT |
|-------|----------------|----------|
| **Controller** | Route mapping, `@Valid` input, `@PreAuthorize`, ResponseEntity | Inject repositories, contain aggregation logic |
| **Service** | Business rules, transactions, org scoping, repository orchestration | Know HTTP status codes directly |
| **Repository** | Persistence queries | Enforce authorization |

---

## Controller → Service Mapping

| Controller | Current repo usage | Target service |
|------------|-------------------|----------------|
| PatientController | `PatientRepository` (3 direct calls) | Extend `PatientService` |
| PatientReportController | Patient, mapping, visit repos | **PatientReportService** (new) |
| RevenueReportController | Bill, item, payment, treatment repos | **RevenueReportService** (new) |
| AppointmentReportController | Appointment, treatment item repos | **AppointmentReportService** (new) |
| InventoryReportController | Item, movement repos | **InventoryReportService** (new) |
| OrganizationController | User, OrgHospital repos | **OrganizationService** (new) |
| DoctorController | Doctor, mapping repos | Extend **DoctorService** or thin wrapper |
| VisitController | `VisitRepository` (1 lookup) | Extend `VisitService` |
| PrescriptionController | Template, doctor repos | Extend `PrescriptionService` |
| ExamItemMasterController | ExamItemMaster repo | **ExamItemMasterService** (new) |

AuthController and UserController already delegate to services (U1).

---

## Core Workflows (post-layering)

### WF-U3-1: Report request (any report controller)

```text
1. Controller receives HTTP request + auth context
2. Controller invokes report service method with DTO/params
3. Service resolves scope via ReportScopeService / OrgContextService
4. Service loads scoped entities via repositories
5. Service aggregates and maps to response DTOs
6. Controller returns ResponseEntity
```

### WF-U3-2: Organization CRUD (super-admin)

```text
1. OrganizationController validates role (or @PreAuthorize)
2. OrganizationService.create/update/delete/list
3. Service manages User + OrgHospital in @Transactional methods
4. Service uses PasswordEncoder for org user passwords
5. Controller maps OrganizationResponse
```

### WF-U3-3: Patient lookup by ID (PatientController)

```text
1. PatientController receives id path variable
2. PatientService.findByIdScoped(id) — org check inside service
3. Return patient DTO or 404 via exception handler
```

---

## Shared Services (from U1/U2)

- `OrgContextService` — active org and caller context
- `ReportScopeService` — report owner resolution (used by report services)

---

## Success Verification

```bash
# Zero repository imports in controller package
grep -r "com.clinic.hms.repository" backend/src/main/java/com/clinic/hms/controller/
# Expected: no matches

./gradlew test
```
