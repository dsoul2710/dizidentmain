# VPS Deployment Quick Guide

## 📋 Overview

Deploy your multi-client HMS application to Hostinger KVM VPS with:
- **Shared PostgreSQL** on VPS (one database host for all clients)
- **Separate Docker containers** per client (independent backends & frontends)
- **Separate subdomains** for each client via Nginx reverse proxy
- **SSL/TLS** certificates via Let's Encrypt

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Prepare Code for Git

```powershell
# On your local machine
cd D:\dizident\dizidentmain

# Create .env.prod files for each client
# XYZ Client
Copy-Item clientxyz\.env.prod.example clientxyz\.env.prod
notepad clientxyz\.env.prod    # Fill in credentials

# ABC Client
Copy-Item clientabc\.env.prod.example clientabc\.env.prod
notepad clientabc\.env.prod    # Fill in credentials

# Commit to Git
git add .
git commit -m "Add production environment files"
git push origin main
```

### Step 2: VPS Initial Setup (SSH)

```bash
# SSH into your Hostinger VPS
ssh root@srv1358942.hstgr.cloud

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker root
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install PostgreSQL
apt install -y postgresql-16

# Install Git & Nginx
apt install -y git nginx certbot python3-certbot-nginx
```

### Step 3: PostgreSQL Setup (VPS)

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create databases and user
sudo -u postgres psql <<EOF

-- Create databases
CREATE DATABASE clinic_hms_xyz;
CREATE DATABASE clinic_hms_abc;

-- Create user
CREATE USER appuser WITH PASSWORD 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_xyz TO appuser;
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_abc TO appuser;

-- Schema privileges
\c clinic_hms_xyz
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;

\c clinic_hms_abc
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;

EOF
```

### Step 4: Clone Repository & Deploy (VPS)

```bash
# Create app directory
mkdir -p /opt/apps
cd /opt/apps

# Clone your repository
git clone https://github.com/your-username/your-repo.git dizidentmain
cd dizidentmain

# Create .env.prod files from examples
cp clientxyz/.env.prod.example clientxyz/.env.prod
cp clientabc/.env.prod.example clientabc/.env.prod

# Edit with correct credentials
nano clientxyz/.env.prod
nano clientabc/.env.prod

# Make scripts executable
chmod +x scripts/*.sh

# Deploy Client XYZ
./scripts/deploy-vps.sh clientxyz main

# Deploy Client ABC (wait for XYZ to finish)
./scripts/deploy-vps.sh clientabc main
```

### Step 5: Nginx & Domain Setup (VPS)

```bash
# Create Nginx config
sudo tee /etc/nginx/sites-available/hms > /dev/null <<'EOF'
# Client XYZ
upstream xyz_backend { server 127.0.0.1:8081; }
upstream xyz_frontend { server 127.0.0.1:3001; }

server {
    server_name xyz.srv1358942.hstgr.cloud;
    
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
    }
    
    listen 80;
}

# Client ABC
upstream abc_backend { server 127.0.0.1:8082; }
upstream abc_frontend { server 127.0.0.1:3002; }

server {
    server_name abc.srv1358942.hstgr.cloud;
    
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
    }
    
    listen 80;
}
EOF

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/hms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL Certificates
sudo certbot --nginx -d xyz.srv1358942.hstgr.cloud -d abc.srv1358942.hstgr.cloud
```

---

## 🎯 Verify Deployment

### Check Services Running
```bash
# Check Docker containers
docker ps

# Check Nginx
sudo systemctl status nginx

# Check PostgreSQL
sudo pg_isready -h localhost

# Test database connections
psql -h localhost -U appuser -d clinic_hms_xyz -c "SELECT version();"
```

### Test Frontend Access
```bash
# From your local machine
curl -I http://xyz.srv1358942.hstgr.cloud
curl -I http://abc.srv1358942.hstgr.cloud

# Should get 200 OK responses
```

### View Logs
```bash
# Backend logs
docker logs clientxyz-backend
docker logs clientabc-backend

# Frontend logs
docker logs clientxyz-frontend
docker logs clientabc-frontend

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📝 File Structure on VPS

```
/opt/apps/dizidentmain/
├── clientxyz/
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.prod.yml
│   └── .env.prod
├── clientabc/
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.prod.yml
│   └── .env.prod
└── scripts/
    └── deploy-vps.sh
```

---

## 🔄 Updating Code After Deployment

When you make changes locally:

```powershell
# On your local machine
git add .
git commit -m "Your changes"
git push origin main
```

Then on VPS:

```bash
# SSH to VPS
ssh root@srv1358942.hstgr.cloud
cd /opt/apps/dizidentmain

# Redeploy client
./scripts/deploy-vps.sh clientxyz main

# Or redeploy both
for client in clientxyz clientabc; do
    ./scripts/deploy-vps.sh $client main
done
```

---

## 🔧 Common Commands

### View Running Containers
```bash
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml ps
```

### Restart a Client
```bash
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml restart
```

### Stop All Clients
```bash
cd /opt/apps/dizidentmain

for client in clientxyz clientabc; do
    cd $client
    docker-compose -f docker-compose.prod.yml down
    cd ..
done
```

### View Backend Logs
```bash
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml logs -f backend
```

### View Frontend Logs
```bash
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Backup Database
```bash
# Backup specific database
pg_dump -h localhost -U appuser clinic_hms_xyz > backup_xyz_$(date +%Y%m%d_%H%M%S).sql

# Backup all databases
pg_dumpall -h localhost -U appuser > backup_all_$(date +%Y%m%d_%H%M%S).sql
```

---

## ⚠️ Troubleshooting

### Docker Can't Connect to PostgreSQL
**Problem**: `Connection refused` errors in backend logs

**Solution**: 
- Use `host.docker.internal` in docker-compose.prod.yml
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check firewall: `sudo ufw allow 5432`

### SSL Certificate Not Renewing
```bash
# Manual renewal
sudo certbot renew --force-renewal

# Setup auto-renewal
sudo systemctl enable certbot.timer
```

### Port Already in Use
```bash
# Find what's using port 8081
lsof -i :8081

# Kill the process
kill -9 <PID>
```

### Nginx Not Routing to Docker
```bash
# Verify Nginx config
sudo nginx -t

# Check Docker container IPs
docker inspect containerid | grep IPAddress

# Ensure Docker network is running
docker network ls
```

### Containers Keep Restarting
```bash
# Check logs for errors
docker logs --tail=100 clientxyz-backend

# Verify .env.prod has correct values
cat /opt/apps/dizidentmain/clientxyz/.env.prod

# Check database connectivity
docker exec clientxyz-backend bash -c 'nc -zv host.docker.internal 5432'
```

---

## 📞 Support

For detailed setup, see [VPS_SETUP.md](VPS_SETUP.md)

Need to add a new client?
1. Copy existing client: `cp -r clientxyz clientnew`
2. Update ports in docker-compose.prod.yml
3. Update .env.prod with new database and JWT secret
4. Add Nginx config for new subdomain
5. Deploy: `./scripts/deploy-vps.sh clientnew main`

---

**Last Updated**: February 11, 2026
