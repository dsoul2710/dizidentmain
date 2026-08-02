# Vision: DiziDental Dev — Code Quality, Structure & Security Hardening

> **Brownfield project.** This iteration focuses on bringing `backend/` and `frontend/` up to
> industry-standard structure and code quality, and fixing bugs and security vulnerabilities
> discovered during review — not adding new product features.

---

## Current State

DiziDental dev is a full-stack clinic HMS:

- **Backend:** Spring Boot 4, Java 21, Gradle — REST API + WebSocket at `backend/`
- **Frontend:** React 19, Vite 7, Axios — SPA at `frontend/`
- **Database:** PostgreSQL (`clinic_hms` locally)
- **Auth:** JWT (HTTP-only cookie) + Spring Security, role-based modules (ADMIN, DOCTOR, etc.)
- **Deployment (local):** Docker Compose (PostgreSQL + backend + frontend)

Core modules already implemented: patients, visits, appointments, billing, prescriptions,
inventory, labs, chat, treatment plans, reports, organization/doctor management.

Production copies live in sibling folders (`../clientabc/`, `../clientxyz/`) and are synced
from `dev/` via scripts in `../scripts/`. Do not modify client folders during dev work.

A knowledge graph of this codebase exists at `.understand-anything/knowledge-graph.json`.

Known gaps motivating this iteration: inconsistent layering in places, ad-hoc patterns across
modules, potential security issues (auth, input validation, secrets handling), and bugs that
should be found and fixed before syncing to client production folders.

---

## What We Are Adding

This iteration is **not** a greenfield feature build. We are:

1. **Restructuring and standardizing** `backend/` and `frontend/` folder layout, naming, and
   code organization to align with industry best practices (Spring Boot layered architecture,
   React/Vite feature-oriented structure, shared utilities, consistent DTO/API patterns).
2. **Auditing** the codebase for **bugs** (logic errors, edge cases, error handling gaps,
   regression risks) and **vulnerabilities** (security misconfigurations, injection risks,
   auth/authz gaps, sensitive data exposure, unsafe defaults).
3. **Resolving** identified issues in this iteration with tests or verification where practical.

Deliverables are improved, safer, more maintainable code — not new user-facing modules.

---

## Features In Scope (this iteration)

### Backend (`backend/`)

- Align package and folder structure with standard Spring Boot layering (controller → service → repository → entity/dto)
- Consistent exception handling, validation, and API error responses
- Security review: JWT filter chain, endpoint authorization, org-scoping, input sanitization
- Remove or refactor dead code, duplicated logic, and anti-patterns
- Fix confirmed bugs and vulnerabilities with minimal, focused diffs
- Improve test coverage for touched areas (JUnit 5)

### Frontend (`frontend/`)

- Align folder structure with industry-standard React/Vite layout (pages, components, hooks, api, utils)
- Consistent API usage via `src/api/api.js`, error handling, and loading states
- Security review: XSS-safe rendering, auth/session handling, sensitive data in localStorage
- Remove or refactor dead code, duplicated components, and inconsistent patterns
- Fix confirmed bugs and UI/logic defects
- Lint cleanup where tied to fixed issues

### Cross-cutting

- Document findings in `aidlc-docs/` (audit list, fixes applied, deferred items)
- Use `.understand-anything/knowledge-graph.json` to map impact before refactors
- Run existing build/test/lint pipelines after changes

## Features Explicitly Out of Scope (this iteration)

- New product features or new HMS modules (e.g., new billing flows, new reports)
- Changes to `../clientabc/` and `../clientxyz/` production folders
- VPS deployment or infrastructure changes
- Database schema migrations unless required to fix a confirmed bug or vulnerability
- Full design-system rewrite or UI redesign
- Replacing the tech stack (e.g., switching from Axios, JPA, or Spring Security)

---

## What Must Not Change

- Multi-client sync workflow: develop in `dev/`, sync to clients separately
- Core JWT auth model and role/module permission concept (harden, do not replace)
- PostgreSQL as the only database
- **Existing API contracts** consumed by the frontend unless a fix requires a backward-compatible correction
- Frontend WowDash layout and `DESIGN_SYSTEM.md` visual language (structure/code only, not re-skin)
- Business behavior of working features unless fixing a confirmed bug

---

## Success Criteria

- Backend and frontend directory structures documented and applied consistently
- Audit report of bugs/vulnerabilities found (with severity)
- Critical and high-severity issues resolved in this iteration
- Medium/low issues either fixed or explicitly deferred with rationale in `aidlc-docs/`
- `./gradlew test` and `npm run lint` / `npm run build` pass after changes

---

## Open Questions

- Should medium-severity findings be fixed in this iteration or logged for a follow-up?
- Are breaking API changes acceptable if frontend is updated in the same PR (preferred: avoid)?
- Any modules to prioritize first (auth, billing, patient data) for security review?
