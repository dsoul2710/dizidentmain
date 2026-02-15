# VPS Complete Setup Guide

Complete guide for setting up Dizidental Multi-Client HMS on a fresh VPS, updating existing setup, and adding new clients.

---

## 📑 Table of Contents

1. [Fresh VPS Setup (First Time)](#fresh-vps-setup-first-time)
2. [Existing VPS - Update Deployment](#existing-vps---update-deployment)
3. [Add New Client](#add-new-client)
4. [DNS Configuration](#dns-configuration)
5. [SSL Certificate Setup](#ssl-certificate-setup)
6. [Maintenance & Reset](#maintenance--reset)
7. [Troubleshooting](#troubleshooting)

---

## 🆕 Fresh VPS Setup (First Time)

Follow these steps when setting up on a brand new VPS.

### Prerequisites
- Fresh Ubuntu 20.04/22.04 VPS
- Root SSH access
- Domain name (e.g., doctor32.in)
- Minimum 2GB RAM, 2 CPU cores

### Step 1: Initial VPS Setup

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Set timezone (optional)
timedatectl set-timezone Asia/Kolkata
```

### Step 2: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker root
newgrp docker

# Verify Docker installation
docker --version
docker ps
```

### Step 3: Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### Step 4: Install PostgreSQL 16

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Install PostgreSQL 16
sudo apt update
sudo apt install -y postgresql-16

# Verify installation
sudo systemctl status postgresql
```

### Step 5: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create application user and databases
CREATE USER appuser WITH PASSWORD '9932';
CREATE DATABASE clinic_hms_xyz OWNER appuser;
CREATE DATABASE clinic_hms_abc OWNER appuser;
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_xyz TO appuser;
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_abc TO appuser;
\q

# Enable remote access
sudo nano /etc/postgresql/16/main/postgresql.conf
# Find and change: listen_addresses = '*'

sudo nano /etc/postgresql/16/main/pg_hba.conf
# Add at the end:
# host    all             all             0.0.0.0/0            scram-sha-256
# host    all             all             172.16.0.0/12        scram-sha-256

# Restart PostgreSQL
sudo systemctl restart postgresql

# Verify PostgreSQL is listening
sudo netstat -plnt | grep 5432
# Should show: 0.0.0.0:5432
```

### Step 6: Install Git & Nginx

```bash
# Install Git
sudo apt install -y git

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Verify Nginx
sudo systemctl status nginx
```

### Step 7: Clone Repository

```bash
# Create apps directory
sudo mkdir -p /opt/apps
cd /opt/apps

# Clone repository
git clone https://github.com/dsoul2710/dizidentmain.git
cd dizidentmain

# Make deploy script executable
chmod +x scripts/deploy-vps.sh
```

### Step 8: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/hms
```

**Paste this configuration:**

```nginx
# Client XYZ
upstream xyz_backend {
    server localhost:8081;
}

upstream xyz_frontend {
    server localhost:3001;
}

server {
    listen 80;
    server_name xyz.doctor32.in;
    
    location / {
        proxy_pass http://xyz_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://xyz_backend;
        proxy_http_version 1.1;
        
        # WebSocket support (required for /ws endpoint)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}

# Client ABC
upstream abc_backend {
    server localhost:8082;
}

upstream abc_frontend {
    server localhost:3002;
}

server {
    listen 80;
    server_name abc.doctor32.in;
    
    location / {
        proxy_pass http://abc_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://abc_backend;
        proxy_http_version 1.1;
        
        # WebSocket support (required for /ws endpoint)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hms /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 9: Deploy Clients

```bash
cd /opt/apps/dizidentmain

# Deploy Client XYZ
./scripts/deploy-vps.sh clientxyz master

# Wait for deployment to complete, then deploy Client ABC
./scripts/deploy-vps.sh clientabc master

# Verify containers are running
docker ps
```

### Step 10: Configure DNS

See [DNS Configuration](#dns-configuration) section below.

### Step 11: Setup SSL

After DNS propagates, see [SSL Certificate Setup](#ssl-certificate-setup) section below.

---

## 🔄 Existing VPS - Update Deployment

Use these commands when updating code on an existing VPS setup.

### Quick Update & Redeploy

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Navigate to project
cd /opt/apps/dizidentmain

# Pull latest code
git pull origin master

# Redeploy specific client
./scripts/deploy-vps.sh clientxyz master

# Or redeploy all clients
./scripts/deploy-vps.sh clientxyz master
./scripts/deploy-vps.sh clientabc master
```

### Check Status

```bash
# Check running containers
docker ps

# Check logs
docker logs clientxyz-backend --tail=50
docker logs clientxyz-frontend --tail=50

# Test API
curl http://localhost:8081/actuator/health
curl http://xyz.doctor32.in/api/actuator/health
```

---

## ➕ Add New Client

Follow these steps to add a new client (e.g., "clientdef").

### Step 1: Create Client Directory

```bash
# On your local machine
cd d:\dizident\dizidentmain

# Copy existing client
cp -r clientxyz clientdef
```

### Step 2: Update Configuration Files

**clientdef/.env.prod:**
```env
# PostgreSQL
SPRING_DATASOURCE_USERNAME=appuser
SPRING_DATASOURCE_PASSWORD=9932

# JWT Secret (generate unique)
JWT_SECRET=def_jwt_secret_key_must_be_at_least_32_characters_long

# API Base URL
VITE_API_BASE=https://def.doctor32.in/api
```

**clientdef/docker-compose.prod.yml:**
```yaml
# Update these values:
- SPRING_DATASOURCE_URL: jdbc:postgresql://host.docker.internal:5432/clinic_hms_def
- VITE_API_BASE: ${VITE_API_BASE:-https://def.doctor32.in/api}
- container_name: clientdef-backend
- container_name: clientdef-frontend
- ports: "8083:8080"  # Backend port
- ports: "3003:80"    # Frontend port
```

### Step 3: Create Database on VPS

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Create database
sudo -u postgres psql -c "CREATE DATABASE clinic_hms_def OWNER appuser;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE clinic_hms_def TO appuser;"

# Verify
sudo -u postgres psql -l | grep clinic_hms
```

### Step 4: Update Nginx Configuration

```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/hms

# Add new upstream and server block:
```

```nginx
# Client DEF
upstream def_backend {
    server localhost:8083;
}

upstream def_frontend {
    server localhost:3003;
}

server {
    listen 80;
    server_name def.doctor32.in;
    
    location / {
        proxy_pass http://def_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        proxy_pass http://def_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Push to Git

```bash
# On local machine
git add clientdef/
git commit -m "Add new client: clientdef"
git push origin master
```

### Step 6: Deploy on VPS

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Navigate to project and pull
cd /opt/apps/dizidentmain
git pull origin master

# Deploy new client
./scripts/deploy-vps.sh clientdef master

# Verify
docker ps | grep clientdef
```

### Step 7: Configure DNS

Add DNS A record:
- Type: A
- Name: def
- Value: YOUR_VPS_IP
- TTL: 3600

### Step 8: Add SSL Certificate

```bash
# After DNS propagates
sudo certbot --nginx -d def.doctor32.in

# Or add to existing certificate
sudo certbot --nginx -d doctor32.in -d xyz.doctor32.in -d abc.doctor32.in -d def.doctor32.in
```

### Step 9: Test New Client

```bash
# Test health endpoint
curl https://def.doctor32.in/api/actuator/health

# Login with default admin
# Mobile: 9999999999
# Password: admin123
```

---

## 🌐 DNS Configuration

### Hostinger DNS Setup

1. Login to Hostinger control panel
2. Go to **Domains** → Select your domain
3. Click **DNS / Name Servers**
4. Add these A Records:

| Type | Name | Points To | TTL |
|------|------|-----------|-----|
| A | @ | YOUR_VPS_IP | 3600 |
| A | xyz | YOUR_VPS_IP | 3600 |
| A | abc | YOUR_VPS_IP | 3600 |
| A | def | YOUR_VPS_IP | 3600 |
| A | www | YOUR_VPS_IP | 3600 |

### Verify DNS Propagation

```bash
# From any computer
nslookup xyz.doctor32.in
nslookup abc.doctor32.in

# Should return YOUR_VPS_IP
```

**Wait 5-30 minutes for DNS propagation**

---

## 🔒 SSL Certificate Setup

### Install SSL for All Subdomains

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Install certificates (after DNS propagates)
sudo certbot --nginx \
  -d doctor32.in \
  -d xyz.doctor32.in \
  -d abc.doctor32.in \
  -d def.doctor32.in

# Follow prompts:
# 1. Enter email address
# 2. Agree to terms
# 3. Choose: Redirect HTTP to HTTPS (option 2)
```

### Auto-Renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certificates auto-renew every 90 days
```

### Verify SSL

```bash
curl -I https://xyz.doctor32.in
# Should show: HTTP/2 200
```

---

## 🛠️ Maintenance & Reset

### Restart All Services

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Restart Nginx
sudo systemctl restart nginx

# Restart all Docker containers
docker restart $(docker ps -q)
```

### Rebuild Single Client

```bash
cd /opt/apps/dizidentmain

# Stop and remove containers
docker stop clientxyz-backend clientxyz-frontend
docker rm clientxyz-backend clientxyz-frontend

# Remove old images
docker rmi dizidentmain-xyz-backend:latest dizidentmain-xyz-frontend:latest

# Redeploy
./scripts/deploy-vps.sh clientxyz master
```

### Complete Reset (Nuclear Option)

```bash
# ⚠️ WARNING: This will delete ALL data!

# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove all images
docker rmi $(docker images -q)

# Remove all volumes
docker volume prune -f

# Remove all networks
docker network prune -f

# Clear build cache
docker builder prune -a -f

# Drop and recreate databases
sudo -u postgres psql -c "DROP DATABASE clinic_hms_xyz;"
sudo -u postgres psql -c "DROP DATABASE clinic_hms_abc;"
sudo -u postgres psql -c "CREATE DATABASE clinic_hms_xyz OWNER appuser;"
sudo -u postgres psql -c "CREATE DATABASE clinic_hms_abc OWNER appuser;"

# Redeploy from scratch
cd /opt/apps/dizidentmain
git pull origin master
./scripts/deploy-vps.sh clientxyz master
./scripts/deploy-vps.sh clientabc master
```

### Update Domain Name

If you need to change domain (e.g., old.com → new.com):

```bash
# 1. Update on local machine
# Update all .env.prod files
# Update all docker-compose.prod.yml files
# Commit and push

# 2. On VPS
cd /opt/apps/dizidentmain
git pull origin master

# 3. Update Nginx
sudo nano /etc/nginx/sites-available/hms
# Replace old domain with new domain
sudo nginx -t
sudo systemctl reload nginx

# 4. Configure new DNS
# Add A records for new domain

# 5. Get new SSL certificates
sudo certbot --nginx -d new.com -d xyz.new.com -d abc.new.com

# 6. Redeploy containers
./scripts/deploy-vps.sh clientxyz master
./scripts/deploy-vps.sh clientabc master
```

---

## 🔧 Troubleshooting

### Backend Not Starting

```bash
# Check logs
docker logs clientxyz-backend --tail=100

# Common issues:
# 1. Database connection failed
sudo -u postgres psql -d clinic_hms_xyz -c "SELECT 1;"

# 2. Port already in use
sudo netstat -lntp | grep 8081

# 3. Environment variables missing
docker inspect clientxyz-backend | grep -A 20 Env
```

### Frontend 404 Errors

```bash
# Check if backend is running
curl http://localhost:8081/actuator/health

# Check Nginx config
sudo nginx -t
cat /etc/nginx/sites-available/hms

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check if listening on all interfaces
sudo netstat -plnt | grep 5432
# Should show: 0.0.0.0:5432

# Test connection from Docker
docker run --rm --add-host=host.docker.internal:host-gateway postgres:16 \
  psql -h host.docker.internal -U appuser -d clinic_hms_xyz -c "SELECT 1;"
```

### Docker Issues

```bash
# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check disk space
df -h

# Clean up Docker
docker system prune -a -f
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates manually
sudo certbot renew --force-renewal

# Check Nginx SSL config
sudo cat /etc/nginx/sites-available/hms | grep ssl
```

### Port Conflicts

```bash
# Check what's using a port
sudo netstat -lntp | grep 8081

# Kill process on port
sudo kill -9 $(sudo lsof -t -i:8081)

# Or change port in docker-compose.prod.yml
```

### Memory Issues

```bash
# Check memory usage
free -h
docker stats

# Increase swap (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## � Troubleshooting

### WebSocket Connection Failures

**Symptom:** `/ws/info` returns `ERR_CONNECTION_REFUSED`, chat not working

**Solution:** Ensure Nginx has WebSocket support in `/api` location:
```nginx
location /api {
    proxy_pass http://xyz_backend;
    proxy_http_version 1.1;
    
    # Required for WebSocket
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;
}
```

**Test:**
```bash
# Check if backend is accessible
curl http://localhost:8081/ws/info

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Backend Container Not Running

**Check status:**
```bash
docker ps -a | grep backend
```

**View logs:**
```bash
docker logs clientxyz-backend --tail=50
docker logs clientabc-backend --tail=50
```

**Common causes:**
- Database connection failure
- Port already in use
- Out of memory (check with `dmesg | grep -i oom`)

**Restart:**
```bash
cd /opt/apps/dizidentmain
docker-compose -f clientxyz/docker-compose.prod.yml restart
```

### Database Connection Errors

**Test connection:**
```bash
psql -h localhost -U appuser -d clinic_hms_xyz
```

**Check if PostgreSQL is running:**
```bash
sudo systemctl status postgresql
```

**Check logs:**
```bash
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### API Calls Failing

**Check backend health:**
```bash
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
```

**Check if containers can reach database:**
```bash
docker exec clientxyz-backend curl http://host.docker.internal:5432
```

**Check firewall:**
```bash
sudo ufw status
# Should allow ports 80, 443, 22
```

### SSL Certificate Issues

**Renew certificate:**
```bash
sudo certbot renew --dry-run
sudo certbot renew
```

**Check certificate status:**
```bash
sudo certbot certificates
```

### Nginx Errors

**Test configuration:**
```bash
sudo nginx -t
```

**Restart Nginx:**
```bash
sudo systemctl restart nginx
```

**Check logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Full Reset (Last Resort)

```bash
# Stop all containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)

# Remove images
docker rmi $(docker images -q dizidentmain*)

# Pull latest code
cd /opt/apps/dizidentmain
git pull

# Redeploy
./scripts/deploy-vps.sh clientxyz master
./scripts/deploy-vps.sh clientabc master
```

---

## �📞 Quick Reference

### Default Credentials

**Admin User (Auto-created):**
- Mobile: 9999999999
- Password: admin123
- Role: ADMIN

**Database:**
- Username: appuser
- Password: 9932
- Host: localhost (from VPS) or YOUR_VPS_IP (from outside)
- Port: 5432

### Port Mapping

| Client | Frontend | Backend | Database |
|--------|----------|---------|----------|
| XYZ | 3001 | 8081 | clinic_hms_xyz |
| ABC | 3002 | 8082 | clinic_hms_abc |
| DEF | 3003 | 8083 | clinic_hms_def |

### Important Paths

```bash
/opt/apps/dizidentmain/              # Application root
/etc/nginx/sites-available/hms       # Nginx config
/etc/postgresql/16/main/             # PostgreSQL config
/var/log/nginx/                      # Nginx logs
~/.docker/                           # Docker config
```

### Useful Commands

```bash
# View all containers
docker ps -a

# View logs (follow)
docker logs -f CONTAINER_NAME

# Execute command in container
docker exec -it CONTAINER_NAME bash

# Check container health
docker inspect CONTAINER_NAME | grep -A 5 Health

# Restart container
docker restart CONTAINER_NAME

# View container resource usage
docker stats
```

---

## 📄 Summary Checklist

### First Time Setup
- [ ] Update VPS system
- [ ] Install Docker & Docker Compose
- [ ] Install PostgreSQL 16
- [ ] Create databases and user
- [ ] Configure PostgreSQL for remote access
- [ ] Install Git & Nginx
- [ ] Clone repository
- [ ] Configure Nginx
- [ ] Deploy clients
- [ ] Configure DNS
- [ ] Setup SSL certificates

### Adding New Client
- [ ] Copy existing client directory
- [ ] Update .env.prod
- [ ] Update docker-compose.prod.yml (ports, names, database)
- [ ] Create database on VPS
- [ ] Add Nginx server block
- [ ] Push to Git
- [ ] Pull and deploy on VPS
- [ ] Add DNS A record
- [ ] Add SSL certificate
- [ ] Test login

### Regular Maintenance
- [ ] Update code: `git pull && ./scripts/deploy-vps.sh CLIENT master`
- [ ] Check logs: `docker logs CONTAINER --tail=50`
- [ ] Monitor resources: `docker stats`
- [ ] Backup databases regularly
- [ ] Test SSL renewal: `sudo certbot renew --dry-run`

---

**Last Updated:** February 11, 2026

**Repository:** https://github.com/dsoul2710/dizidentmain

