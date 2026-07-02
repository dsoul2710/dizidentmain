# Unit of Work Definitions

Four sequential construction units for the DiziDental brownfield hardening iteration. Each unit completes design + code before the next begins (per execution plan).

---

## U1: unit-security-hardening

| Attribute | Value |
|-----------|-------|
| **Priority** | P0 — blocks all other units |
| **Scope** | Backend security foundation |
| **Package paths** | `backend/.../security/`, `AuthController`, `UserController`, new `AuthService`, `UserService`, `OrgContextService` |
| **Requirements** | FR-1.1–FR-1.7 (security subset), FR-6.1 |

### Responsibilities

- Replace `permitAll` with authenticated `/api/**` (except login, health, swagger)
- Implement BCrypt with `DelegatingPasswordEncoder` and migrate-on-login
- Env-driven CORS allowlist (`CORS_ALLOWED_ORIGINS`)
- Enable `@EnableMethodSecurity` and `@PreAuthorize` on auth/user endpoints
- Create `AuthService`, `UserService`, `OrgContextService`
- Extract login logic from `AuthController`; thin controller
- Add/update tests for changed auth code only (FR-5.1)
- Document SEC-001, SEC-002, SEC-003 resolution in audit log

### Deliverables

- Hardened `SecurityConfig.java`
- New service classes
- Auth integration tests (login, 401 without JWT)
- Updated `application.properties` / env example for CORS

### Construction stages

| Stage | Execute |
|-------|---------|
| Functional Design | Yes |
| NFR Requirements | Yes |
| NFR Design | Yes |
| Infrastructure Design | Skip |
| Code Generation | Yes |

### Success criteria

- Login works with existing frontend (cookie JWT)
- Unauthenticated `/api/patients` returns 401
- Plain-text password users can log in once and get re-hashed

---

## U2: unit-backend-controller-audit

| Attribute | Value |
|-----------|-------|
| **Priority** | P1 — after security |
| **Scope** | Full parallel audit of 22 REST controllers + WebSocket |
| **Package paths** | `backend/.../controller/*`, related services touched for fixes |
| **Requirements** | FR-4.1–FR-4.4, FR-10 (critical+high), FR-6.1–FR-6.2 |

### Responsibilities

- Audit all controllers against checklist: auth, org scoping, validation, error handling, injection risks
- Fix all **critical** and **high** findings in this iteration
- Ticket medium/low in `aidlc-docs/construction/findings-deferred.md`
- Align WebSocket chat auth with JWT model
- Add tests only for code changed during fixes
- Use knowledge graph for impact analysis before edits

### Controller inventory (22)

AuthController, UserController, PatientController, VisitController, AppointmentController, BillingController, PrescriptionController, TreatmentPlanController, TreatmentMasterController, ExamItemMasterController, InventoryController, InventoryReportController, VendorController, LabController, ChatController, ChatWebSocketController, DoctorController, OrganizationController, ServiceProviderController, EventController, PatientReportController, RevenueReportController, AppointmentReportController

### Deliverables

- Audit report artifact with finding ID, severity, status per controller
- Fixes for critical/high issues
- Deferred findings document

### Construction stages

| Stage | Execute |
|-------|---------|
| Functional Design | Skip (audit-driven) |
| NFR Requirements | Yes |
| NFR Design | Yes |
| Infrastructure Design | Skip |
| Code Generation | Yes |

### Success criteria

- All 22 controllers audited and documented
- Zero open critical/high findings (or documented blocker with rationale)

---

## U3: unit-backend-layering

| Attribute | Value |
|-----------|-------|
| **Priority** | P2 — after audit fixes |
| **Scope** | Enforce controller → service → repository project-wide |
| **Package paths** | `controller/`, `service/` — no package moves |
| **Requirements** | FR-2.1–FR-2.4, FR-5.1–FR-5.2 |

### Responsibilities

- Remove direct repository injection from all controllers (12 known violators)
- Create missing services: `OrganizationService`, `RevenueReportService`, `PatientReportService`, `AppointmentReportService`
- Extend existing services where controllers still call repos directly
- Ensure all org-scoped service methods use `OrgContextService`
- Preserve API contracts — no breaking changes
- PBT for DTO round-trips where serialization touched

### Controllers targeted for extraction

AuthController, UserController, PatientController, PatientReportController, DoctorController, OrganizationController, VisitController, PrescriptionController, RevenueReportController, AppointmentReportController, ExamItemMasterController, InventoryReportController

### Deliverables

- Zero `Repository` imports in `controller/` package
- New/extended service classes
- Tests for changed service methods

### Construction stages

| Stage | Execute |
|-------|---------|
| Functional Design | Yes |
| NFR Requirements | Skip |
| NFR Design | Skip |
| Infrastructure Design | Skip |
| Code Generation | Yes |

### Success criteria

- Grep verification: no controller injects repositories
- `./gradlew test` passes

---

## U4: unit-frontend-restructure

| Attribute | Value |
|-----------|-------|
| **Priority** | P3 — after backend security validated |
| **Scope** | Comprehensive feature-based folder layout |
| **Package paths** | `frontend/src/` |
| **Requirements** | FR-3.1–FR-3.4, FR-1.7 (localStorage where touched), FR-5.1 |

### Responsibilities

- Restructure to `app/`, `features/{domain}/`, `shared/`, split `api/` modules
- Move 66 source files to feature modules per application design map
- Create shared hooks: `useAuth`, `usePatient`, `useOrgContext`, `useApiError`
- Update all imports; preserve route paths and WowDash UI
- Reduce localStorage misuse in touched files (SEC-006 partial — full defer per Q10)
- `npm run lint` and `npm run build` pass

### Feature modules

auth, patient, doctor, org, admin, provider, clinical, billing, inventory, schedule, reports, chat, dashboard

### Deliverables

- New folder structure applied
- Domain API modules (`authApi.js`, `patientApi.js`, etc.)
- Import path updates across codebase
- FRONTEND_ARCHITECTURE.md update (if exists) or aidlc-docs summary

### Construction stages

| Stage | Execute |
|-------|---------|
| Functional Design | Yes |
| NFR Requirements | Yes (XSS, session handling) |
| NFR Design | Skip |
| Infrastructure Design | Skip |
| Code Generation | Yes |

### Success criteria

- `npm run build` succeeds
- Login + one clinical flow smoke test passes against hardened backend

---

## Post-Units: Build and Test

Not a unit — construction phase closure:

- `./gradlew test`, `npm run lint`, `npm run build`
- Manual smoke test
- Security checklist sign-off (`aidlc-docs/construction/security-checklist-signoff.md`)

---

## Unit Summary Table

| Unit | Backend | Frontend | Est. relative size |
|------|---------|----------|-------------------|
| U1 security | Yes | No | Medium |
| U2 audit | Yes | No | Large |
| U3 layering | Yes | No | Large |
| U4 frontend | No | Yes | Large |
