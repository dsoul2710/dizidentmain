# Frontend Architecture & Folder Structure Guidelines

This document defines the frontend codebase architecture and folder layout conventions. All developers and AI coding agents MUST strictly follow these structure and modularization guidelines when designing, refactoring, or developing new features.

---

## 1. Directory Layout

The codebase is organized into modular, feature-focused and role-focused directories under `src/`:

```text
src/
  api/          - API services and clients (e.g. api.js)
  assets/       - Global styles, CSS overrides, and theme configurations
  components/   - Shared, reusable UI widgets and common layout elements
    chat/       - Chat UI parts (ChatBell, ChatPage, NotificationPanel)
    layout/     - Overall application page wrappers (WowDashLayout, HeaderProfile)
  hooks/        - Shared custom hooks (e.g. useNotifications.js)
  pages/        - Page views
    auth/       - Authentication components (e.g. LoginPage.jsx)
    dashboards/ - Dashboard entry points (Route Switchboards only)
    org/        - Organization (Clinic Admin) views
    doctor/     - Doctor specific views (e.g. DoctorOverview.jsx, DentalCarePage.jsx)
    patient/    - Patient portal views (e.g. PatientSchedulePage.jsx)
    provider/   - Partner service provider views (e.g. LabOrdersView.jsx, BedsAllocationView.jsx)
    super-admin/- Platform Super Administrator views
  utils/        - Shared utility helpers (e.g. initials.js, dateFormat.js)
```

---

## 2. Key Modularization Rules

### A. Keep Dashboard Entry Files Slim
The dashboard entry files located in `src/pages/dashboards/` (e.g., `Dashboard.jsx`, `DoctorDashboard.jsx`, `PatientDashboard.jsx`, `ServiceProviderDashboard.jsx`, `SuperAdminDashboard.jsx`) function strictly as **layouts and routing switchboards**.
- **Rule**: Do NOT write inline page views or subcomponents inside dashboard entry files.
- **Rule**: All sub-views and tab panels must be defined in the corresponding category folders (e.g., `src/pages/doctor/` or `src/pages/super-admin/`) and imported into the dashboard entry file.

### B. Clean Separation of Roles
- Pages and features belonging to a specific role must reside in their respective directories (e.g., `/org/`, `/doctor/`, `/patient/`, `/provider/`, `/super-admin/`).
- Avoid mixing components of different roles to keep folder dependencies clear.

---

## 3. Code Reuse & Utility Standards

Before writing utility functions or notification states, check if they exist in shared helpers:

### A. Initials Formatting
- **Standard**: Always import `getInitials` from `src/utils/initials.js`.
- Do NOT rewrite inline regexes or string slicing to format user avatar initials.

### B. Notification Panels & Counts
- **Standard**: Always import the `useNotifications` custom hook from `src/hooks/useNotifications.js`.
- It automatically fetches and formats chat counts and event notifications in parallel for the active user session. Do NOT write custom notification fetch states or `useEffect` loops inside individual dashboards.

---

## 4. Development Workflow for New Features

When requested to build a new view or feature tab:
1. **Create the View**: Write the sub-component inside the appropriate directory (e.g., `src/pages/doctor/NewDoctorFeature.jsx`).
2. **Add to Router**: Import the component in the parent dashboard file (e.g., `src/pages/dashboards/DoctorDashboard.jsx`) and link it to a route (e.g., `<Route path="new-feature" element={<NewDoctorFeature />} />`).
3. **Verify Build**: Run `npm run build` in the frontend directory to ensure all relative imports and references are resolved.
