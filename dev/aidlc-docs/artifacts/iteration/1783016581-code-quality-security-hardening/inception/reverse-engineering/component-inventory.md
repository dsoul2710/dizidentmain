# Component Inventory

## Application Packages

| Component | Type | Purpose |
|-----------|------|---------|
| `backend/` | Spring Boot monolith | REST + WebSocket API |
| `frontend/` | React SPA | Clinic HMS UI |

## Backend Controllers (22)

AuthController, UserController, PatientController, VisitController, AppointmentController, BillingController, PrescriptionController, TreatmentPlanController, TreatmentMasterController, ExamItemMasterController, InventoryController, InventoryReportController, VendorController, LabController, ChatController, ChatWebSocketController, DoctorController, OrganizationController, ServiceProviderController, EventController, PatientReportController, RevenueReportController, AppointmentReportController

## Frontend Page Groups

- **auth/** — LoginPage
- **patient/** — Overview, Schedule, Billing, Documents, Reports
- **doctor/** — DoctorOverview, DentalCarePage
- **org/** — OrgOverview
- **super-admin/** — Manage orgs, doctors, patients, service providers
- **provider/** — Lab, beds, generic provider portal
- **chat/** — ChatPage
- **Root pages** — BillingView, ScheduleView, InventoryView, ReportsView, PatientEntry, etc.

## Infrastructure

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Dev stack |
| `backend/Dockerfile` | Backend container |
| `frontend/Dockerfile` | Frontend container |
| `init-db.sql` | DB init |

## Test Packages

| File | Type |
|------|------|
| `ClinicHmsApplicationTests.java` | Context load |
| `BoundaryIsolationTests.java` | Boundary/isolation |

## Total Count

- **Backend Java files**: ~205 under `com.clinic.hms`
- **Frontend source files**: ~66 under `src/`
- **REST controllers**: 22
- **Test classes**: 2
