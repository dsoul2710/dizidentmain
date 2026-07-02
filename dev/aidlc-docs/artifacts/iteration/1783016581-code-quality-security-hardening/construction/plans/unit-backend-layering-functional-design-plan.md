# Functional Design Plan — unit-backend-layering

## Unit Context

- **Unit**: U3 — unit-backend-layering
- **Scope**: Enforce controller → service → repository; no package moves
- **Requirements**: FR-2.1–FR-2.4, FR-5.1–FR-5.2

## Design Questions (resolved)

### Service extraction strategy

A) One new service per controller with repo violations  
B) Group by domain (reports → single ReportService family)  
C) Minimal extraction — only move repo calls, keep logic in controller  
D) Other

[Answer]: A/B hybrid — four dedicated report services plus extend/create domain services (`OrganizationService`, `DoctorService` extension, `PrescriptionService` extension, `ExamItemMasterService`, `PatientService` extension)

### OrgContextService usage

Should all new service methods use `OrgContextService` for scoping?

A) Yes — consistent org resolution  
B) Only where controller currently uses SecurityUtils directly  
C) Other

[Answer]: A — services delegate org/role context to `OrgContextService` / `ReportScopeService` where applicable

### Report controller logic

Move aggregation logic to services or keep in controller?

A) Full move — controllers become thin HTTP adapters  
B) Partial — only repo calls move  
C) Other

[Answer]: A — report controllers delegate all data access and aggregation to report services

### API contract

A) Preserve all paths, DTOs, response shapes  
B) Allow minor response cleanup  
C) Other

[Answer]: A — no breaking API changes

---

## Execution Checklist

- [x] Step 1: Inventory 11 controllers with repository imports
- [x] Step 2: Map controller → target service
- [x] Step 3: Write business-logic-model.md
- [x] Step 4: Write business-rules.md
- [x] Step 5: Write domain-entities.md (service boundaries)
