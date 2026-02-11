# Dizidental - Multi-Client HMS (Hospital Management System)

A multi-tenant hospital/clinic management system with separate databases and subdomains for each client.

## 🏗️ Architecture

- **Backend:** Spring Boot 3.x (Java 21)
- **Frontend:** React + Vite
- **Database:** PostgreSQL 16 (Shared instance, separate databases per client)
- **Deployment:** Docker + Nginx on VPS
- **Domain:** https://dizidental.cloud

## 📁 Project Structure

```
dizidentmain/
├── clientxyz/                # Client XYZ
│   ├── backend/              # Spring Boot backend
│   ├── frontend/             # React frontend
│   ├── docker-compose.prod.yml
│   └── .env.prod             # Production config
├── clientabc/                # Client ABC (same structure)
├── scripts/
│   ├── deploy-vps.sh         # VPS deployment script
│   └── deploy-vps.ps1        # Windows deployment script
├── README.md                 # This file
└── VPS_COMMANDS.md          # Complete deployment guide
```

## ✨ Features

- Multi-client architecture with isolated databases
- Patient management & appointment scheduling
- Doctor management & treatment planning
- Billing & prescription system
- Odontogram (dental chart)
- JWT authentication with role-based access control (ADMIN, DOCTOR, PATIENT)
- Auto-seeding of admin user on first startup

## 🚀 Quick Deploy to VPS

### Prerequisites
- VPS with Docker installed
- Domain configured (dizidental.cloud)
- PostgreSQL 16 installed on VPS

### Deployment Steps

```bash
# 1. SSH into VPS
ssh root@72.61.171.38

# 2. Clone repository (first time only)
cd /opt/apps
git clone https://github.com/dsoul2710/dizidentmain.git
cd dizidentmain

# 3. Deploy Client XYZ
./scripts/deploy-vps.sh clientxyz master

# 4. Deploy Client ABC
./scripts/deploy-vps.sh clientabc master
```

### Access Applications

| Client | URL | Database |
|--------|-----|----------|
| Client XYZ | https://xyz.dizidental.cloud | clinic_hms_xyz |
| Client ABC | https://abc.dizidental.cloud | clinic_hms_abc |

## 🔐 Default Admin Credentials

Auto-created on first startup:

- **Mobile:** 9999999999
- **Password:** admin123
- **Role:** ADMIN

⚠️ **Change these immediately after first login!**

## 🔧 Local Development

### Backend
```bash
cd clientxyz/backend
./gradlew bootRun
# Access: http://localhost:8080
```

### Frontend
```bash
cd clientxyz/frontend
npm install
npm run dev
# Access: http://localhost:5173
```

## 🗄️ Database Configuration

**Shared PostgreSQL on VPS:**
- Host: localhost (from VPS) or 72.61.171.38 (from outside)
- Port: 5432
- Username: appuser
- Password: 9932

**Databases:**
- `clinic_hms_xyz` - Client XYZ
- `clinic_hms_abc` - Client ABC

Tables are created automatically by Hibernate on first run.

## 🐳 Docker Containers

Each client runs 2 containers:

| Client | Frontend Port | Backend Port |
|--------|--------------|-------------|
| XYZ | 3001 | 8081 |
| ABC | 3002 | 8082 |

**Nginx** on VPS routes by subdomain:
- `xyz.dizidental.cloud` → port 3001/8081
- `abc.dizidental.cloud` → port 3002/8082

## 📝 Environment Variables

### Backend (.env.prod)
```env
SPRING_DATASOURCE_USERNAME=appuser
SPRING_DATASOURCE_PASSWORD=9932
JWT_SECRET=your_jwt_secret_min_32_chars
```

### Frontend (.env.prod)
```env
VITE_API_BASE=https://xyz.dizidental.cloud/api
```

## 🛠️ Technologies

**Backend:**
- Spring Boot 3.2
- Spring Security + JWT
- Spring Data JPA
- PostgreSQL Driver
- Hibernate
- Lombok

**Frontend:**
- React 18
- Vite
- Axios
- React Router

**Infrastructure:**
- Docker & Docker Compose
- Nginx (Reverse Proxy + SSL Termination)
- Let's Encrypt SSL
- PostgreSQL 16

## 📡 API Endpoints

```
POST   /api/auth/login           # User login
GET    /api/patients             # List patients
POST   /api/patients             # Create patient
GET    /api/patients/{id}        # Get patient
PUT    /api/patients/{id}        # Update patient
GET    /api/appointments         # List appointments
POST   /api/appointments         # Create appointment
GET    /actuator/health          # Health check
```

## 🔒 Security Features

- JWT token-based authentication
- HttpOnly cookies for token storage
- Role-based access control (ADMIN, DOCTOR, PATIENT)
- CORS configuration
- SSL/TLS encryption (Let's Encrypt)
- Separate databases per client
- Password encryption (to be implemented)

## 🌐 DNS & SSL Setup

**DNS A Records:**
```
@ → 72.61.171.38
xyz → 72.61.171.38
abc → 72.61.171.38
```

**SSL Certificate:**
```bash
sudo certbot --nginx -d dizidental.cloud -d xyz.dizidental.cloud -d abc.dizidental.cloud
```

Auto-renews every 90 days.

## 📚 Documentation

- **[VPS_COMMANDS.md](VPS_COMMANDS.md)** - Complete VPS deployment guide with troubleshooting

## 🐛 Troubleshooting

### Backend not starting
```bash
docker logs clientxyz-backend --tail=50
# Check database connection and environment variables
```

### Frontend 404 errors
```bash
# Check if backend is running
curl http://localhost:8081/actuator/health

# Check Nginx configuration
sudo nginx -t
sudo systemctl status nginx
```

### Database connection issues
```bash
# Test PostgreSQL
sudo -u postgres psql -d clinic_hms_xyz -c "SELECT 1;"

# Check if PostgreSQL is listening
sudo netstat -plnt | grep 5432
```

### Redeploy after code changes
```bash
cd /opt/apps/dizidentmain
git pull origin master
./scripts/deploy-vps.sh clientxyz master
```

## 📞 Support

For detailed deployment instructions and troubleshooting, see **[VPS_COMMANDS.md](VPS_COMMANDS.md)**

---

**VPS Information:**
- IP: 72.61.171.38
- Domain: dizidental.cloud
- PostgreSQL: localhost:5432
- GitHub: https://github.com/dsoul2710/dizidentmain

**Last Updated:** February 11, 2026
