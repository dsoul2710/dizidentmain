# Business Logic Model — unit-frontend-restructure

Frontend folder layout model for U4. No business logic changes — structural reorganization only.

---

## Target Layout

```text
src/
  app/           App.jsx (routing shell)
  api/           client.js, authApi.js, patientApi.js, api.js shim
  features/      Domain pages + feature-specific components
  shared/        Cross-cutting components, hooks, utils
  assets/        CSS (unchanged)
  config.js      Unchanged
```

---

## Feature Modules

| Module | Contents |
|--------|----------|
| auth | LoginPage |
| dashboard | UnifiedDashboard (route hub) |
| patient | Patient pages, entry/add |
| doctor | Doctor pages, DoctorEntry |
| org | OrgOverview |
| admin | Super-admin manage pages |
| provider | Provider portal pages |
| clinical | Diagnosis, treatment plan, consent, RxSection |
| billing | BillingView |
| inventory | Inventory, vendor, lab entry |
| schedule | ScheduleView |
| reports | ReportsView |
| chat | ChatPage |

---

## Shared Layer

- **components:** layout, common, chat, billing, clinical, print, odontogram
- **hooks:** useNotifications (moved), useAuth, usePatient, useOrgContext, useApiError (new)
- **utils:** dateFormat, initials, patientList

---

## Import Convention

All internal imports use Vite alias `@/` (e.g. `@/features/patient/pages/PatientEntry.jsx`).

Routes preserved — no URL changes.

---

## SEC-006 Note

localStorage for `hms_user` retained in App.jsx (deferred full session refactor per requirements Q10).
