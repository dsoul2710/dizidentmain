# Code Structure

## Build System

| Component | Tool | Config |
|-----------|------|--------|
| Backend | Gradle | `backend/build.gradle` |
| Frontend | npm + Vite | `frontend/package.json`, `vite.config.js` |
| Docker | Compose | `docker-compose.yml` |

## Backend Layout (current)

```
backend/src/main/java/com/clinic/hms/
├── ClinicHmsApplication.java
├── config/          # DataSeeder, WebSocket, Jackson
├── constants/       # AppConstants, QueryConstants
├── controller/      # 22 REST controllers
├── dto/request/     # Request DTOs
├── dto/response/    # Response DTOs
├── entity/          # JPA entities
├── exception/       # GlobalExceptionHandler
├── repository/      # Spring Data repos
├── security/        # JWT, SecurityConfig, filters
└── service/         # Business services
```

**Industry-standard alignment**: Mostly layered; gaps include controllers injecting repositories directly (e.g. `PatientController` → `PatientRepository`), mixed validation approaches, and `SecurityConfig` marked TEMP with permit-all.

## Frontend Layout (current)

```
frontend/src/
├── App.jsx, main.jsx, config.js
├── api/api.js           # Single Axios instance
├── pages/               # Flat + subfolders (auth, patient, doctor, org, super-admin, provider, chat)
├── components/          # layout, billing, chat, clinical, odontogram, print, common, rx
├── hooks/
├── utils/
└── assets/css/
```

**Industry-standard gaps**: Mixed page organization (some at root `pages/`, some in subfolders); CSS co-located in pages (`ScheduleView.css`, `chat.css`); no dedicated `features/` or `services/` layer; localStorage used for clinical state in some pages.

## Design Patterns (observed)

| Pattern | Location | Notes |
|---------|----------|-------|
| Layered architecture | controller → service → repository | Partially enforced |
| DTO mapping | dto/request, dto/response | Consistent |
| Global exception handling | GlobalExceptionHandler | Good — traceId, validation errors |
| JWT filter chain | JwtAuthenticationFilter | Present but bypassed by permitAll |
| Module permissions | ModulePermission entity | Role-based feature flags |
| Axios interceptors | api.js | Org header, loading events |

## Anti-patterns (initial findings)

| Issue | Location | Severity |
|-------|----------|----------|
| All `/api/**` permitAll | SecurityConfig.java | **Critical** |
| NoOpPasswordEncoder (plain text) | SecurityConfig.java | **Critical** |
| CORS `*` with credentials | SecurityConfig.java | **High** |
| CSRF disabled | SecurityConfig.java | Medium (acceptable for stateless JWT if auth enforced) |
| Controller → Repository direct | PatientController, others | Medium |
| Minimal test coverage | 2 test classes only | High |
| localStorage for visit/appointment state | PatientEntry.jsx, etc. | Medium |
| JWT filter runs but auth not required | Security chain | Critical |

## Critical Dependencies

- Spring Boot 4.0.0, Java 21, PostgreSQL driver
- jjwt 0.11.5, springdoc-openapi 2.8.x
- React 19, Vite 7, Axios 1.x, react-router-dom 7
