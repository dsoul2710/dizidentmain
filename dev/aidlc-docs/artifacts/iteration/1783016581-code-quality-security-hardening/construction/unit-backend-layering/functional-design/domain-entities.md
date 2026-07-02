# Domain Entities — unit-backend-layering (Service Boundaries)

U3 does not introduce new database entities. This document defines **service boundaries** and primary entities each new/extended service manages.

---

## New Services

| Service | Primary entities | Repositories (internal) |
|---------|------------------|-------------------------|
| **OrganizationService** | User, OrgHospital, UserRole | UserRepository, OrgHospitalRepository |
| **PatientReportService** | Patient, Visit, PatientDoctorMapping | PatientRepository, VisitRepository, PatientDoctorMappingRepository |
| **RevenueReportService** | Bill, BillItem, BillPayment, VisitTreatmentItem | BillRepository, BillItemRepository, BillPaymentRepository, VisitTreatmentItemRepository |
| **AppointmentReportService** | Appointment, VisitTreatmentItem | AppointmentRepository, VisitTreatmentItemRepository |
| **InventoryReportService** | InventoryItem, InventoryMovement | InventoryItemRepository, InventoryMovementRepository |
| **ExamItemMasterService** | ExamItemMaster | ExamItemMasterRepository |

---

## Extended Services

| Service | Additional responsibility |
|---------|------------------------|
| **PatientService** | `findByIdAndIsDeletedFalse` with org scope (replace controller direct repo) |
| **VisitService** | `findById` lookup currently in VisitController |
| **PrescriptionService** | Template list/create with doctor scoping (replace findAll leak) |
| **DoctorService** | Profile + org mappings (replace DoctorController repos) |

---

## Dependency Graph

```text
Controllers
    → OrganizationService, PatientReportService, RevenueReportService,
      AppointmentReportService, InventoryReportService, ExamItemMasterService
    → PatientService, VisitService, PrescriptionService, DoctorService (extended)

Report services → ReportScopeService → SecurityUtils
Domain services → OrgContextService (where org scoping applies)
All services → respective *Repository
```

---

## DTOs

Existing request/response DTOs unchanged. Services return the same types controllers currently build.
