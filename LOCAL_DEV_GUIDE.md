# Local Development + Multi-Client Management

Since each client needs **significant code customization**, keep separate codebases but streamline the workflow.

You can run the `dev/` stack in two ways:

| Mode | When to use | URLs |
|------|-------------|------|
| **Native (hot reload)** | Day-to-day coding | Backend `:8080`, Frontend Vite `:5173`, Postgres `:5432` |
| **Docker (full stack)** | Smoke test containerized build, shareable env, demos | Backend `:8080`, Frontend nginx `:3000`, Postgres `:5432` |

Do **not** run native backend/frontend and Docker backend/frontend on the same ports at the same time.

---

## Project Structure

```
dizidentmain/
├── dev/                         # Main local development
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.yml       # Dev Postgres + backend + frontend
│   └── .env                     # Local secrets / overrides
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
```bash
cd dizidentmain/dev/backend

# Windows PowerShell
$env:SPRING_PROFILES_ACTIVE="dev"
.\gradlew.bat bootRun

# Linux/macOS
SPRING_PROFILES_ACTIVE=dev ./gradlew bootRun
```

### Frontend
```bash
cd dizidentmain/dev/frontend
npm install          # first time
npm run dev          # http://localhost:5173
```

### Typical frontend env (native)
Configure `dev/frontend/.env` for local ports, for example:

```env
VITE_API_BASE=http://localhost:8080
VITE_LOGTO_ENABLED=true
# or false for legacy-only login while developing auth
```

Backend reads `application.properties` / `application-dev.properties` and env overrides (`SPRING_DATASOURCE_*`, `APP_LOGTO_ENABLED`, etc.).

---

## Everyday Development — Docker

All commands from:

```bash
cd dizidentmain/dev
```

### Start full stack (build + up)
```bash
docker compose up -d --build
```

Services:

| Container | Port | Notes |
|-----------|------|--------|
| `dev-postgres` | `5432` | DB `clinic_hms`, user `postgres`, password from `DB_PASSWORD` (default `root`) |
| `dev-backend` | `8080` | Spring Boot |
| `dev-frontend` | `3000` | nginx static build |

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

# Stop app containers (keep data volume)
docker compose stop
# or stop only app tier
docker compose stop backend frontend

# Stop and remove containers (volume kept)
docker compose down

# Stop and wipe DB volume (destructive)
docker compose down -v
```

### Hybrid: Postgres in Docker, app native
```bash
# Only database
docker compose up -d postgres

# Then native backend + frontend as in the section above
```

### Health checks
```bash
curl http://localhost:8080/actuator/health
curl http://localhost:3000/health
```

### Auth note (current Docker defaults)
Dev `docker-compose.yml` currently runs with:

- `APP_LOGTO_ENABLED=false`
- `APP_AUTH_LEGACY_ENABLED=true`
- Frontend build arg `VITE_LOGTO_ENABLED=false`
- `VITE_API_BASE=http://localhost:8080`

Legacy login works in Docker. To turn Logto back on later, set those flags to `true`, align `LOGTO_*` / `VITE_LOGTO_*` URLs to port **8080**, rebuild frontend, and recreate backend.

Default smoke-test admin (if seeded in your DB): mobile `9999999999` / password `admin123` — change in real environments.

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
cd dev/backend && ./gradlew bootRun
```

---

## Helper Scripts

### `scripts/sync-to-client.sh`
```bash
#!/bin/bash
# Usage: ./sync-to-client.sh <client> <path>
# Example: ./sync-to-client.sh abc backend/src/service/

CLIENT=$1
SOURCE_PATH=$2

if [ -z "$CLIENT" ] || [ -z "$SOURCE_PATH" ]; then
    echo "Usage: ./sync-to-client.sh <client> <path>"
    exit 1
fi

rsync -av "dev/$SOURCE_PATH" "client$CLIENT/$SOURCE_PATH"
echo "Synced dev/$SOURCE_PATH → client$CLIENT/$SOURCE_PATH"
```

### `scripts/dev-local.sh`
```bash
#!/bin/bash
# Quick start full Docker stack for dev/
docker compose -f dev/docker-compose.yml up -d --build
```

---

## Git Branch Strategy

```bash
# Main branches
main                    # Production-ready code
dev                     # Development branch

# Client branches
client/abc
client/xyz

# Feature branches
feature/billing-v2
fix/abc/payment-bug
```

```bash
git checkout dev
git checkout -b feature/billing-v2
# ... develop in dev/ ...
git commit -m "feat: new billing module"

git checkout client/abc
git merge feature/billing-v2
# Resolve client-specific conflicts, test under clientabc/
```

---

## Production-Ready Instructions

Use a **client folder** (`clientabc`, `clientxyz`, …), not `dev/`, for production.

### 1. Checklist before go-live
- [ ] Code synced/tested in the target client folder
- [ ] Strong unique `JWT_SECRET` (e.g. `openssl rand -base64 64`)
- [ ] Strong unique `DB_PASSWORD` / DB user (not defaults)
- [ ] `SPRING_JPA_HIBERNATE_DDL_AUTO` is **not** `update` long-term — prefer `validate` + Flyway migrations
- [ ] Frontend built with production API URL (`https://api.yourdomain.com` or client port/domain)
- [ ] CORS origins limited to real frontend domains (`APP_CORS_ALLOWED_ORIGINS`)
- [ ] Cookies / HTTPS: `APP_SECURITY_COOKIE_SECURE=true` behind TLS
- [ ] Logto (if used): production endpoint, app IDs, API resource, redirect URIs, CORS in Logto Console
- [ ] Backups for Postgres; uploads volume persisted
- [ ] Healthchecks + reverse proxy (nginx/Caddy) with TLS
- [ ] No secrets committed; use `.env.prod` on the server only

### 2. Client env file (on VPS)
Create `$CLIENT/.env.prod` (never commit secrets):

```env
DB_PASSWORD=<strong-password>
JWT_SECRET=<long-random-secret>
SPRING_DATASOURCE_USERNAME=appuser
SPRING_DATASOURCE_PASSWORD=<strong-password>
VITE_API_BASE=https://abc.yourdomain.com
# Optional Logto
# APP_LOGTO_ENABLED=true
# LOGTO_ENDPOINT=https://your-tenant.logto.app
# LOGTO_ISSUER_URI=https://your-tenant.logto.app/oidc
# LOGTO_API_RESOURCE=https://abc.yourdomain.com/api
```

Frontend production image must be **rebuilt** whenever `VITE_*` values change (they are compile-time).

### 3. Local production-like smoke (optional)
From a client folder:

```bash
cd dizidentmain/clientabc

# Full client stack (own Postgres + app) — ports differ per client
docker compose up -d --build

# Or VPS-style compose (often shared host Postgres)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Example published ports (ABC): frontend `3002`, backend `8082` — confirm in that client’s compose file.

### 4. Deploy to VPS
Server layout expected by `scripts/deploy-vps.sh`:

```text
/opt/apps/dizidentmain/<client>/
  backend/
  frontend/
  docker-compose.prod.yml
  .env.prod
```

```bash
# From repo machine / CI, or on the VPS after code is present:
./scripts/deploy-vps.sh clientabc main
# ./scripts/deploy-vps.sh clientxyz main
```

The script pulls the branch, builds backend/frontend images, and restarts containers using the client’s prod compose + `.env.prod`.

### 5. Post-deploy verification
```bash
docker ps
curl -f https://your-domain/actuator/health   # or host:port
curl -f https://your-frontend-domain/health
# Login + one critical flow (patients / appointments / billing)
```

### 6. Rollback (high level)
```bash
# Re-tag / redeploy previous known-good images, or:
git checkout <previous-tag>
./scripts/deploy-vps.sh clientabc <previous-branch-or-tag>
```
Keep DB backups before schema changes.

---

## Comparison

| Approach | When to use |
|----------|-------------|
| **Shared codebase** | 95% same code, minor config differences |
| **Separate + `dev/` (this)** | 50–80% same, significant per-client changes |
| **Fully separate** | &lt;50% common code |

---

## Quick Start Summary

```bash
# --- Option A: Native ---
cd dizidentmain/dev
docker compose up -d postgres          # DB only
cd backend && .\gradlew.bat bootRun    # Windows; use ./gradlew on Unix
cd ../frontend && npm run dev          # http://localhost:5173

# --- Option B: Full Docker ---
cd dizidentmain/dev
docker compose up -d --build
# Frontend http://localhost:3000  |  API http://localhost:8080
```

**Ready to develop.**
