# Components

High-level component map for the DiziDental hardening iteration. Packages remain flat per moderate backend scope (Q8); components are **logical groupings** for design and construction units.

---

## Backend Components

### BC-1: Security & Authentication

| Attribute | Value |
|-----------|-------|
| **Purpose** | JWT auth, password encoding, CORS, method-level authorization |
| **Location** | `security/`, `controller/AuthController`, `controller/UserController` |
| **Key classes** | `SecurityConfig`, `JwtAuthenticationFilter`, `MdcLoggingFilter`, `JwtUtil`, `CustomUserDetailsService` |
| **Responsibilities** | Enforce authenticated access; issue/validate JWT cookies; BCrypt + migrate-on-login; env-driven CORS allowlist; `@PreAuthorize` role checks |
| **Construction unit** | `unit-security-hardening` |

### BC-2: Org Context & Multi-Tenancy

| Attribute | Value |
|-----------|-------|
| **Purpose** | Server-side org scoping validation |
| **Location** | New `service/OrgContextService`, used by all org-scoped services |
| **Responsibilities** | Resolve org ID from request header; validate user has access to org; reject cross-org data access |
| **Construction unit** | `unit-security-hardening`, `unit-backend-controller-audit` |

### BC-3: Clinical Core

| Attribute | Value |
|-----------|-------|
| **Purpose** | Patient care workflows |
| **Controllers** | `PatientController`, `VisitController`, `AppointmentController`, `TreatmentPlanController`, `PrescriptionController` |
| **Services** | `PatientService`, `VisitService`, `VisitExamService`, `VisitDiagnosisService`, `AppointmentService`, `TreatmentPlanService`, `PrescriptionService` |
| **Responsibilities** | Patient CRUD, visits, exams, appointments, treatment plans, prescriptions |
| **Construction unit** | `unit-backend-controller-audit`, `unit-backend-layering` |

### BC-4: Billing & Financial Reports

| Attribute | Value |
|-----------|-------|
| **Purpose** | Billing and revenue reporting |
| **Controllers** | `BillingController`, `RevenueReportController`, `PatientReportController`, `AppointmentReportController` |
| **Services** | `BillingService` (existing); **new** `RevenueReportService`, `PatientReportService`, `AppointmentReportService` |
| **Responsibilities** | Bills, payments, financial and operational reports |
| **Construction unit** | `unit-backend-controller-audit`, `unit-backend-layering` |

### BC-5: Operations & Inventory

| Attribute | Value |
|-----------|-------|
| **Purpose** | Inventory, vendors, labs, events |
| **Controllers** | `InventoryController`, `InventoryReportController`, `VendorController`, `LabController`, `EventController`, `TreatmentMasterController`, `ExamItemMasterController` |
| **Services** | `InventoryService`, `VendorService`, `LabService`, `EventService`, `TreatmentMasterService`, `ExamItemMasterService` |
| **Construction unit** | `unit-backend-controller-audit`, `unit-backend-layering` |

### BC-6: Administration

| Attribute | Value |
|-----------|-------|
| **Purpose** | Org, doctor, service provider management |
| **Controllers** | `OrganizationController`, `DoctorController`, `ServiceProviderController` |
| **Services** | `DoctorService`, `ServiceProviderService`; **new** `OrganizationService` |
| **Construction unit** | `unit-backend-controller-audit`, `unit-backend-layering` |

### BC-7: Communication

| Attribute | Value |
|-----------|-------|
| **Purpose** | Chat REST + WebSocket |
| **Controllers** | `ChatController`, `ChatWebSocketController` |
| **Services** | `ChatService`, `EventPushService` |
| **Responsibilities** | STOMP messaging; auth-aligned WebSocket handshake |
| **Construction unit** | `unit-backend-controller-audit` |

### BC-8: Cross-Cutting Infrastructure

| Attribute | Value |
|-----------|-------|
| **Purpose** | Shared API infrastructure |
| **Location** | `exception/`, `dto/`, `config/`, `entity/`, `repository/` |
| **Key classes** | `GlobalExceptionHandler`, DTOs, JPA entities, repositories |
| **Responsibilities** | Validation errors, trace IDs, seeders, Jackson/WebSocket config |
| **Construction unit** | All units (touch only when needed) |

---

## Frontend Components

### FC-1: App Shell

| Attribute | Value |
|-----------|-------|
| **Purpose** | Routing, auth gate, global providers |
| **Target location** | `src/app/` (`App.jsx`, route config, providers) |
| **Responsibilities** | Protected routes; backend offline detection; minimal session restore |
| **Construction unit** | `unit-frontend-restructure` |

### FC-2: API Client Layer

| Attribute | Value |
|-----------|-------|
| **Purpose** | HTTP communication with backend |
| **Target location** | `src/api/` (base client + domain modules) |
| **Modules** | `client.js` (from `api.js`), `authApi`, `patientApi`, `visitApi`, `billingApi`, etc. |
| **Responsibilities** | Cookie credentials, org header injection, error interceptors |
| **Construction unit** | `unit-frontend-restructure` |

### FC-3: Feature Modules

| Feature | Pages / Views | Target folder |
|---------|---------------|---------------|
| **auth** | LoginPage | `features/auth/` |
| **patient** | PatientOverview, Schedule, Billing, Documents, Reports, PatientEntry, PatientAdd | `features/patient/` |
| **doctor** | DoctorOverview, DentalCarePage, DoctorEntry | `features/doctor/` |
| **org** | OrgOverview | `features/org/` |
| **admin** | SuperAdmin*, Manage* | `features/admin/` |
| **provider** | ProviderOverview, LabOrders, Beds, GenericPortal | `features/provider/` |
| **clinical** | DiagnosisView, TreatmentPlanView, ConsentPostOpView, ClinicalExam | `features/clinical/` |
| **billing** | BillingView | `features/billing/` |
| **inventory** | InventoryView, VendorEntry, LabEntryView | `features/inventory/` |
| **schedule** | ScheduleView | `features/schedule/` |
| **reports** | ReportsView | `features/reports/` |
| **chat** | ChatPage | `features/chat/` |
| **dashboard** | UnifiedDashboard | `features/dashboard/` |

Each feature module contains: `pages/`, `components/` (domain-specific), `hooks/`, optional `services/` (thin wrappers over api modules).

### FC-4: Shared UI & Utilities

| Attribute | Value |
|-----------|-------|
| **Purpose** | Reusable UI and helpers |
| **Target location** | `src/shared/components/`, `src/shared/hooks/`, `src/shared/utils/` |
| **Includes** | WowDashLayout, ToastProvider, GlobalLoader, print components, odontogram, dateFormat, patientList |
| **Construction unit** | `unit-frontend-restructure` |

---

## Workload Classification (Resiliency)

| Component | Criticality | Rationale |
|-----------|-------------|-----------|
| BC-1 Security & Auth | Critical | Blocks all access; P0 findings |
| BC-3 Clinical Core | Critical | Primary HMS workflows |
| BC-4 Billing | High | Financial data integrity |
| FC-1 App Shell | Critical | User entry point |
| BC-7 Chat | Medium | Non-blocking for core clinical path |
| BC-5 Inventory | Medium | Operational support |
