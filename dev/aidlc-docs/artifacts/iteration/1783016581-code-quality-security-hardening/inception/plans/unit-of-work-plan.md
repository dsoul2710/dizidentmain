# Unit of Work Plan

## Decision Source

Unit decomposition follows the approved `execution-plan.md` (4 sequential units) and `application-design.md`. Requirements FR IDs substitute for user stories (User Stories stage skipped).

---

## Decomposition Questions (resolved)

### Story / Requirement Grouping

How should work be grouped into units?

A) By construction phase (security → audit → layering → frontend) — matches execution plan  
B) By backend domain only (auth, clinical, billing, etc.)  
C) Single monolithic unit  
D) Other

[Answer]: A

### Unit sequencing

Should frontend restructure wait for backend security hardening?

A) Yes — security unit must complete and pass smoke login before frontend work  
B) No — parallel frontend structure moves with stubbed backend  
C) Other

[Answer]: A

### Audit vs layering boundary

Should controller audit fixes and service-layer extraction be separate units?

A) Yes — audit/fix critical-high first, then dedicated layering unit  
B) No — combine audit and layering in one unit  
C) Other

[Answer]: A

### Team alignment

Single developer / AI agent sequential execution?

A) Yes — one unit at a time, fully complete before next  
B) Parallel backend + frontend after security  
C) Other

[Answer]: A

### Technical: partial deploy

Units are logical (monolith) — no independent deploy per unit?

A) Yes — all units commit to same backend/frontend repos  
B) No — feature flags per unit  
C) Other

[Answer]: A

### Business domain alignment

Map units to requirements FR groups?

A) Yes — trace FR-1 to unit-security, FR-4 to audit, FR-2 to layering, FR-3 to frontend  
B) Domain-only grouping  
C) Other

[Answer]: A

---

## Execution Checklist

### Planning
- [x] Analyze requirements, application design, execution plan
- [x] Resolve decomposition questions (derived from prior approvals)
- [x] Define 4 units with boundaries and deliverables
- [x] User approval via "Approve and Continue" on Application Design + implicit plan approval

### Mandatory Artifacts
- [x] Generate `unit-of-work.md`
- [x] Generate `unit-of-work-dependency.md`
- [x] Generate `unit-of-work-story-map.md` (FR ID mapping)
- [x] Validate unit boundaries and dependencies
- [x] Ensure all requirements assigned to units

---

## Approved Unit List

| Unit ID | Name | Sequence |
|---------|------|----------|
| U1 | unit-security-hardening | 1 |
| U2 | unit-backend-controller-audit | 2 |
| U3 | unit-backend-layering | 3 |
| U4 | unit-frontend-restructure | 4 |

Post-units: Build and Test (construction phase, not a unit)
