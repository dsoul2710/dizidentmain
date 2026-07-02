# Component Methods

Method signatures for new or refactored components. Existing controller endpoints retain paths and DTOs (no breaking API changes). Detailed business rules deferred to Functional Design per unit.

---

## BC-1: Security & Authentication

### SecurityConfig (modified)

| Method | Signature | Purpose |
|--------|-----------|---------|
| `securityFilterChain` | `SecurityFilterChain securityFilterChain(HttpSecurity http)` | JWT required on `/api/**` except login, health, swagger |
| `passwordEncoder` | `PasswordEncoder passwordEncoder()` | `DelegatingPasswordEncoder` with BCrypt default + `{noop}` legacy |
| `corsConfigurationSource` | `CorsConfigurationSource corsConfigurationSource()` | Env-driven origin allowlist |

### AuthController (thin — delegates to AuthService)

| Method | HTTP | Signature | Response |
|--------|------|-----------|----------|
| `login` | POST `/api/auth/login` | `LoginRequest` | `LoginResponse` + Set-Cookie JWT |
| `logout` | POST `/api/auth/logout` | — | Clear cookie |

### AuthService (new)

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `authenticate` | `LoginRequest` | `AuthenticatedUser` | Validate credentials, re-hash plain password on success |
| `buildLoginResponse` | `User`, permissions | `LoginResponse` | Resolve display name by role |
| `issueJwtCookie` | `User` | `ResponseCookie` | HttpOnly JWT cookie |
| `loadModulePermissions` | `Long userId` | `List<ModulePermissionResponse>` | Module access for frontend |

### UserController (thin — delegates to UserService)

| Method | HTTP | Notes |
|--------|------|-------|
| Existing CRUD endpoints | `/api/users/**` | Move repository calls to `UserService`; add `@PreAuthorize` |

---

## BC-2: Org Context

### OrgContextService (new)

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `resolveOrgId` | `HttpServletRequest` | `Long orgId` | Read `X-Org-Id` header with JWT fallback rules |
| `validateOrgAccess` | `Long userId`, `Long orgId` | `void` | Throw `AccessDeniedException` if user cannot access org |
| `requireOrgId` | `HttpServletRequest` | `Long` | Mandatory org for org-scoped endpoints |

---

## BC-3: Clinical Core (layering targets)

### PatientController → PatientService

Controllers retain HTTP mapping; these operations move behind service layer if currently in controller:

| Operation | Current | Target |
|-----------|---------|--------|
| Get patient by ID | Direct `patientRepository` | `PatientService.getById(orgId, id)` |
| Update patient | Direct repository | `PatientService.update(...)` |
| Soft delete | Direct repository | `PatientService.softDelete(...)` |

### VisitController → VisitService

| Operation | Target method |
|-----------|---------------|
| List/create/update visits | Existing + extended `VisitService` methods |
| Visit exams/diagnosis | `VisitExamService`, `VisitDiagnosisService` |

### AppointmentController → AppointmentService

All repository access via `AppointmentService` (already exists — verify completeness).

---

## BC-4: Billing & Reports (new services)

### RevenueReportService (new)

| Method | Input | Output |
|--------|-------|--------|
| `getRevenueSummary` | `orgId`, date range, filters | Revenue DTO |
| `getPaymentBreakdown` | `orgId`, date range | Payment summary DTO |

### PatientReportService (new)

| Method | Input | Output |
|--------|-------|--------|
| `listPatientsWithStats` | `orgId`, doctorId, providerId | Patient report rows |
| `getPatientVisitSummary` | `patientId`, `orgId` | Visit stats |

### AppointmentReportService (new)

| Method | Input | Output |
|--------|-------|--------|
| `getAppointmentMetrics` | `orgId`, date range | Appointment report DTO |

---

## BC-6: Administration

### OrganizationService (new)

| Method | Input | Output |
|--------|-------|--------|
| `createOrg` | Create org DTO | `OrgHospital` response |
| `updateOrg` | id, update DTO | Updated org |
| `listOrgs` | filters | List of orgs |

---

## FC-2: API Client Layer

### client.js (base — from api.js)

| Export | Purpose |
|--------|---------|
| `api` | Axios instance with credentials, org header interceptor |
| `setOrgId(orgId)` | Set default org header |
| Error interceptor | Dispatch backend-offline events |

### Domain API modules (new pattern)

Each module exports named functions (no class required):

```javascript
// authApi.js
export async function login(mobile, password) { ... }
export async function logout() { ... }

// patientApi.js
export async function getPatient(id) { ... }
export async function listPatients(params) { ... }
```

---

## FC-3: Feature Hooks (new shared pattern)

| Hook | Feature | Purpose |
|------|---------|---------|
| `useAuth` | auth | Current user, login/logout |
| `usePatient` | patient | Load/cache patient context |
| `useOrgContext` | shared | Selected org ID |
| `useApiError` | shared | Map API errors to toast messages |

---

## Authorization Annotations (cross-cutting)

Applied at controller or service layer per endpoint:

| Pattern | Example |
|---------|---------|
| Role check | `@PreAuthorize("hasRole('ADMIN')")` |
| Module permission | `@PreAuthorize("@moduleAuth.can(authentication, 'BILLING')")` — optional custom bean in security unit |
| Public | Only `/api/auth/login`, health, swagger |

Detailed permission matrix defined in Functional Design for `unit-security-hardening`.
