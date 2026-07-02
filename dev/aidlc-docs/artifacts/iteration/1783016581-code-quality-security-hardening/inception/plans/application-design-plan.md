# Application Design Plan

## Design Decision Source

Design decisions are derived from `requirements.md` and user answers in `requirement-verification-questions.md` (Q5, Q8, Q9). No additional clarifying questions required — requirements comprehensively cover auth model, layering depth, and frontend structure.

| Decision area | Source | Resolution |
|---------------|--------|------------|
| Auth model | Q5 | JWT + `@PreAuthorize` / method security |
| Backend structure | Q8 | Moderate — enforce layering; no package reorganization |
| Frontend structure | Q9 | Comprehensive feature-based folders + shared hooks/services |
| Org scoping | SEC-005, FR-1.5 | New `OrgContextService` + service-layer validation |
| Password migration | Q6 | BCrypt with migrate-on-login via `DelegatingPasswordEncoder` |

---

## Execution Checklist

### Analysis
- [x] Load requirements.md and reverse-engineering artifacts
- [x] Identify business capabilities and functional areas
- [x] Map controllers with repository bypass (layering violations)
- [x] Map frontend pages to target feature modules

### Mandatory Artifacts
- [x] Generate `components.md`
- [x] Generate `component-methods.md`
- [x] Generate `services.md`
- [x] Generate `component-dependency.md`
- [x] Generate consolidated `application-design.md`
- [x] Validate design completeness and consistency

### Design Questions (resolved from requirements — no user input needed)

**Component Identification**
- [Answer]: Keep flat Spring packages (`controller/`, `service/`, `repository/`); group logically by domain in design docs only (Q8 moderate)

**Service Layer Design**
- [Answer]: Extract missing services for controllers that inject repositories directly; controllers become thin HTTP adapters

**Org Scoping**
- [Answer]: Central `OrgContextService` resolves org from JWT + `X-Org-Id` header; services call `validateOrgAccess()` before data operations

**Frontend Organization**
- [Answer]: `features/{domain}/` for pages + domain components; `shared/` for layout, common UI, hooks, utils; `api/` split into domain service modules (Q9)

**WebSocket Security**
- [Answer]: Align STOMP `/ws` endpoints with same JWT cookie auth; reject unauthenticated connections

**Design Patterns**
- [Answer]: Layered monolith; no CQRS/event sourcing; existing DTO pattern preserved
