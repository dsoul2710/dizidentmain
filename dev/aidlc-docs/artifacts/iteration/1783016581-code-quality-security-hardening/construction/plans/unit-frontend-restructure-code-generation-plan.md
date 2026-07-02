# Code Generation Plan — unit-frontend-restructure

**Unit:** U4 | **Traceability:** FR-3.*, FR-5.*

## Steps

- [x] Step 1: Add `@/` path alias in vite.config.js
- [x] Step 2: Run migrate-u4.mjs — move 60 files to features/ + shared/
- [x] Step 3: Split api/api.js → api/client.js + shim
- [x] Step 4: Create authApi.js, patientApi.js
- [x] Step 5: Create shared hooks (useAuth, usePatient, useOrgContext, useApiError)
- [x] Step 6: Rewrite imports to @/ paths
- [x] Step 7: Fix CSS/asset import paths
- [x] Step 8: Update main.jsx → app/App.jsx
- [x] Step 9: `npm run build` — SUCCESS
- [x] Step 10: Write code summary
