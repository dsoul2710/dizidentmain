# Code Generation Plan — unit-backend-layering

**Unit:** U3 | **Traceability:** FR-2.*, FR-5.*

## Steps

- [x] Step 1: Create `OrganizationService` — extract from OrganizationController
- [x] Step 2: Create report services (Patient, Revenue, Appointment, Inventory)
- [x] Step 3: Thin report controllers — delegate to services
- [x] Step 4: Extend `DoctorService.getMyClinicsForCurrentDoctor()`
- [x] Step 5: Extend `PrescriptionService` — template list/create
- [x] Step 6: Extend `ExamItemMasterService.listActiveExamItems()`
- [x] Step 7: Extend `VisitDiagnosisService.getDiagnosisDetail()`
- [x] Step 8: Extend `PatientService` — file access helpers
- [x] Step 9: Remove all repository imports from controllers
- [x] Step 10: Run `./gradlew test` — BUILD SUCCESSFUL
- [x] Step 11: Write code summary
