# Local Development + Multi-Client Management

Since each client needs **significant code customization**, keep separate codebases but streamline the workflow.

You can run the `dev/` stack in two ways:

| Mode | When to use | URLs |
|------|-------------|------|
| **Native (hot reload)** | Day-to-day coding | Backend `:8081`, Frontend Vite `:5173`, Postgres `:5432` |
| **Docker (full stack)** | Smoke test containerized build, shareable env, demos | Backend `:8080`, Frontend nginx `:3000`, Postgres `:5432` |

Do **not** run native backend/frontend and Docker backend/frontend on the same ports at the same time.

---

## Environment Profiles (dev / preprod / prod)

Both backend and frontend support three environments. **Data seeding runs only in `dev`.**

| Environment | Backend profile | Frontend Vite mode | Seeder | Typical use |
|-------------|-----------------|-------------------|--------|-------------|
| **dev** | `dev` | `development` | ✅ allowed | Local development |
| **pre-prod** | `preprod` | `preprod` | ❌ blocked | Staging / UAT |
| **prod** | `prod` | `production` | ❌ blocked | Production |

### Backend profiles

Config files in `dev/backend/src/main/resources/`:

| File | Purpose |
|------|---------|
| `application.properties` | Shared defaults; `app.seed.enabled=false` by default |
| `application-dev.properties` | Local DB, port 8081, seeding on, legacy auth, Swagger on |
| `application-preprod.properties` | Validate schema, Logto on, legacy auth off, Swagger on |
| `application-prod.properties` | Validate schema, Logto on, Swagger off, minimal actuator |

Activate with:

```powershell
# Windows
$env:SPRING_PROFILES_ACTIVE="dev"      # or preprod, prod
.\gradlew.bat bootRun
```

```bash
# Linux/macOS
SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun
```

Docker sets `SPRING_PROFILES_ACTIVE` in each compose file.

**Seeder guard:** `DataSeeder`, `TreatmentMasterDataLoader`, and `ExamItemMasterDataLoader` only load when **both**:

- `@Profile("dev")` is active, and
- `app.seed.enabled=true`

They do **not** run in `preprod` or `prod`.

User seed data lives in `dev/backend/src/main/resources/data/users_seed.json`.  
To refresh that file from the current database:

```powershell
cd dizidentmain/dev/backend/scripts
.\sync-users-seed.ps1
```

### Frontend profiles (Vite modes)

Env files in `dev/frontend/`:

| File | Loaded by |
|------|-----------|
| `.env.development` | `npm run dev` |
| `.env.preprod` | `npm run build:preprod` |
| `.env.production` | `npm run build:prod` |
| `.env.example` | Template (copy and customize) |

npm scripts:

```bash
npm run dev              # development mode → http://localhost:5173
npm run build:preprod    # pre-prod build
npm run build:prod       # production build
```

`VITE_*` values are **baked in at build time**. Rebuild the frontend image after changing them.

### Docker compose per environment

All commands run from `dizidentmain/dev/`:

```bash
# Dev (seeder allowed when profile=dev and DB is fresh)
docker compose up -d --build

# Pre-prod (no seeding)
docker compose -f docker-compose.preprod.yml --env-file .env.preprod up -d --build

# Prod (no seeding)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Env templates:

| Template | Copy to |
|----------|---------|
| `.env.example` | `.env` (dev Docker / shared) |
| `.env.preprod.example` | `.env.preprod` |
| `.env.prod.example` | `.env.prod` |

### Profile defaults at a glance

| Setting | dev | preprod | prod |
|---------|-----|---------|------|
| `app.seed.enabled` | `true` | `false` | `false` |
| `spring.jpa.hibernate.ddl-auto` | `update` | `validate` | `validate` |
| `app.auth.legacy-enabled` | `true` | `false` | `false` |
| `app.logto.enabled` | `false` (local) | `true` | `true` |
| Swagger UI | on | on | off |
| Actuator exposure | broader | `health,info,metrics` | `health,info` |

Override any value via environment variables in Docker or your shell.

---

## Project Structure

```
dizidentmain/
├── dev/                         # Main local development
│   ├── backend/
│   │   └── src/main/resources/
│   │       ├── application.properties
│   │       ├── application-dev.properties
│   │       ├── application-preprod.properties
│   │       ├── application-prod.properties
│   │       └── data/users_seed.json
│   ├── frontend/
│   │   ├── .env.development
│   │   ├── .env.preprod
│   │   └── .env.production
│   ├── docker-compose.yml           # dev stack
│   ├── docker-compose.preprod.yml
│   ├── docker-compose.prod.yml
│   └── .env                         # Local secrets / overrides
│
├── clientabc/                   # Production code for ABC
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.yml
│   └── docker-compose.prod.yml
│
├── clientxyz/                   # Production code for XYZ
│   └── ...
│
└── scripts/
    ├── sync-to-client.sh
    ├── pull-from-client.sh
    ├── dev-local.sh
    └── deploy-vps.sh
```

---

## Everyday Development — Native (LOCAL)

Best for feature work: Gradle / Vite hot reload.

### Prerequisites
- JDK 21
- Node.js 20+
- Postgres running (local install **or** Docker Postgres only — see hybrid below)

### Backend
```powershell
cd dizidentmain/dev/backend

# Windows PowerShell — dev profile required for seeding
$env:SPRING_PROFILES_ACTIVE="dev"
$env:APP_LOGTO_ENABLED="false"   # optional: skip Logto OIDC lookup locally
.\gradlew.bat bootRun
```

```bash
# Linux/macOS
cd dizidentmain/dev/backend
SPRING_PROFILES_ACTIVE=dev APP_LOGTO_ENABLED=false ./gradlew bootRun
```

Native dev backend runs on **http://localhost:8081** (`application-dev.properties`).

### Frontend
```bash
cd dizidentmain/dev/frontend
npm install          # first time
npm run dev          # http://localhost:5173
```

Uses `.env.development` (API base `http://localhost:8081`).

### Typical frontend env (native dev)

`dev/frontend/.env.development`:

```env
VITE_APP_ENV=development
VITE_API_BASE=http://localhost:8081
VITE_LOGTO_ENABLED=false
VITE_LEGACY_AUTH_ENABLED=true
```

Backend reads `application-dev.properties` plus env overrides (`SPRING_DATASOURCE_*`, `APP_LOGTO_ENABLED`, etc.).

### Postgres passwords (common pitfall)

| Postgres source | Typical password |
|-----------------|------------------|
| Local PostgreSQL install | `Admin123` (in `application-dev.properties`) |
| Docker Postgres (first init) | value of `DB_PASSWORD` in `dev/.env` (default `root` if unset) |

Backend does not auto-detect which Postgres is running — it uses the password from the active profile / env.  
An existing Docker volume keeps its original password even if you change `.env` later.

---

## Everyday Development — Docker

All commands from:

```bash
cd dizidentmain/dev
```

### Start full dev stack (build + up)
```bash
docker compose up -d --build
```

Sets `SPRING_PROFILES_ACTIVE=dev` on the backend container.

Services:

| Container | Port | Notes |
|-----------|------|--------|
| `dev-postgres` | `5432` | DB `clinic_hms`, user `postgres`, password from `DB_PASSWORD` |
| `dev-backend` | `8080` | Spring Boot (`dev` profile) |
| `dev-frontend` | `3000` | nginx static build → API `http://localhost:8081` or `:8080` per build args |

**Mixed setup (common):** Docker frontend on `:3000` + native `bootRun` on `:8081`.  
Ensure the frontend build points at the backend port you actually use (`VITE_API_BASE` in `docker-compose.yml`).

### Common daily commands
```bash
# Status
docker compose ps
docker ps --filter "name=dev-"

# Logs (follow)
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Restart one service
docker compose restart backend
docker compose restart frontend

# Rebuild after code changes
docker compose up -d --build backend
docker compose up -d --build frontend

# Stop one service
docker compose stop backend
docker compose rm -f backend

# Stop app containers (keep data volume)
docker compose stop
docker compose down

# Stop and wipe DB volume (destructive)
docker compose down -v
```

### Build / deploy a single service
```bash
docker compose build backend
docker compose up -d --build --no-deps backend

docker compose build frontend
docker compose up -d --build --no-deps frontend
```

### Hybrid: Postgres in Docker, app native
```bash
docker compose up -d postgres

# Terminal 1 — backend
cd backend
$env:SPRING_PROFILES_ACTIVE="dev"; .\gradlew.bat bootRun

# Terminal 2 — frontend
cd ../frontend
npm run dev
```

### Health checks
```bash
curl http://localhost:8081/actuator/health   # native bootRun
curl http://localhost:8080/actuator/health   # Docker backend
curl http://localhost:3000/health            # Docker frontend
curl http://localhost:5173                   # native Vite frontend
```

### Auth note (current dev defaults)

| Mode | Logto | Legacy login |
|------|-------|--------------|
| Native `dev` profile | usually off (`APP_LOGTO_ENABLED=false`) | on |
| Docker dev compose | off | on |

Default smoke-test admin (seeded in dev): mobile `9999999999` / password `admin123`.

Other dev passwords by role: org `org123`, doctor `doctor123`, patient `patient123`, service provider `provider123`.

---

## Pre-prod and Prod (dev folder stacks)

Use these for staging or production-like runs from the shared `dev/` codebase.

### Pre-prod
```bash
cd dizidentmain/dev
cp .env.preprod.example .env.preprod   # edit with real values
docker compose -f docker-compose.preprod.yml --env-file .env.preprod up -d --build
```

### Prod
```bash
cd dizidentmain/dev
cp .env.prod.example .env.prod         # edit with real values
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Required in `.env.prod`: `DB_PASSWORD`, `JWT_SECRET`, `APP_CORS_ALLOWED_ORIGINS`, `VITE_API_BASE`.

---

## Feature → Client Sync Workflow

### New feature (develop in `dev/`)
```bash
# Code and test in native or Docker mode
cd dizidentmain/dev/

# Sync specific files to a client
./scripts/sync-to-client.sh abc backend/src/service/BillingService.java
./scripts/sync-to-client.sh abc frontend/src/pages/BillingView.jsx

# Or sync a module folder
./scripts/sync-to-client.sh abc backend/src/service/
```

### Client-specific changes
```bash
cd clientabc/backend/src/
# ... ABC-only edits ...

# Optional: pull back into dev to test
./scripts/pull-from-client.sh abc backend/src/service/InventoryService.java
cd dev/backend && $env:SPRING_PROFILES_ACTIVE="dev"; .\gradlew.bat bootRun
```

---

## Helper Scripts

### `scripts/dev-local.ps1` (Windows)
```powershell
cd dizidentmain
.\scripts\dev-local.ps1 docker    # full Docker stack
.\scripts\dev-local.ps1 native    # prints native start commands
```

### `scripts/sync-to-client.sh`
```bash
# Usage: ./sync-to-client.sh <client> <path>
./sync-to-client.sh abc backend/src/service/BillingService.java
```

### `backend/scripts/sync-users-seed.ps1`
Exports all users from the local DB into `users_seed.json` (run after adding test users you want to keep in the seed file).

---

## Git Branch Strategy

```bash
main                    # Production-ready code
dev                     # Development branch
client/abc              # Client branches
client/xyz
feature/billing-v2
```

---

## Production-Ready Checklist (client folders)

Use a **client folder** (`clientabc`, `clientxyz`, …), not `dev/`, for real production unless intentionally using `docker-compose.prod.yml` from `dev/`.

- [ ] `SPRING_PROFILES_ACTIVE=prod` (or client equivalent)
- [ ] `app.seed.enabled=false` — never seed production
- [ ] Strong unique `JWT_SECRET` and `DB_PASSWORD`
- [ ] `spring.jpa.hibernate.ddl-auto=validate` + Flyway migrations
- [ ] Frontend built with production API URL (`npm run build:prod` or Docker build args)
- [ ] CORS limited to real frontend domains
- [ ] `APP_SECURITY_COOKIE_SECURE=true` behind TLS
- [ ] Logto production app IDs, redirect URIs, API resource aligned
- [ ] Postgres backups; uploads volume persisted
- [ ] No secrets committed

---

## Quick Start Summary

```powershell
# --- Option A: Native (recommended for coding) ---
cd dizidentmain/dev
docker compose up -d postgres              # DB only (optional)

cd backend
$env:SPRING_PROFILES_ACTIVE="dev"
$env:APP_LOGTO_ENABLED="false"
.\gradlew.bat bootRun                      # http://localhost:8081

cd ../frontend
npm run dev                                # http://localhost:5173

# --- Option B: Full Docker (dev profile) ---
cd dizidentmain/dev
docker compose up -d --build
# Frontend http://localhost:3000  |  API http://localhost:8080
```

**Ready to develop.**
