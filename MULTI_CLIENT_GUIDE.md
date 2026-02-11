# Multi-Client Management Guide

## 📊 Overview

Your project is set up to run multiple independent clients on a single VPS using:
- **Shared PostgreSQL** database server (one host for all clients)
- **Separate databases** per client (complete data isolation)
- **Separate Docker containers** per client (independent apps)
- **Shared Nginx** reverse proxy (routes traffic by subdomain)

---

## 🎯 Client Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Hostinger KVM VPS (srv1358942.hstgr.cloud)     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Shared PostgreSQL (Port 5432)                  │   │
│  │  ├── clinic_hms_xyz   (appuser)                 │   │
│  │  ├── clinic_hms_abc   (appuser)                 │   │
│  │  └── clinic_hms_def   (appuser)                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐     │
│  │  Client XYZ         │  │  Client ABC         │     │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │     │
│  │  │ Frontend:3001 │  │  │  │ Frontend:3002 │  │     │
│  │  └───────────────┘  │  │  └───────────────┘  │     │
│  │  ┌───────────────┐  │  │  ┌───────────────┐  │     │
│  │  │ Backend:8081  │  │  │  │ Backend:8082  │  │     │
│  │  └───────────────┘  │  │  └───────────────┘  │     │
│  └─────────────────────┘  └─────────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Nginx Reverse Proxy (Port 80, 443)             │   │
│  │  xyz.srv1358942.hstgr.cloud  → XYZ containers   │   │
│  │  abc.srv1358942.hstgr.cloud  → ABC containers   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
/opt/apps/dizidentmain/
│
├── 📂 clientxyz/
│   ├── 📂 backend/              (Spring Boot source)
│   ├── 📂 frontend/             (React source)
│   ├── docker-compose.prod.yml  (Production config)
│   ├── .env.prod                (Secrets - git-ignored)
│   ├── .env.prod.example        (Template)
│   ├── clientxyz/Dockerfile     (Backend image)
│   └── clientxyz/Dockerfile     (Frontend image)
│
├── 📂 clientabc/
│   ├── 📂 backend/
│   ├── 📂 frontend/
│   ├── docker-compose.prod.yml
│   ├── .env.prod
│   └── .env.prod.example
│
├── 📂 clientdef/                (When ready to add)
│   └── (Same structure as above)
│
└── 📂 scripts/
    ├── deploy-vps.sh           (Linux deployment)
    └── deploy-vps.ps1          (Windows deployment)
```

---

## 🚀 Common Operations

### 1. Deploy New Code to Client

```bash
# SSH to VPS
ssh root@srv1358942.hstgr.cloud
cd /opt/apps/dizidentmain

# Deploy specific client
./scripts/deploy-vps.sh clientxyz main

# Deploy all clients
for client in clientxyz clientabc; do
    ./scripts/deploy-vps.sh $client main
done
```

---

### 2. Add a New Client

#### Step A: On Local Machine
```powershell
# Copy existing client
Copy-Item -Path "clientxyz" -Destination "clientnew" -Recurse

# Update docker-compose.prod.yml:
# - Image names: dizidentmain-clientnew-*
# - Ports: 3003:80, 8083:8080
# - Container names: clientnew-*

# Create .env.prod
Copy-Item clientnew\.env.prod.example clientnew\.env.prod
notepad clientnew\.env.prod
# Update: SPRING_DATASOURCE_PASSWORD, JWT_SECRET, VITE_API_BASE

# Commit to Git
git add clientnew/
git commit -m "Add new client: clientnew"
git push origin main
```

#### Step B: On VPS
```bash
# SSH to VPS
ssh root@srv1358942.hstgr.cloud
cd /opt/apps/dizidentmain

# Pull latest code
git pull origin main

# Create database
sudo -u postgres psql <<EOF
CREATE DATABASE clinic_hms_new;
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_new TO appuser;
\c clinic_hms_new
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
EOF

# Deploy
./scripts/deploy-vps.sh clientnew main

# Add to Nginx config
sudo nano /etc/nginx/sites-available/hms
# Add block for clientnew (ports 3003, 8083, subdomain new.srv1358942.hstgr.cloud)

sudo nginx -t
sudo systemctl reload nginx
```

---

### 3. Manage Individual Client

```bash
# Check if running
docker ps | grep clientxyz

# View logs
docker logs clientxyz-backend -f
docker logs clientxyz-frontend -f

# Restart
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml restart

# Stop
docker-compose -f docker-compose.prod.yml down

# Start
docker-compose -f docker-compose.prod.yml up -d
```

---

### 4. Database Operations

#### Connect to Client Database
```bash
# Connect as appuser
psql -h localhost -U appuser -d clinic_hms_xyz

# Common commands
\dt                    # List tables
\d tablename          # Show table structure
SELECT COUNT(*) FROM users;  # Query data
```

#### Backup Client Database
```bash
# Single database
pg_dump -h localhost -U appuser clinic_hms_xyz > backup_xyz_$(date +%Y%m%d).sql

# All databases
pg_dumpall -h localhost -U appuser > backup_all_$(date +%Y%m%d).sql

# Compressed backup (recommended)
pg_dump -h localhost -U appuser clinic_hms_xyz | gzip > backup_xyz_$(date +%Y%m%d).sql.gz
```

#### Restore Database
```bash
# From SQL file
psql -h localhost -U appuser clinic_hms_xyz < backup_xyz_20260211.sql

# From compressed file
gunzip < backup_xyz_20260211.sql.gz | psql -h localhost -U appuser clinic_hms_xyz
```

---

### 5. Update Configuration

#### Change JWT Secret
```bash
# Edit client's .env.prod
nano /opt/apps/dizidentmain/clientxyz/.env.prod

# Update JWT_SECRET=new_secret_here

# Restart backend container
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml restart backend
```

#### Change API Base URL
```bash
# Edit client's .env.prod
nano /opt/apps/dizidentmain/clientxyz/.env.prod

# Update VITE_API_BASE
VITE_API_BASE=https://xyz.srv1358942.hstgr.cloud/api

# Rebuild frontend
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml up -d --build frontend
```

---

### 6. Monitor Resource Usage

```bash
# Overall Docker stats
docker stats

# Specific container
docker stats clientxyz-backend

# System resources
free -h                    # Memory
df -h                      # Disk
top                        # CPU
```

---

### 7. Troubleshoot Issues

#### Container Won't Start
```bash
# Check logs
docker logs clientxyz-backend

# Check environment variables
docker inspect clientxyz-backend | grep -A20 "Env"

# Verify .env.prod file
cat /opt/apps/dizidentmain/clientxyz/.env.prod

# Check connectivity to PostgreSQL
docker exec clientxyz-backend bash -c 'nc -zv host.docker.internal 5432'
```

#### Database Connection Errors
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check if database exists
sudo -u postgres psql -l | grep clinic_hms

# Test connection
psql -h localhost -U appuser -d clinic_hms_xyz -c "SELECT 1;"

# Check firewall
sudo ufw status
```

#### Nginx Not Routing Correctly
```bash
# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Test proxy
curl -I http://127.0.0.1:3001  # Direct to frontend container
curl -I http://localhost/      # Via Nginx
```

---

## 🔄 Maintenance Schedule

### Daily
- Monitor container health: `docker ps`
- Check logs for errors: `docker logs container_name`

### Weekly
- Backup databases
- Check disk space: `df -h`
- Review security logs

### Monthly
- Update system: `apt update && apt upgrade -y`
- Check SSL certificate expiry: `certbot certificates`
- Docker cleanup: `docker system prune -a`

### Quarterly
- Test backup restoration
- Review and update security policies
- Performance analysis

---

## 🔐 Security Best Practices

1. **Never commit .env.prod files to Git**
   ```bash
   # Verify in .gitignore
   cat .gitignore | grep ".env.prod"
   ```

2. **Use strong passwords**
   - PostgreSQL user password: 20+ characters, mixed case, numbers, symbols
   - JWT secret: 32+ characters, random

3. **Limit PostgreSQL access**
   ```bash
   # Only localhost connections
   sudo nano /etc/postgresql/16/main/pg_hba.conf
   # Change: host    all    all    0.0.0.0/0    md5
   # To:     host    all    all    127.0.0.1/32 md5
   ```

4. **Setup firewall**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   # DO NOT expose 5432 unless necessary
   ```

5. **Regular backups**
   ```bash
   # Setup daily backup cron
   crontab -e
   # 0 2 * * * /opt/apps/dizidentmain/scripts/backup.sh
   ```

6. **Monitor logs**
   ```bash
   # Check for suspicious activity
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

---

## 📞 Quick Reference

### Essential Commands

```bash
# Check all services
docker ps
sudo systemctl status nginx
sudo systemctl status postgresql

# Deploy all clients
cd /opt/apps/dizidentmain
./scripts/deploy-vps.sh clientxyz main
./scripts/deploy-vps.sh clientabc main

# View logs
docker logs -f clientxyz-backend
docker-compose -f clientxyz/docker-compose.prod.yml logs

# Database backup
pg_dump -h localhost -U appuser clinic_hms_xyz > backup.sql

# Restart client
cd /opt/apps/dizidentmain/clientxyz
docker-compose -f docker-compose.prod.yml restart

# Stop all containers
docker stop $(docker ps -q)

# Nginx reload
sudo systemctl reload nginx
```

---

## 🎯 Performance Optimization

### Scale Backend Horizontally
```bash
# Modify docker-compose.prod.yml to use port ranges
# Then use load balancer (NginX upstream with multiple backends)
```

### Optimize PostgreSQL
```bash
# Check slow queries
sudo -u postgres psql -d clinic_hms_xyz -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Add indexes for common queries
sudo -u postgres psql -d clinic_hms_xyz -c "CREATE INDEX idx_users_email ON users(email);"
```

### Cache Strategy
- Add Redis for session/cache: `docker run -d -p 6379:6379 redis`
- Update backend to use Redis
- Configure frontend caching headers

---

## 📝 Documentation

For detailed guides see:
- [VPS_SETUP.md](VPS_SETUP.md) - Complete VPS setup from scratch
- [DEPLOY_VPS.md](DEPLOY_VPS.md) - Quick deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Step-by-step checklist
- [README.md](README.md) - Project overview

---

**Last Updated**: February 11, 2026  
**Audience**: DevOps / System Administrators
