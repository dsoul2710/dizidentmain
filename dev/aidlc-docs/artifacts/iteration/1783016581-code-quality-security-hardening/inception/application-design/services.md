# Services

Service layer definitions and orchestration patterns for the hardening iteration.

---

## Design Principles

1. **Controllers are thin** — HTTP mapping, validation trigger, response mapping only.
2. **Services own business logic** — all repository access, org scoping, transactions.
3. **No new package structure** — services remain in `com.clinic.hms.service` (Q8 moderate).
4. **Org scoping in services** — every org-scoped service method receives or resolves `orgId` via `OrgContextService`.

---

## Existing Services (retain and extend)

| Service | Domain | Notes |
|---------|--------|-------|
| `PatientService` | Clinical | Extend to cover controller-direct repository calls |
| `VisitService` | Clinical | Primary visit orchestration |
| `VisitExamService` | Clinical | Exam items per visit |
| `VisitDiagnosisService` | Clinical | Diagnosis records |
| `AppointmentService` | Clinical | Scheduling |
| `TreatmentPlanService` | Clinical | Treatment planning |
| `PrescriptionService` | Clinical | Rx templates and issuance |
| `BillingService` | Billing | Bills and payments |
| `DoctorService` | Admin | Doctor CRUD and mappings |
| `ServiceProviderService` | Admin | External providers |
| `InventoryService` | Operations | Stock management |
| `VendorService` | Operations | Vendor management |
| `LabService` | Operations | Lab orders |
| `EventService` | Operations | Calendar events |
| `TreatmentMasterService` | Masters | Treatment catalog |
| `ExamItemMasterService` | Masters | Exam item catalog |
| `ChatService` | Communication | Chat messages |
| `EventPushService` | Communication | WebSocket push |
| `CustomUserDetailsService` | Security | Spring Security user loading |

---

## New Services (to create)

### AuthService

| Attribute | Value |
|-----------|-------|
| **Extracted from** | `AuthController` |
| **Dependencies** | `UserRepository`, role-specific repos, `ModulePermissionRepository`, `JwtUtil`, `PasswordEncoder` |
| **Orchestration** | Login flow: find user → verify password (re-hash if legacy) → load permissions → build response → cookie |
| **Transaction boundary** | `@Transactional` on login (password update) |

### UserService

| Attribute | Value |
|-----------|-------|
| **Extracted from** | `UserController` |
| **Dependencies** | User and role repositories, `ModulePermissionRepository`, `OrgContextService` |
| **Orchestration** | User CRUD, permission assignment, role-specific profile linkage |

### OrgContextService

| Attribute | Value |
|-----------|-------|
| **Purpose** | Central org scoping (SEC-005) |
| **Dependencies** | JWT claims, org membership repos (doctor-org, patient-org mappings) |
| **Orchestration** | Called at start of service methods; fails fast with 403 |

### OrganizationService

| Attribute | Value |
|-----------|-------|
| **Extracted from** | `OrganizationController` |
| **Dependencies** | `OrgHospitalRepository`, `UserRepository` |

### RevenueReportService

| Attribute | Value |
|-----------|-------|
| **Extracted from** | `RevenueReportController` |
| **Dependencies** | Bill repositories, `OrgContextService` |

### PatientReportService

| Attribute | Value |
|-----------|-------|
| **Extracted from** | `PatientReportController` |
| **Dependencies** | Patient, visit, mapping repositories |

### AppointmentReportService

| Attribute | Value |
|-----------|-------|
| **Extracted from** | `AppointmentReportController` |
| **Dependencies** | Appointment, treatment item repositories |

---

## Controllers Requiring Service Extraction

| Controller | Direct Repository Injection | Target Service |
|------------|----------------------------|----------------|
| `AuthController` | 7 repositories | `AuthService` |
| `UserController` | 6 repositories | `UserService` |
| `PatientController` | `PatientRepository` | Extend `PatientService` |
| `PatientReportController` | 3 repositories | `PatientReportService` |
| `DoctorController` | 2 repositories | Extend `DoctorService` |
| `OrganizationController` | 2 repositories | `OrganizationService` |
| `VisitController` | `VisitRepository` | Extend `VisitService` |
| `PrescriptionController` | 2 repositories | Extend `PrescriptionService` |
| `RevenueReportController` | 4 repositories | `RevenueReportService` |
| `AppointmentReportController` | 2 repositories | `AppointmentReportService` |
| `ExamItemMasterController` | 1 repository | Use `ExamItemMasterService` |
| `InventoryReportController` | 2 repositories | Extend `InventoryService` or new report service |

Controllers already using services only (verify during audit): `BillingController`, `TreatmentPlanController`, `InventoryController`, `VendorController`, `LabController`, `EventController`, `ChatController`, `ServiceProviderController`, `TreatmentMasterController`, `AppointmentController`.

---

## Service Orchestration Patterns

### Pattern 1: Org-Scoped Read

```text
Controller → OrgContextService.requireOrgId() → Service.method(orgId, ...) → Repository
```

### Pattern 2: Authenticated Write

```text
Controller (@PreAuthorize) → Service (@Transactional) → validate org → Repository.save
```

### Pattern 3: Login (Auth)

```text
AuthController → AuthService.authenticate() → PasswordEncoder.matches + optional rehash → JwtUtil → Cookie
```

### Pattern 4: Report Aggregation

```text
ReportController → ReportService → multiple Repository queries → aggregate DTO → Response
```

---

## Frontend Service Layer

Thin JavaScript modules in `src/api/` and optional `features/{domain}/services/`:

| Layer | Responsibility |
|-------|----------------|
| `api/client.js` | Axios instance, interceptors |
| `api/{domain}Api.js` | HTTP calls per domain |
| `features/{domain}/hooks/` | React state, loading, error handling |
| `features/{domain}/services/` | Optional: compose multiple API calls for a page |

No business logic duplication — backend remains source of truth for rules.

---

## Transaction Boundaries

| Service type | Transaction |
|--------------|-------------|
| Auth login (password rehash) | `@Transactional` |
| Billing write | `@Transactional` |
| Visit create with exams | `@Transactional` |
| Read-only reports | `@Transactional(readOnly = true)` |

---

## Error Handling

All services throw domain exceptions or Spring `AccessDeniedException`; `GlobalExceptionHandler` maps to consistent API error responses with `traceId`. No silent catches in services.
