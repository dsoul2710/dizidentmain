# Code Summary — unit-frontend-restructure

## Goal

Comprehensive feature-based frontend layout per application-design.md. Routes and API contracts unchanged.

---

## Structure created

```text
src/
  app/App.jsx
  api/client.js, authApi.js, patientApi.js, api.js (shim)
  features/{auth,admin,billing,chat,clinical,dashboard,doctor,inventory,org,patient,provider,reports,schedule}/
  shared/{components,hooks,utils}/
```

60 files moved via `scripts/migrate-u4.mjs`. All imports converted to `@/` alias.

---

## New shared hooks

| Hook | Purpose |
|------|---------|
| useAuth | localStorage session read/write |
| useOrgContext | `hms_active_org_id` for X-Active-Org-Id |
| usePatient | Selected patient context |
| useApiError | Normalized error messages |

---

## API modules

- `api/client.js` — Axios instance (from former api.js)
- `api/authApi.js` — login/logout helpers
- `api/patientApi.js` — patient CRUD helpers
- Existing pages still use `api/client` directly where not yet migrated to domain modules

---

## Verification

| Check | Result |
|-------|--------|
| `npm run build` | **SUCCESS** |
| Routes preserved | Yes |
| ESLint | Pre-existing issues (~119); not introduced by folder moves |

## Manual smoke test (recommended)

1. Start backend + frontend
2. Login → dashboard loads
3. Navigate patient list, schedule, one report view

## Deferred

- SEC-006 full localStorage removal
- ESLint cleanup of vendor `public/js/` and react-hooks warnings
- Full migration of all pages to domain api modules (authApi/patientApi stubs ready)
