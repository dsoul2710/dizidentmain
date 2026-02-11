# Dev Environment

This is your **main local development environment**. Work here, then sync changes to specific clients when ready.

## 🚀 Quick Start

### Option 1: Docker (Recommended)
Starts everything (PostgreSQL + Backend + Frontend):

```bash
# Windows
cd d:\dizident\dizidentmain
.\scripts\dev-local.ps1 docker

# Linux/Mac
./scripts/dev-local.sh docker
```

Access:
- 🎨 Frontend: http://localhost:3000
- 📦 Backend API: http://localhost:8080
- 📖 Swagger UI: http://localhost:8080/swagger-ui.html
- 🗄️ PostgreSQL: localhost:5432

### Option 2: Native (Without Docker)
Run backend and frontend separately (requires PostgreSQL installed):

**Terminal 1 - Backend:**
```bash
cd dev/backend
./gradlew bootRun       # Windows: .\gradlew.bat bootRun
```

**Terminal 2 - Frontend:**
```bash
cd dev/frontend
npm install
npm run dev
```

Access:
- 🎨 Frontend: http://localhost:5173
- 📦 Backend API: http://localhost:8080

## 🔄 Sync to Clients

After developing features here, sync to specific clients:

```bash
# Sync single file
.\scripts\sync-to-client.ps1 abc backend/src/service/BillingService.java

# Sync entire folder
.\scripts\sync-to-client.ps1 xyz frontend/src/pages/

# Common bug fix to both clients
.\scripts\sync-to-client.ps1 abc backend/src/util/DateUtil.java
.\scripts\sync-to-client.ps1 xyz backend/src/util/DateUtil.java
```

## 🗄️ Database

**Docker mode:** PostgreSQL runs in container
- Database: clinic_hms_dev
- Username: postgres  
- Password: postgres

**Native mode:** Uses your local PostgreSQL
- Make sure PostgreSQL is running on `localhost:5432`
- Create database: `CREATE DATABASE clinic_hms_dev;`
- Update [.env](.env) if your password is different

## 🔐 Default Admin

Auto-created on first startup:
- Mobile: 9999999999
- Password: admin123
- Role: ADMIN

## 📝 Configuration Files

- [.env](.env) - Environment variables
- [docker-compose.yml](docker-compose.yml) - Docker setup
- [Backend config](backend/src/main/resources/application.properties)
- [Frontend config](frontend/src/config.js)

## 🛠️ Troubleshooting

### Docker issues
```bash
# Start Docker Desktop first, then:
docker-compose down
docker-compose up --build
```

### Database connection issues (native mode)
```bash
# Check PostgreSQL is running
Test-NetConnection -ComputerName localhost -Port 5432

# Create database if needed
psql -U postgres
CREATE DATABASE clinic_hms_dev;
\q
```

### Port already in use
```bash
# Stop running containers
docker-compose down

# Or kill process on port
# Windows: netstat -ano | findstr :8080
# Linux: lsof -i :8080
```

## 📚 Development Workflow

1. **Develop** in `dev/` folder
2. **Test** locally (http://localhost:3000)
3. **Sync** to clients when ready
4. **Test** in client folder
5. **Deploy** to VPS

See [LOCAL_DEV_GUIDE.md](../LOCAL_DEV_GUIDE.md) for detailed workflows.
