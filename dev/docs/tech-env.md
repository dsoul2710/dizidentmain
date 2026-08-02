# Technical Environment: DiziDental Dev (Brownfield)

> **Brownfield project.** Match existing patterns in `backend/` and `frontend/`.
> Do not introduce new frameworks without justification.

---

## Workspace Scope

| In scope | Out of scope |
|----------|--------------|
| `backend/`, `frontend/`, `docker-compose.yml`, `.env.example` | `../clientabc/`, `../clientxyz/` |
| `aidlc-docs/` (AI-DLC generated docs) | Production VPS configs unless requested |

**Open this folder (`dev/`) as the Cursor workspace root** when using AI-DLC.

---

## Existing Stack (must be preserved)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Backend language | Java | 21 | Gradle toolchain |
| Backend framework | Spring Boot | 4.0.0 | Web MVC, JPA, Security, WebSocket, Validation |
| API docs | springdoc-openapi | 2.8.x | Swagger UI at `/swagger-ui.html` |
| Auth | JWT (jjwt) + Spring Security | 0.11.5 | HTTP-only cookie from login |
| Database | PostgreSQL | 16 (Docker) | JPA/Hibernate |
| Frontend | React | 19.x | Vite 7, React Router 7 |
| HTTP client | Axios | 1.x | Shared instance in `frontend/src/api/api.js` |
| Real-time | STOMP + SockJS | | Chat WebSocket |
| Build (backend) | Gradle | | `./gradlew bootRun` |
| Build (frontend) | npm + Vite | | `npm run dev` (port 5173 native, 3000 Docker) |
| Local dev | Docker Compose | | `../scripts/dev-local.ps1 docker` |

Package base: `com.clinic.hms`

---

## What to Add

<!-- Per iteration -->
- _[New endpoints, entities, pages, etc. for this iteration]_

---

## What to Keep Unchanged

- Layered backend layout: `controller/` → `service/` → `repository/` → `entity/`
- DTOs in `dto/request/` and `dto/response/`
- React pages under `frontend/src/pages/`, shared components under `components/`
- Axios client with credentials + `X-Active-Org-Id` header pattern
- Lombok on entities/DTOs where already used
- JUnit 5 for backend tests

---

## Prohibited

| Prohibited | Reason | Use instead |
|-----------|--------|-------------|
| Modifying `../clientabc/`, `../clientxyz/` | Production client copies | Work only in `dev/`, sync later |
| New ORM (MyBatis, etc.) | Project uses Spring Data JPA | JPA repositories |
| fetch() replacing Axios globally | Frontend standard is Axios | `frontend/src/api/api.js` |
| Hardcoded secrets | Security | `.env` / `application.properties` |
| Code inside `aidlc-docs/` | Docs only | `backend/`, `frontend/` |

---

## Security Basics

- JWT in HTTP-only cookie; validate on every protected request
- Role/module permissions from login response; respect on frontend routes and backend endpoints
- Org scoping via `X-Active-Org-Id` header (frontend) and service-layer checks (backend)
- Never commit `.env` — use `.env.example` as template

---

## Example Code Patterns

**Axios API client (`frontend/src/api/api.js`):**

```javascript
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});
// Interceptors attach X-Active-Org-Id and loading events
export default api;
```

**Spring REST controller pattern:**

```java
@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {
    private final PatientService patientService;
    // GET/POST endpoints delegating to service
}
```

**Service → repository:**

```java
@Service
@RequiredArgsConstructor
public class PatientService {
    private final PatientRepository patientRepository;
    // Business logic, @Transactional where needed
}
```

---

## AI-DLC Output Locations

| Artifact | Path |
|----------|------|
| Workflow state | `aidlc-docs/aidlc-state.md` |
| Requirements, plans, reverse-engineering | `aidlc-docs/inception/` |
| Construction artifacts | `aidlc-docs/construction/` |
| Application code | `backend/`, `frontend/` (never inside `aidlc-docs/`) |

---

## Knowledge Graph

Before blind code exploration, search `.understand-anything/knowledge-graph.json`
(800+ nodes: controllers, services, React pages, layers, guided tour).
