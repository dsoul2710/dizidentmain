# Code Generation Plan — unit-backend-controller-audit

**Unit:** U2 | **Traceability:** FR-4.*, FR-6.*, SEC-005

## Steps

- [x] Step 1: Parallel audit of 22 controllers — write `code/audit-report.md`
- [x] Step 2: Create `findings-deferred.md` with medium/low tickets
- [x] Step 3: Create `ReportScopeService` for org owner resolution
- [x] Step 4: Add repository scoped queries (`findByOwner_Id`, `findByDoctor_Id`, `findByPatient_IdIn`)
- [x] Step 5: Fix PatientReportController — scoped visit loading (AUD-H01)
- [x] Step 6: Fix RevenueReportController — `loadScopedBills()` (AUD-H02)
- [x] Step 7: Fix AppointmentReportController — owner-filtered date range (AUD-H03)
- [x] Step 8: Fix InventoryReportController — `loadScopedItems()` (AUD-H04)
- [x] Step 9: Add `@PreAuthorize` to report controllers
- [x] Step 10: Add `ReportScopeServiceTest`
- [x] Step 11: Run `./gradlew test` — BUILD SUCCESSFUL
- [x] Step 12: Write code summary
