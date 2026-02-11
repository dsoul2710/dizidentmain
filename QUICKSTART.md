# Quick Start Guide

Get your client deployed in 5 minutes!

## ⚡ Super Quick

```powershell
# 1. Setup credentials
cd clientxyz
copy .env.example .env
notepad .env  # Update passwords

# 2. Deploy
.\scripts\deploy-client.ps1 clientxyz

# 3. Access
# Frontend: http://localhost:3001
# Backend:  http://localhost:8081
```

Done! 🎉

## 📝 Detailed Steps

### 1. Configure Environment

```powershell
cd clientxyz
copy .env.example .env
```

Edit `.env`:
```env
# Strong database password
DB_PASSWORD=change_me_to_strong_password

# Generate JWT secret (PowerShell):
# [Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
JWT_SECRET=your_long_random_secret_here

# API URL (localhost for dev)
VITE_API_BASE=http://localhost:8081
```

### 2. Deploy Client

**Windows:**
```powershell
.\scripts\deploy-client.ps1 clientxyz
```

**Linux/Mac:**
```bash
chmod +x scripts/*.sh
./scripts/deploy-client.sh clientxyz
```

### 3. Verify Deployment

```powershell
cd clientxyz
docker-compose ps

# Should show 3 containers running:
# - clientxyz-postgres
# - clientxyz-backend
# - clientxyz-frontend
```

### 4. Access Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:8081/api
- **Swagger**: http://localhost:8081/swagger-ui.html
- **Health**: http://localhost:8081/actuator/health

### 5. Create Admin User

```powershell
# Connect to database
docker exec -it clientxyz-postgres psql -U postgres -d clinic_hms_xyz

# Create admin
INSERT INTO users (mobile, password, role, is_active, created_at, updated_at)
VALUES ('9999999999', 'admin123', 'ADMIN', true, NOW(), NOW());

# Exit
\q
```

Login: `9999999999` / `admin123`

## 🎨 Customize Client

### Change Branding

```powershell
# Edit colors, logos, text
cd clientxyz/frontend/src
notepad assets/css/style.css
notepad components/layout/Header.jsx
```

### Add Custom Feature

```powershell
# Backend: Add controller/service
cd clientxyz/backend/src/main/java/com/clinic/hms

# Frontend: Add component/page
cd clientxyz/frontend/src
```

### Rebuild After Changes

```powershell
cd clientxyz
docker-compose up -d --build
```

## 🌐 Deploy to Production (VPS)

```bash
# On VPS
cd /opt/apps
git clone <your-repo-url> dizidentmain
cd dizidentmain

# Setup client
cd clientxyz
cp .env.example .env
nano .env  # Update with production credentials

# Deploy
cd ..
./scripts/deploy-client.sh clientxyz
```

## 🔄 Common Tasks

### View Logs
```powershell
cd clientxyz
docker-compose logs -f
```

### Stop Client
```powershell
cd clientxyz
docker-compose down
```

### Restart Client
```powershell
docker-compose restart
```

### Reset Database
```powershell
docker-compose down -v  # Deletes data!
docker-compose up -d
```

### Deploy All Clients
```powershell
.\scripts\deploy-all.ps1
```

## 🆕 Add New Client

```powershell
# Copy existing
Copy-Item clientxyz clientnew -Recurse

# Update configs
cd clientnew
copy .env.example .env
notepad .env
notepad docker-compose.yml  # Change ports, names

# Deploy
.\scripts\deploy-client.ps1 clientnew
```

Update docker-compose.yml:
- Container names: `clientnew-*`
- Ports: `3003:80`, `8083:8080`, `5435:5432`
- DB name: `clinic_hms_new`

## ❓ Troubleshooting

### Port Already in Use
```powershell
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Can't Connect to Backend
- Check backend is running: `docker ps`
- View logs: `docker-compose logs backend`
- Verify .env has correct passwords

### Database Error
```powershell
# Check database
docker logs clientxyz-postgres

# Recreate
docker-compose down -v
docker-compose up -d
```

## 📚 Next Steps

1. ✅ Customize branding
2. ✅ Setup domain (production)
3. ✅ Configure SSL
4. ✅ Setup backups
5. ✅ Push to Git

See [README.md](README.md) for full documentation!
