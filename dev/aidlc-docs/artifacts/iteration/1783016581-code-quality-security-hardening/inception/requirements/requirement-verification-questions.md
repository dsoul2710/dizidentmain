# Requirements Clarification Questions

Please answer each question by filling in the letter after `[Answer]:`.  
Choose **X) Other** if none of the options fit and describe your preference on the same line or below.

---

## Question 1 — Security extension (AI-DLC)

Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs and prototypes only)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2 — Property-based testing extension (AI-DLC)

Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for business logic, data transformations, serialization)

B) Partial — enforce PBT only for pure functions and serialization round-trips

C) No — skip all PBT rules (suitable for simple CRUD or UI-only work)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 3 — Resiliency baseline extension (AI-DLC)

Should the resiliency baseline be applied to this project?

A) Yes — apply resiliency baseline as design-time guidance (recommended for business-critical workloads)

B) No — skip resiliency baseline (suitable for local dev hardening focused on security/structure only)

C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4 — Security fix scope

How should we handle the critical findings (SEC-001 permitAll, SEC-002 plain-text passwords, SEC-003 CORS)?

A) Fix all P0/P1 security issues in this iteration before any structural refactors

B) Fix P0 only in this iteration; defer P1/P2 to a follow-up iteration

C) Fix security and structure in parallel (same PRs, grouped by module)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 5 — Authentication model after hardening

After fixing SecurityConfig, what authorization model should apply?

A) JWT required on all `/api/**` except `/api/auth/login`, health, and swagger — role checks via `@PreAuthorize` or method security

B) JWT required globally; keep module permissions from login response enforced in services only (no method-level annotations yet)

C) JWT required + explicit per-controller role annotations for admin/doctor/patient endpoints

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 6 — Password encoding migration

How should existing plain-text passwords in the database be handled when switching to BCrypt?

A) Migrate on next login (re-hash when user authenticates successfully)

B) One-time data migration script to hash all existing passwords (requires known/default passwords or force reset)

C) Dev-only: reset all users via DataSeeder with BCrypt hashes; production clients synced later

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 7 — CORS policy

What CORS configuration should replace `allowedOriginPatterns("*")` with credentials?

A) Explicit allowlist from environment (localhost:5173, localhost:3000, client subdomains from config)

B) Same as A plus regex patterns for `*.doctor32.in` / deployment domains

C) Keep permissive CORS for local dev only; document production tightening for client deploy

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 8 — Backend structure changes

How aggressive should backend restructuring be?

A) Minimal — fix security + layering violations only where touched; no package moves

B) Moderate — enforce controller→service→repository; remove direct repository injection from controllers project-wide

C) Comprehensive — package reorganization (e.g., feature modules) if it improves clarity

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 9 — Frontend structure changes

How aggressive should frontend restructuring be?

A) Minimal — fix security-sensitive patterns (localStorage, error handling) only where needed

B) Moderate — standardize folder layout (group root-level pages into feature folders) without changing routes

C) Comprehensive — introduce feature-based folders + shared hooks/services layer across all pages

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 10 — Medium/low severity findings

Per vision.md open questions: should medium-severity issues be fixed in this iteration?

A) Fix critical + high in this iteration; medium/low documented and deferred with tickets in aidlc-docs

B) Fix critical, high, and medium in this iteration; defer only low

C) Fix everything found (critical through low) in this iteration

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 11 — Module priority for audit order

Which backend modules should be audited and fixed first?

A) Auth & security (`security/`, AuthController, UserController) then patient/billing

B) Patient → visit → appointment → billing flow (clinical core path)

C) Full parallel audit across all 22 controllers (longer, thorough)

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Question 12 — Testing expectations

What test coverage is required before this iteration is considered done?

A) Add/update tests only for code changed during fixes (minimum bar)

B) Add security integration tests (auth required, forbidden without JWT) + tests for each fixed bug

C) Target meaningful coverage for auth, patient, billing, and appointment modules (new test classes)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 13 — Breaking API changes

Are breaking API changes acceptable if frontend is updated in the same iteration?

A) No breaking changes — backward compatible only (preferred in vision.md)

B) Breaking changes allowed only for security fixes (e.g., auth now required — frontend must send cookies)

C) Breaking changes allowed if documented in aidlc-docs and frontend updated together

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 14 — Success validation

How should we verify success at the end of construction?

A) `./gradlew test`, `npm run lint`, `npm run build` pass + manual smoke test of login and one clinical flow

B) Above plus documented security checklist sign-off in aidlc-docs

C) Above plus Docker Compose full stack test (`dev-local.ps1 docker`)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 15 — Out of scope confirmation

Confirm what remains explicitly out of scope for this iteration:

A) Agree with vision.md — no new features, no clientabc/clientxyz changes, no VPS deploy

B) Allow minor client sync script updates if required for security hardening workflow

C) Allow database migration only if required for BCrypt or security fix

D) Other (please describe after [Answer]: tag below)

[Answer]: A
