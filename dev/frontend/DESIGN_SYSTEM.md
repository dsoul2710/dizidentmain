# Unified Design System Guidelines

This document outlines the unified design system for the **DiziDental Clinic Dashboard** application. All new features, dashboards, components, and modifications MUST strictly follow these guidelines to maintain a cohesive, professional, and premium visual identity.

---

## 1. Core Principles

1. **Strictly No Inline Styles**: Do NOT write `style={{ ... }}` in JSX files. All layout, spacing, alignment, typography, and styling must use utility classes (Bootstrap 5) or dedicated class definitions in `clinic-overrides.css` and `wowdash-users.css`.
2. **Reuse Layouts**: Every dashboard must render inside the `<WowDashLayout>` component, defining standardized navigation configurations (`navItems`) and toolbar actions.
3. **Harmonious Color Palette**: Use CSS variables for colors. Never hardcode arbitrary hex colors (e.g. `#1d4ed8`) in JS or CSS.
4. **RemixIcon for Iconography**: Standardize on **RemixIcon** (`ri-*` classes) for all tabs, status badges, actions, and sidebars.

---

## 2. Color System & Variables

The design system standardizes on a premium Royal Blue brand color scheme. Use the following CSS/Bootstrap variables in styles:

### Colors & CSS Tokens
| Token | Variable / Class | Value | Description |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | `--primary` / `var(--bs-primary)` | `#2563eb` | The core brand Royal Blue. |
| **Text Primary** | `#0f172a` | Slate-900 | Heading and body text color. |
| **Text Secondary**| `#475569` or `#64748b` | Slate-500/600 | Muted subtitles, labels, and metadata. |
| **Background Base** | `var(--greyLight-1)` | `#f8fafc` | Main screen body background. |
| **Border Color** | `var(--bs-border-color)` | `#e2e8f0` | Standard divider and card outline color. |

### Color Tones (Alerts, Pills, Badges)
Always use CSS class pairs for background-color and text-color to display states:
- **Primary / Informational**: `bg-primary-100 text-primary-600` (Light Blue background, dark blue text)
- **Success / Completed**: `bg-success-100 text-success-600` (Light Green background, dark green text)
- **Warning / Pending**: `bg-warning-100 text-warning-600` (Light Orange background, dark orange text)
- **Danger / Cancelled**: `bg-danger-100 text-danger-600` (Light Red background, dark red text)
- **Muted / Inactive**: `bg-neutral-200 text-neutral-600` or `bg-light-secondary text-secondary`

---

## 3. Typography & Hierarchy

Ensure clear hierarchy inside pages:
- **Page Titles**: Use standard `<h2>` or `<h1>` inside `.page-header` (`font-size: 1.05rem`, bold, letter-spacing: `-0.01em`).
- **Section Titles**: Use `<h3>` (`font-size: 0.92rem`, bold).
- **Sub-headings**: Use `<h4>` (`font-size: 0.86rem`, semi-bold).
- **Muted Text / Dates**: Use className `muted-small` or `text-secondary-light` (`font-size: 0.82rem` - `0.85rem`).
- **Pill / Badge Text**: Font size should be `0.72rem` to `0.75rem`.

---

## 4. Spacing & Utility Guidelines (Bootstrap 5)

Rather than defining inline paddings or margins, use standard Bootstrap classes:
- **Margins**: `m-0`, `mb-2`, `mb-3`, `mb-4` (for section spacing), `mt-2`, `me-2` (margin-right for inline buttons/icons).
- **Paddings**: `p-3` (standard card padding), `p-4`, `py-2`, `px-3`.
- **Flexbox**: `d-flex align-items-center justify-content-between gap-2` (extremely common for headers, flex groups, controls).
- **Gap Spacing**: `gap-2` (8px), `gap-3` (12px), `gap-4` (16px).

---

## 5. Standard Component Guidelines

### A. Dashboard Main Layout
Every dashboard view must adhere to this structural component mapping:
```jsx
import WowDashLayout from "../../components/layout/WowDashLayout.jsx";

export default function FeatureDashboard({ user, onLogout }) {
  const navItems = [
    { type: "link", label: "Overview", to: "/path/overview", end: true, icon: "ri-home-5-line" },
    { type: "group", label: "Patient Care" },
    ...
  ];

  return (
    <WowDashLayout
      brandLabel="Clinic Control Hub"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search..."
      headerActions={ <HeaderProfileBadge user={user} /> }
    >
      <div className="container-fluid py-4">
        {/* Route views render here */}
      </div>
    </WowDashLayout>
  );
}
```

### B. Cards
Standard UI cards must look clean, have border lines, subtle shadows, and rounded corners:
```jsx
// Standard Card
<div className="card p-3 shadow-2 radius-8 h-100">
  <div className="card-header border-bottom py-2 bg-transparent">
    <h6 className="mb-0 fw-bold text-dark text-sm">Card Title</h6>
  </div>
  <div className="card-body p-0 mt-3">
    {/* Card Content */}
  </div>
</div>
```
*Note: Use `.border-0` and `.shadow-sm` if displaying simple metrics or statistics dashboards.*

### C. Tables
All tabular data must be responsive and wrapped inside a clean border and hoverable rows. Always wrap inside `table-responsive`:
```jsx
<div className="table-responsive scroll-sm">
  <table className="table bordered-table sm-table mb-0">
    <thead>
      <tr>
        <th>S.L</th>
        <th>Reference ID</th>
        <th>Name</th>
        <th>Status</th>
        <th className="text-right">Actions</th>
      </tr>
    </thead>
    <tbody>
      {items.map((item, idx) => (
        <tr key={item.id}>
          <td>{idx + 1}</td>
          <td>{item.uniqueId}</td>
          <td className="fw-semibold text-primary-light">{item.name}</td>
          <td>
            <span className="badge bg-success-100 text-success text-xs">
              {item.status}
            </span>
          </td>
          <td className="text-right">
            <div className="table-actions">
              <button type="button" className="btn btn-sm btn-outline-primary">Edit</button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### D. Forms & Inputs
Forms should use standard CSS grids for layout fields:
```jsx
<form className="form-grid">
  <div>
    <label className="form-label fw-semibold text-sm">Full Name</label>
    <input type="text" className="form-control" placeholder="e.g. John Doe" required />
  </div>
  <div>
    <label className="form-label fw-semibold text-sm">Gender</label>
    <select className="form-select">
      <option value="MALE">Male</option>
      <option value="FEMALE">Female</option>
    </select>
  </div>
  <div className="colspan">
    <label className="form-label fw-semibold text-sm">Notes / Observations</label>
    <textarea className="form-control" placeholder="Enter notes here..."></textarea>
  </div>
  <div className="actions colspan mt-3">
    <button type="button" className="btn btn-outline-secondary me-2">Cancel</button>
    <button type="submit" className="btn btn-primary">Save Changes</button>
  </div>
</form>
```
*Note: Form components (`<input>`, `<select>`, `<textarea>`) are pre-styled with standard heights (`44px`), borders (`1px solid var(--bs-border-color)`), and border-radius (`10px`).*

### E. Modals
Modals are triggered by rendering a `.modal.show` backdrop container. Standard modals should be structured as follows:
```jsx
<div className="modal show" onClick={onCloseModal}>
  {/* Stop click propagation on the card to prevent closing when clicking inside the form */}
  <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
    <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
      <div>
        <h3 className="mb-0 fw-bold">Add Clinical Procedure</h3>
        <p className="text-xs text-secondary-light mb-0">Record procedure detail for the patient.</p>
      </div>
      <button type="button" className="btn-close border-0 bg-transparent text-secondary" onClick={onCloseModal}>
        <i className="ri-close-line fs-4"></i>
      </button>
    </div>
    
    <div className="modal-body p-0">
      {/* Form or details content */}
    </div>
  </div>
</div>
```

### F. Buttons
Choose the correct button type for the desired user action hierarchy:
- **Primary / Call to Action**: `className="btn btn-primary"`
- **Secondary / Action Details**: `className="btn btn-sm btn-outline-primary"`
- **Neutral / Cancel**: `className="btn btn-outline-secondary"` or `className="btn btn-light border"`
- **Danger / Deletions**: `className="btn btn-sm btn-outline-danger"` or `className="btn sm text-danger border-danger-200 bg-danger-50"`

### G. Badges / Pills
Use standardized pills for tags and status indicators:
- **Brand Tag Pill**: `className="pill"`
- **Grey Soft Pill**: `className="pill pill-soft"`
- **Success Tag Pill**: `className="pill pill-accent"`
- **Raw Badges**: `className="badge px-2.5 py-1.5 radius-4 text-xs bg-success-100 text-success"`

---

## 6. Layout Grids & Alignment

For grid layouts, use standard flex or CSS grids:
- **Grid Layout (Card List)**: Use `className="cards"` for auto-fit cards list (minmax 220px).
- **Grid Layout (Two Columns)**: Use `className="grid-2"` for dual columns (minmax 260px).
- **Responsive Layout**: Use Bootstrap's `row` and `col-md-6`, `col-lg-4` elements. Avoid defining manual media-queries for widths or heights.
