# Requirements: Multi-Org Affiliation & Source Attribution

> **Feature goal:** Let Doctors and Service Providers run their own practice **and** affiliate with one or more hospitals/clinics by unique ID — then see patients/orders with a clear flag showing which hospital the work came from.

**Document status:** Draft for implementation  
**Scope:** Backend (`backend/`) + Frontend (`frontend/`)  
**Related product roles:** `DOCTOR`, `ORG_HOSPITAL` / `ORG`, `SERVICE_PROVIDER`, `SUPER_ADMIN`

---

## 1. Problem Statement

Today, multi-org affiliation is only partially implemented:

- Doctors can be linked to hospitals via unique ID **in the backend**, but the hospital UI does not expose “add by unique ID,” and the doctor dashboard does **not** show “this patient came from Hospital X.”
- Service Providers have unique IDs and org-mapping tables, but hospitals **cannot** onboard an existing provider by unique ID the way doctors can, and orders lack a hospital source flag.

This document defines the full functional requirements, user stories, acceptance criteria, and frontend/backend work to close those gaps.

---

## 2. Target User Experience (Canonical Scenarios)

### 2.1 Doctor — own practice + multiple hospitals

1. Doctor creates an account as an independent practitioner (`DOC-XXXXXX` unique ID).
2. Doctor can manage their own patients/appointments for private practice.
3. Hospital/clinic admin adds that doctor by entering `DOC-XXXXXX` (no new account).
4. Doctor may be linked to **multiple** hospitals the same way.
5. When a hospital books/assigns a patient to that doctor, the doctor sees the patient on their dashboard with a **source flag** (e.g. “From: City Dental Hospital”).
6. Private-practice patients show as **Own practice** (or no hospital badge).
7. Doctor can view/switch among affiliated clinics (`my-clinics`).

### 2.2 Service Provider — own ops + multiple hospitals

1. Service Provider creates/registers with `SP-XXXXXX` and opted service types (e.g. `BED_MANAGER`, and optionally inventory when productized).
2. Hospital/clinic admin adds that provider by unique ID (same pattern as doctors).
3. Provider may be linked to **multiple** hospitals.
4. When a hospital places a service order (lab, bed, pharmacy order, etc.), the provider sees it with a **source flag** (“From: Hospital X”).
5. Provider can view affiliated clinics (`my-clinics`).

---

## 3. Current State — Proof from Codebase

This section is the evidence baseline for gaps and reuse.

### 3.1 Multi-tenancy / org model (exists)

| Asset | Location | Notes |
|--------|----------|--------|
| Org entity | `backend/.../entity/OrgHospital.java` | `uniqueId` (`ORG-XXXXXX`), `logtoOrgId` |
| Active org header | `AuthorizationService` + `X-Active-Org-Id` | Org-scoped authorization |
| Patient ↔ org | `PatientOrgMapping` | Used when patients are registered under an org |

### 3.2 Doctor affiliation (partially exists)

| Asset | Location | Status |
|--------|----------|--------|
| Doctor unique ID | `Doctor.uniqueId` (`DOC-XXXXXX`) | ✅ |
| Doctor ↔ org mapping | `DoctorOrgMapping` | ✅ multi-org capable |
| Onboard by unique ID API | `POST /api/doctors/onboard?uniqueId=` → `DoctorService.onboardDoctor` | ✅ backend |
| List doctor clinics | `GET /api/doctors/my-clinics` | ✅ backend |
| Independent doctor seed | `DataSeeder` (“Independent Doctor”, no org link) | ✅ proves independent model |
| Manage Doctors UI onboard | `frontend/.../ManageDoctors.jsx` | ❌ creates new only; no onboard call |
| Frontend `my-clinics` usage | Frontend search | ❌ not used |
| Patient source hospital flag | `PatientResponse` | ❌ no `sourceOrgId` / `sourceOrgName` |
| Appointment/Visit org FK | `Appointment`, `Visit` | ❌ only `owner` User; no explicit org attribution for UI |

### 3.3 Service Provider affiliation (foundation only)

| Asset | Location | Status |
|--------|----------|--------|
| Provider unique ID | `ServiceProvider.uniqueId` (`SP-XXXXXX`) | ✅ |
| Provider ↔ org mapping | `ServiceProviderOrgMapping` | ✅ data model |
| List provider clinics | `GET /api/service-providers/my-clinics` | ✅ backend |
| Multi service types | `ServiceProviderType` + `providerTypes` | ✅ (LAB, BED_MANAGER, PHARMACY, …) |
| Onboard by unique ID API | `ServiceProviderController` | ❌ no `/onboard` |
| Hospital can manage providers | Controller gated to Super Admin | ❌ org cannot add existing SP |
| Manage SP UI onboard | `ManageServiceProviders.jsx` | ❌ Super Admin create/edit only |
| Order source hospital flag | `ServiceOrder` | ❌ has `requester` User, no org FK / display name |

### 3.4 Module access related to scenario (context)

| Behavior | Location | Status |
|----------|----------|--------|
| SP type → module bootstrap | `AuthService.getOrBootstrapPermissions` | ✅ `BED_MANAGER` → `BED_ALLOCATION_MODULE`; `PHARMACY` → `PHARMACY_ORDERS_MODULE` |
| Inventory vs pharmacy | `ModuleScopeMapping`, modules | ✅ separate modules |
| SP opt-in Inventory as provider type | `ServiceProviderType` | ❌ no `INVENTORY` type; must grant `ModulePermission` manually today |
| Per-user module permissions API | `GET/PUT /api/users/{id}/permissions` | ✅ |

---

## 4. Goals & Non-Goals

### 4.1 Goals

1. Make **unique-ID onboarding** a complete hospital workflow for Doctors **and** Service Providers (API + UI + authz).
2. Preserve **independent practice** for Doctors/Providers with zero or many hospital affiliations.
3. Attribute clinical work and service orders to a **source organization** and show that attribution on Doctor/Provider dashboards.
4. Let affiliated users list clinics and (where applicable) switch active org context.
5. Keep pharmacy and operational inventory distinct; support bed + inventory style opt-ins for providers where product requires it.

### 4.2 Non-Goals (this feature)

- Rewriting Logto IAM from scratch (reuse existing org claims / `X-Active-Org-Id` patterns).
- Separate physical databases per hospital.
- Changing clinical treatment workflows beyond affiliation + source attribution.
- Full marketplace/billing for cross-org referrals (unless already present).

---

## 5. Personas

| Persona | Role code | Needs |
|---------|-----------|--------|
| Independent Doctor | `DOCTOR` | Own practice; accept hospital affiliations; see source of each patient/appointment |
| Hospital Admin | `ORG_HOSPITAL` / `ORG` | Add existing doctors/providers by unique ID; assign patients/orders to them |
| Independent Service Provider | `SERVICE_PROVIDER` | Own modules by opted types; receive multi-hospital orders with source flag |
| Super Admin | `SUPER_ADMIN` | Platform oversight; optional create/link; dispute/reactivate mappings |

---

## 6. User Stories

### 6.1 Doctor affiliation

| ID | Story | Priority |
|----|--------|----------|
| US-D1 | As a Doctor, I can register independently and receive a unique ID (`DOC-XXXXXX`) so hospitals can find me without creating a duplicate account. | Must |
| US-D2 | As a Hospital Admin, I can search/onboard an existing doctor by unique ID so they appear in my clinic’s doctor list. | Must |
| US-D3 | As a Hospital Admin, I can see whether a doctor is already linked (ACTIVE) and reactivate a previously inactive link. | Must |
| US-D4 | As a Doctor, I can be linked to multiple hospitals simultaneously. | Must |
| US-D5 | As a Doctor, I can list my affiliated clinics (`my-clinics`) and know which context I am working in. | Must |
| US-D6 | As a Doctor, when a hospital assigns/books a patient to me, I see that patient with a **“From: {Hospital Name}”** flag. | Must |
| US-D7 | As a Doctor, patients from my own practice are labeled **Own practice** (or equivalent). | Must |
| US-D8 | As a Hospital Admin, removing/unlinking a doctor sets mapping INACTIVE without deleting the doctor’s account. | Must |
| US-D9 | As a Doctor, unlinking from a hospital does not remove my private-practice patients. | Must |

### 6.2 Service Provider affiliation

| ID | Story | Priority |
|----|--------|----------|
| US-S1 | As a Service Provider, I have a unique ID (`SP-XXXXXX`) and one or more opted service types. | Must |
| US-S2 | As a Hospital Admin, I can onboard an existing Service Provider by unique ID into my clinic. | Must |
| US-S3 | As a Service Provider, I can affiliate with multiple hospitals. | Must |
| US-S4 | As a Service Provider, I can list affiliated clinics (`my-clinics`). | Must |
| US-S5 | As a Service Provider, I see incoming service orders with **“From: {Hospital Name}”**. | Must |
| US-S6 | As a Hospital Admin, I can unlink a provider (INACTIVE) without deleting their account. | Must |
| US-S7 | As a Service Provider with `BED_MANAGER`, I receive bed-related work from affiliated hospitals. | Must |
| US-S8 | As a Service Provider maintaining in-house operational inventory (distinct from pharmacy), I can be granted Inventory module access (opt-in / permission). | Should |

### 6.3 Source attribution (cross-cutting)

| ID | Story | Priority |
|----|--------|----------|
| US-A1 | As a Doctor/Provider, every shared patient/order shows source org name when originated under a hospital context. | Must |
| US-A2 | As a Hospital Admin, appointments/visits/orders created in my org are owned/attributed to my org. | Must |
| US-A3 | As any user, source attribution remains visible in list views and detail views (not only tooltips). | Should |

### 6.4 Security & tenancy

| ID | Story | Priority |
|----|--------|----------|
| US-X1 | As the system, only authenticated Hospital Admins (or Super Admin) may onboard doctors/providers into an org. | Must |
| US-X2 | As the system, a doctor/provider only accesses org-scoped data when mapping status is ACTIVE. | Must |
| US-X3 | As the system, Super Admin can override/audit affiliations. | Should |

---

## 7. Functional Requirements

### 7.1 Unique identity

| ID | Requirement |
|----|-------------|
| FR-1 | Every Doctor MUST have a unique, immutable display ID (`DOC-######`). |
| FR-2 | Every Service Provider MUST have a unique, immutable display ID (`SP-######`). |
| FR-3 | Unique IDs MUST be searchable for onboarding (exact match required for link). |
| FR-4 | Creating a new account MUST NOT be required when linking an existing identity. |

### 7.2 Affiliation lifecycle

| ID | Requirement |
|----|-------------|
| FR-5 | Hospital Admin MUST be able to create `DoctorOrgMapping` / `ServiceProviderOrgMapping` with status `ACTIVE` via unique ID. |
| FR-6 | Re-onboarding an INACTIVE mapping MUST reactivate it (doctors already do this). |
| FR-7 | Re-onboarding an already ACTIVE mapping MUST return a clear conflict error. |
| FR-8 | Unlink MUST set status `INACTIVE` (soft unlink), not hard-delete the user profile. |
| FR-9 | One doctor/provider MAY have many ACTIVE org mappings. |
| FR-10 | Independent practice (zero org mappings) MUST remain valid. |

### 7.3 Source attribution

| ID | Requirement |
|----|-------------|
| FR-11 | Appointments and visits created under hospital context MUST store source org (explicit FK preferred over inferring from `owner` alone). |
| FR-12 | Service orders created under hospital context MUST store source org. |
| FR-13 | Patient list/detail APIs for doctors MUST include source attribution per relevant relationship or latest org context (see API contract). |
| FR-14 | Provider order list/detail APIs MUST include `sourceOrgId` + `sourceOrgName`. |
| FR-15 | Own-practice records MUST be distinguishable (`sourceType=OWN_PRACTICE` or null org + label). |

### 7.4 Visibility rules

| ID | Requirement |
|----|-------------|
| FR-16 | After onboarding, hospital-assigned patients/appointments for that doctor MUST appear on the doctor’s dashboard. |
| FR-17 | Doctor MUST NOT automatically see all hospital patients solely because of affiliation; assignment/booking/link is required. |
| FR-18 | Provider MUST see orders where they are the fulfillment provider and mapping to source org is ACTIVE (or order explicitly assigned). |

### 7.5 Module / access customization (provider)

| ID | Requirement |
|----|-------------|
| FR-19 | Provider module access continues to bootstrap from `providerTypes` (bed → `BED_ALLOCATION_MODULE`, pharmacy → `PHARMACY_ORDERS_MODULE`, etc.). |
| FR-20 | Inventory MUST remain distinct from pharmacy. |
| FR-21 | Product SHOULD support granting `INVENTORY` to a provider via permissions and/or a dedicated opt-in (document implementation choice in design). |

### 7.6 AuthZ

| ID | Requirement |
|----|-------------|
| FR-22 | Onboard doctor/provider endpoints require org role (or Super Admin) + valid active org context. |
| FR-23 | Existing `AuthorizationService` org membership checks for doctors/providers MUST continue to use ACTIVE mappings. |
| FR-24 | Frontend route/menu visibility MUST respect module permissions already returned at login. |

---

## 8. Backend Requirements

### 8.1 APIs — Doctors (extend existing)

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/doctors/onboard?uniqueId=` | Keep; ensure org-role authz, clear errors, audit fields |
| `GET` | `/api/doctors/my-clinics` | Keep; ensure ACTIVE only |
| `POST` | `/api/doctors/{id}/unlink` or `DELETE .../org-mappings/{orgId}` | **Add** soft unlink for hospital admin |
| `GET` | `/api/doctors/lookup?uniqueId=` | **Add** read-only preview before onboard (name, speciality, alreadyLinked) |
| `GET` | `/api/doctors` | Ensure hospital list shows only ACTIVE mappings |

### 8.2 APIs — Service Providers (parity with doctors)

| Method | Path | Change |
|--------|------|--------|
| `POST` | `/api/service-providers/onboard?uniqueId=` | **Add** — mirror `DoctorService.onboardDoctor` |
| `GET` | `/api/service-providers/lookup?uniqueId=` | **Add** — preview before link |
| `GET` | `/api/service-providers/my-clinics` | Keep |
| `POST/DELETE` | unlink mapping | **Add** soft unlink |
| Hospital-scoped list | e.g. `GET /api/service-providers?scope=org` | **Add/adjust** — currently Super-Admin-only list; Hospital Admin needs org-scoped list |

**Auth change:** Hospital Admin (`ORG_HOSPITAL` / `ORG`) MUST be allowed to lookup/onboard/unlink providers for their active org. Super Admin retains full management.

### 8.3 Data model changes (recommended)

#### 8.3.1 Persist source org on clinical/work records

Add nullable `source_org_id` (FK → `org_hospitals`) to at least:

- `appointments`
- `visits`
- `service_orders`

Rules:

- When creator has active org context → set `source_org_id` to that org.
- When doctor creates under own practice (no active org) → leave null / mark own practice.
- Do not break existing rows: migration nullable + backfill best-effort from `owner` where `owner` is an org user.

#### 8.3.2 Optional DTO enrichment (minimum viable without full FK migration)

If phased:

1. **Phase A:** Enrich responses by resolving org from `owner` when owner is `ORG_HOSPITAL`.
2. **Phase B:** Add explicit `source_org_id` for correctness across doctor-owned records created inside hospital context.

Phase B is required for full correctness of US-A1/US-A2.

### 8.4 Response contract additions

#### Patient / appointment / visit (doctor-facing)

```json
{
  "sourceOrgId": 12,
  "sourceOrgName": "City Dental Hospital",
  "sourceType": "HOSPITAL"
}
```

Own practice:

```json
{
  "sourceOrgId": null,
  "sourceOrgName": null,
  "sourceType": "OWN_PRACTICE"
}
```

#### Service order (provider-facing)

```json
{
  "sourceOrgId": 12,
  "sourceOrgName": "City Dental Hospital",
  "requesterUserId": 55,
  "requesterName": "Dr. Rao / Front Desk"
}
```

### 8.5 Services / classes to touch

| Area | Files / packages (indicative) |
|------|-------------------------------|
| Doctor onboard/unlink/lookup | `DoctorService`, `DoctorController`, `DoctorOrgMappingRepository` |
| Provider onboard/unlink/lookup | `ServiceProviderService`, `ServiceProviderController`, `ServiceProviderOrgMappingRepository` |
| Attribution on create | `AppointmentService`, visit services, service-order service (create if missing) |
| Patient list enrichment | `PatientService`, `PatientResponse` |
| AuthZ | `AuthorizationService`, controller `@PreAuthorize` / role checks |
| Seed/demo | `DataSeeder` — independent doctor + multi-org demo mappings |
| Tests | Unit + integration for onboard, conflict, multi-org, attribution |

### 8.6 Backend acceptance tests (minimum)

1. Independent doctor onboarded into Org A → mapping ACTIVE.
2. Same doctor onboarded into Org B → two ACTIVE mappings.
3. Onboard duplicate into Org A → 4xx conflict.
4. Unlink Org A → INACTIVE; Org B still ACTIVE; own patients intact.
5. Appointment created by Org A for doctor → doctor API returns `sourceOrgName=Org A`.
6. Provider onboard by `SP-…` works for Hospital Admin (not only Super Admin).
7. Provider order from Org A shows source org name.
8. Unauthorized role cannot onboard.

---

## 9. Frontend Requirements

### 9.1 Hospital Admin — Manage Doctors

**File focus:** `frontend/src/features/admin/pages/ManageDoctors.jsx` (and related components)

| ID | Requirement |
|----|-------------|
| FE-D1 | Add **“Add existing doctor (Unique ID)”** flow separate from “Create new doctor.” |
| FE-D2 | Lookup by `DOC-XXXXXX` → show name/speciality/already-linked status → confirm onboard. |
| FE-D3 | Show doctor unique ID prominently in table. |
| FE-D4 | Support unlink / deactivate affiliation for this hospital. |
| FE-D5 | Clear success/error toasts for already linked / not found. |

### 9.2 Hospital Admin — Manage Service Providers

**File focus:** `ManageServiceProviders.jsx` (+ org-scoped access)

| ID | Requirement |
|----|-------------|
| FE-S1 | Hospital Admin can open org-scoped provider list (not Super-Admin-only). |
| FE-S2 | **“Add existing provider (Unique ID)”** lookup + onboard. |
| FE-S3 | Show `SP` unique ID + provider types badges. |
| FE-S4 | Unlink provider from this hospital. |
| FE-S5 | Creating brand-new providers may remain Super Admin (or org-allowed if product decides); linking existing is required for Hospital Admin. |

### 9.3 Doctor dashboard / patient lists

| ID | Requirement |
|----|-------------|
| FE-D6 | Patient cards/rows show source badge: hospital name or “Own practice.” |
| FE-D7 | Appointment/visit lists show the same badge. |
| FE-D8 | Add **My Clinics** view or switcher using `/api/doctors/my-clinics`. |
| FE-D9 | When working in a hospital context (if context switch exists), send `X-Active-Org-Id` consistently with backend. |

### 9.4 Service Provider portal

| ID | Requirement |
|----|-------------|
| FE-S6 | Orders/work queues show **From: {Hospital}** badge. |
| FE-S7 | My Clinics view using `/api/service-providers/my-clinics`. |
| FE-S8 | Module menus continue to respect permissions (`BED_ALLOCATION_MODULE`, etc.). |

### 9.5 Shared UI patterns

| ID | Requirement |
|----|-------------|
| FE-U1 | Reusable `SourceOrgBadge` component (`OWN_PRACTICE` vs hospital). |
| FE-U2 | Reusable `OnboardByUniqueIdModal` for Doctor and Provider. |
| FE-U3 | Empty states explaining “Link by unique ID to collaborate across hospitals.” |
| FE-U4 | Mobile-friendly badges (truncate long hospital names with tooltip/title). |

### 9.6 Frontend acceptance checks

1. Hospital Admin onboards doctor by unique ID without creating duplicate user.
2. Doctor UI shows hospital badge on hospital-originated patients.
3. Doctor My Clinics lists all ACTIVE affiliations.
4. Hospital Admin onboards provider by unique ID.
5. Provider queue shows hospital source.
6. Unlink removes org visibility for that side without deleting account.

---

## 10. End-to-End Acceptance Criteria

Feature is **fully functional** when all of the following pass:

1. **Independent + multi-hospital doctor** works with unique-ID onboard (API + UI).
2. **Independent + multi-hospital service provider** works with unique-ID onboard (API + UI).
3. Doctor sees patients/appointments with correct **source hospital / own practice** labels.
4. Provider sees orders with correct **source hospital** labels.
5. Soft unlink works for both roles; accounts and other affiliations remain.
6. AuthZ prevents non-org users from onboarding into a hospital.
7. Existing private-practice data is not leaked across hospitals.
8. Regression: pharmacy module remains separate from inventory; bed opt-in still maps to bed module.

---

## 11. Implementation Phases (suggested)

### Phase 1 — Doctor parity complete (UI + attribution)

- Manage Doctors: lookup + onboard + unlink
- Enrich doctor-facing patient/appointment responses with source org
- Source badge + My Clinics on doctor UI
- Tests for doctor flows

### Phase 2 — Service Provider parity

- Provider onboard/lookup/unlink APIs for Hospital Admin
- Org-scoped provider management UI
- Service order source org persistence + provider UI badges
- Tests for provider flows

### Phase 3 — Hardening

- Explicit `source_org_id` columns + migration/backfill
- Inventory opt-in decision for providers (permission vs new `ServiceProviderType`)
- Audit log of onboard/unlink events
- E2E tests (Playwright/Cypress if available) for both personas

---

## 12. Open Decisions (resolve during design)

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| OD-1 | How to store source org | Infer from `owner` vs explicit `source_org_id` | Explicit FK (Phase 3), interim enrich from owner |
| OD-2 | Can Hospital Admin create brand-new providers? | Super Admin only vs org allowed | Keep create as Super Admin; org **links** existing |
| OD-3 | Inventory for SP | New `ServiceProviderType.INVENTORY` vs module permission only | Start with permission grant; type if product wants catalog opt-in |
| OD-4 | Doctor active org switcher | Always own practice unless header set vs mandatory clinic switcher | Provide My Clinics + optional active org header |
| OD-5 | Patient list attribution grain | Per patient latest source vs per appointment row | Prefer per appointment/visit row; patient list may show primary/latest |

---

## 13. Traceability Matrix

| User story | Backend | Frontend | Notes |
|------------|---------|----------|-------|
| US-D1 | Existing `Doctor.uniqueId` | Show ID on profile/manage | Already seeded |
| US-D2 | Existing onboard API | FE-D1/D2 | UI gap |
| US-D3 | Existing reactivate logic | FE-D2 status | Error copy |
| US-D4 | `DoctorOrgMapping` | My Clinics | Exists |
| US-D5 | `/doctors/my-clinics` | FE-D8 | Wire UI |
| US-D6/D7 | FR-11–15 DTOs | FE-D6/D7 | Main gap |
| US-D8/D9 | Unlink API | FE-D4 | Add |
| US-S1 | Existing SP unique ID/types | Show badges | Exists |
| US-S2–S6 | New onboard/unlink + authz | FE-S1–S7 | Main gap |
| US-S7 | Existing type→module map | Provider menus | Exists |
| US-S8 | Permissions / type decision | Module visibility | OD-3 |
| US-A1–A3 | Attribution model | Source badge | Cross-cutting |
| US-X1–X3 | AuthZ updates | Hide unauthorized actions | Controllers |

---

## 14. Out-of-Scope Follow-ups (backlog)

- Cross-hospital revenue share / referral fees
- Patient consent for cross-org data sharing beyond current mappings
- Automatic sync of all hospital patients to affiliated doctors (explicitly out of FR-17)
- Logto organization invites UX beyond current provisioning

---

## 15. References (code proof)

- `backend/src/main/java/com/clinic/hms/service/DoctorService.java` — `onboardDoctor`, `getMyClinicsForCurrentDoctor`
- `backend/src/main/java/com/clinic/hms/controller/DoctorController.java` — `POST /onboard`, `GET /my-clinics`
- `backend/src/main/java/com/clinic/hms/entity/DoctorOrgMapping.java`
- `backend/src/main/java/com/clinic/hms/entity/ServiceProviderOrgMapping.java`
- `backend/src/main/java/com/clinic/hms/controller/ServiceProviderController.java` — Super Admin gated; no onboard
- `backend/src/main/java/com/clinic/hms/dto/response/PatientResponse.java` — no source org fields today
- `backend/src/main/java/com/clinic/hms/entity/Appointment.java` / `Visit.java` — `owner` only
- `backend/src/main/java/com/clinic/hms/entity/ServiceOrder.java` — `requester` only
- `backend/src/main/java/com/clinic/hms/service/AuthService.java` — SP type → module bootstrap
- `frontend/src/features/admin/pages/ManageDoctors.jsx` — create/edit only
- `frontend/src/features/admin/pages/ManageServiceProviders.jsx` — Super Admin CRUD

---

## 16. Definition of Done

- [ ] All Must user stories implemented
- [ ] Backend APIs + authz + tests for doctor and provider onboard/unlink/attribution
- [ ] Frontend hospital admin onboard UIs for doctor and provider
- [ ] Source badges visible on doctor and provider work queues
- [ ] My Clinics wired for both roles
- [ ] Migration/backfill strategy documented and applied if Phase 3 FK used
- [ ] Acceptance criteria in §10 verified
- [ ] No regression on independent practice or single-hospital users
