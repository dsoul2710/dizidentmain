# Hostinger KVM VPS Setup Guide

## 🎯 Architecture Overview

```
Hostinger KVM VPS (dizidental.cloud)
│
├── Shared PostgreSQL (Port 5432)
│   ├── Database: clinic_hms_xyz
│   ├── Database: clinic_hms_abc
│   └── Database: clinic_hms_def
│
├── Client XYZ (Subdomain: xyz.dizidental.cloud)
│   ├── Frontend (Port 3001) → Nginx
│   ├── Backend (Port 8081) → Spring Boot
│   └── Database: clinic_hms_xyz (shared Postgres)
│
├── Client ABC (Subdomain: abc.dizidental.cloud)
│   ├── Frontend (Port 3002) → Nginx
│   ├── Backend (Port 8082) → Spring Boot
│   └── Database: clinic_hms_abc (shared Postgres)
│
└── Client DEF (Subdomain: def.dizidental.cloud)
    ├── Frontend (Port 3003) → Nginx
    ├── Backend (Port 8083) → Spring Boot
    └── Database: clinic_hms_def (shared Postgres)
```

## 🚀 Step 1: VPS Initial Setup

### 1.1 SSH into VPS
```bash
ssh root@dizidental.cloud
# Or use your VPS IP address
ssh root@your-vps-ip
```

### 1.2 Update System
```bash
apt update && apt upgrade -y
```

### 1.3 Install Required Software
```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $(whoami)

# Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Git
apt install -y git

# PostgreSQL Client (for management)
apt install -y postgresql-client

# Nginx (reverse proxy)
apt install -y nginx

# Certbot for SSL
apt install -y certbot python3-certbot-nginx
```

### 1.4 Create App Directory Structure
```bash
mkdir -p /opt/apps/dizidentmain
cd /opt/apps/dizidentmain

# Clone your git repository
git clone <your-git-repo-url> .
# or
git init
git remote add origin <your-git-repo-url>
git pull origin main
```

---

## 🗄️ Step 2: PostgreSQL Setup (Shared)

PostgreSQL will be installed directly on VPS (not in Docker), all clients share it.

### 2.1 Install PostgreSQL
```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
sudo apt install -y postgresql-16

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2.2 Create Databases
```bash
sudo -u postgres psql <<EOF

-- Create databases for each client
CREATE DATABASE clinic_hms_xyz;
CREATE DATABASE clinic_hms_abc;
CREATE DATABASE clinic_hms_def;

-- Create app user
CREATE USER appuser WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_xyz TO appuser;
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_abc TO appuser;
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_def TO appuser;

-- Connect to each database and grant schema privileges
\c clinic_hms_xyz
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;

\c clinic_hms_abc
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;

\c clinic_hms_def
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;

EOF
```

### 2.3 Configure PostgreSQL for Remote Connections
```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf

# Find and change:
# listen_addresses = 'localhost'
# to:
# listen_addresses = '*'

# Edit pg_hba.conf
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Add at the end:
# host    all             appuser         127.0.0.1/32            md5
# host    all             appuser         ::1/128                 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 🐳 Step 3: Docker Setup for Each Client

### 3.1 Create Client XYZ on VPS

Create `/opt/apps/dizidentmain/clientxyz/.env.prod`:
```env
# Database
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/clinic_hms_xyz
SPRING_DATASOURCE_USERNAME=appuser
SPRING_DATASOURCE_PASSWORD=your_secure_password

# JWT
JWT_SECRET=xyz_secret_key_min_32_chars_please

# API Base URL
VITE_API_BASE=https://xyz.dizidental.cloud/api

# Server Port
SERVER_PORT=8081
```

Create modified `/opt/apps/dizidentmain/clientxyz/docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    image: digidentmain-xyz-backend:latest
    container_name: clientxyz-backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://host.docker.internal:5432/clinic_hms_xyz
      SPRING_DATASOURCE_USERNAME: ${SPRING_DATASOURCE_USERNAME}
      SPRING_DATASOURCE_PASSWORD: ${SPRING_DATASOURCE_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SERVER_PORT: 8081
    ports:
      - "8081:8080"
    networks:
      - hms-network
    restart: unless-stopped
    depends_on:
      - frontend

  frontend:
    image: digidentmain-xyz-frontend:latest
    container_name: clientxyz-frontend
    environment:
      VITE_API_BASE: ${VITE_API_BASE}
    ports:
      - "3001:80"
    networks:
      - hms-network
    restart: unless-stopped

networks:
  hms-network:
    driver: bridge
```

### 3.2 Build and Run Clients

```bash
cd /opt/apps/dizidentmain/clientxyz

# Build backend image
docker build -f backend/Dockerfile -t digidentmain-xyz-backend:latest ./backend

# Build frontend image
docker build -f frontend/Dockerfile -t digidentmain-xyz-frontend:latest ./frontend

# Run with docker-compose
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Repeat for `clientabc` and `clientdef` with different ports (8082-3002, 8083-3003).

---

## 🌐 Step 4: Nginx Reverse Proxy Setup

Create `/etc/nginx/sites-available/hms`:

```nginx
# Client XYZ
upstream xyz_backend {
    server 127.0.0.1:8081;
}

upstream xyz_frontend {
    server 127.0.0.1:3001;
}

server {
    server_name xyz.dizidental.cloud;

    location /api/ {
        proxy_pass http://xyz_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://xyz_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 80;
}

# Client ABC
upstream abc_backend {
    server 127.0.0.1:8082;
}

upstream abc_frontend {
    server 127.0.0.1:3002;
}

server {
    server_name abc.dizidental.cloud;

    location /api/ {
        proxy_pass http://abc_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://abc_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 80;
}

# Client DEF
upstream def_backend {
    server 127.0.0.1:8083;
}

upstream def_frontend {
    server 127.0.0.1:3003;
}

server {
    server_name def.dizidental.cloud;

    location /api/ {
        proxy_pass http://def_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://def_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    listen 80;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/hms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Step 5: SSL Certificate Setup (HTTPS)

```bash
# Get SSL for all subdomains
sudo certbot certonly --nginx \
  -d dizidental.cloud \
  -d xyz.dizidental.cloud \
  -d abc.dizidental.cloud \
  -d def.dizidental.cloud

# Update Nginx config with SSL
sudo certbot --nginx -d xyz.dizidental.cloud \
                     -d abc.dizidental.cloud \
                     -d def.dizidental.cloud
```

This will automatically update Nginx configuration with SSL redirects.

---

## 📝 Step 6: Domain Configuration

### On Hostinger Control Panel:

1. Go to **DNS Settings** for `dizidental.cloud`
2. Add **A Records**:
   ```
   xyz        A  your-vps-ip
   abc        A  your-vps-ip
   def        A  your-vps-ip
   @          A  your-vps-ip
   ```

3. DNS will propagate in 24 hours (usually faster)

---

## 🚀 Step 7: Deployment Workflow

### Automatic Deployment Script

Create `/opt/apps/dizidentmain/deploy-vps.sh`:

```bash
#!/bin/bash

CLIENT=$1
REPO="your-git-repo-url"
BRANCH="${2:-main}"

if [ -z "$CLIENT" ]; then
    echo "Usage: ./deploy-vps.sh <client-name> [branch]"
    echo "Example: ./deploy-vps.sh clientxyz main"
    exit 1
fi

cd /opt/apps/dizidentmain/$CLIENT

# Pull latest code
git pull origin $BRANCH

# Build images
echo "Building backend image..."
docker build -f backend/Dockerfile -t digidentmain-$CLIENT-backend:latest ./backend

echo "Building frontend image..."
docker build -f frontend/Dockerfile -t digidentmain-$CLIENT-frontend:latest ./frontend

# Deploy
echo "Deploying $CLIENT..."
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Show status
docker-compose -f docker-compose.prod.yml ps
```

Make executable and use:
```bash
chmod +x /opt/apps/dizidentmain/deploy-vps.sh
./deploy-vps.sh clientxyz main
./deploy-vps.sh clientabc main
./deploy-vps.sh clientdef main
```

---

## 📊 Step 8: Monitoring & Management

### Check Container Status
```bash
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Check Database
```bash
psql -h localhost -U appuser -d clinic_hms_xyz
\dt  # List tables
\d   # List schemas
```

### Restart Client
```bash
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml restart
```

### Stop All Clients
```bash
for client in clientxyz clientabc clientdef; do
    cd /opt/apps/dizidentmain/$client
    docker-compose -f docker-compose.prod.yml down
done
```

---

## 🔧 Troubleshooting

### Docker can't connect to PostgreSQL
```bash
# Docker container needs to use host.docker.internal
# In docker-compose.prod.yml use:
SPRING_DATASOURCE_URL: jdbc:postgresql://host.docker.internal:5432/clinic_hms_xyz
```

### Port already in use
```bash
# Find what's using the port
lsof -i :8081

# Kill the process
kill -9 <PID>
```

### Nginx not routing correctly
```bash
# Test Nginx config
sudo nginx -t

# View real-time logs
sudo tail -f /var/log/nginx/error.log
```

### DNS not resolving
```bash
# Test from your local machine
nslookup xyz.dizidental.cloud

# Wait 24 hours for DNS propagation
# Or check nameserver propagation:
# https://mxtoolbox.com/
```

---

## 🎯 Next Steps

1. **Configure Git Remote**: Push your code to your Git repository
2. **Update DNS**: Point subdomains to your VPS IP
3. **Upload .env.prod**: Add secure credentials to each client
4. **Deploy First Client**: Test with `clientxyz`
5. **Setup Monitoring**: Consider using `pm2` or `supervisor` for process management
6. **Backup Strategy**: Setup PostgreSQL backup scripts

---

## 📚 Quick Commands Reference

```bash
# Clone and setup
cd /opt/apps
git clone your-repo dizidentmain
cd dizidentmain

# Deploy all clients
for client in clientxyz clientabc clientdef; do
    ./deploy-vps.sh $client main
done

# View all logs
docker-compose -f clientxyz/docker-compose.prod.yml logs
docker-compose -f clientabc/docker-compose.prod.yml logs
docker-compose -f clientdef/docker-compose.prod.yml logs

# Backup databases
pg_dump -h localhost -U appuser clinic_hms_xyz > backup_xyz_$(date +%Y%m%d).sql

# Restart Nginx
sudo systemctl restart nginx
```

---

**Last Updated**: February 11, 2026  
**Architecture**: Multi-client with shared PostgreSQL on Hostinger KVM VPS
