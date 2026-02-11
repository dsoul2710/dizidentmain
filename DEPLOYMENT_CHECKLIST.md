# VPS Deployment Checklist

## 📋 Pre-Deployment (Local Machine)

- [ ] Code is committed to Git
- [ ] `.env.prod.example` files created in each client folder
- [ ] `.env.prod` files created with real credentials (NOT committed to Git!)
- [ ] `.gitignore` includes `.env.prod` and `uploads/` folders
- [ ] Docker images build successfully locally
- [ ] All tests pass
- [ ] Git remote is configured

### Commands:
```powershell
# Verify git status
git status

# Verify .env.prod files exist (not in git)
git status --ignored

# Test build locally
cd clientxyz
docker-compose up -d --build
# Check http://localhost:3001

# Stop local
docker-compose down
```

---

## 🚀 VPS Setup (Hostinger KVM)

### SSH Connection
- [ ] SSH access obtained from Hostinger control panel
- [ ] Can connect: `ssh root@dizidental.cloud`
- [ ] Root password changed

### System Updates
```bash
apt update && apt upgrade -y
```
- [ ] System updated

### Docker Installation
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker root
newgrp docker
```
- [ ] Docker installed
- [ ] Docker running: `docker --version`

### Docker Compose Installation
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```
- [ ] Docker Compose installed: `docker-compose --version`

### PostgreSQL Installation
```bash
apt install -y postgresql-16
sudo systemctl start postgresql
sudo systemctl enable postgresql
```
- [ ] PostgreSQL installed
- [ ] PostgreSQL running: `sudo systemctl status postgresql`

### Create Databases
```bash
sudo -u postgres psql <<EOF
CREATE DATABASE clinic_hms_xyz;
CREATE DATABASE clinic_hms_abc;
CREATE USER appuser WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_xyz TO appuser;
GRANT ALL PRIVILEGES ON DATABASE clinic_hms_abc TO appuser;
\c clinic_hms_xyz
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
\c clinic_hms_abc
GRANT USAGE, CREATE ON SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
EOF
```
- [ ] Databases created
- [ ] Test connection: `psql -h localhost -U appuser -d clinic_hms_xyz -c "SELECT 1;"`

### Git & Tools Installation
```bash
apt install -y git nginx certbot python3-certbot-nginx
```
- [ ] Git installed
- [ ] Nginx installed
- [ ] Certbot installed

---

## 📦 Application Deployment

### Clone Repository
```bash
mkdir -p /opt/apps
cd /opt/apps
git clone https://github.com/your-username/your-repo dizidentmain
cd dizidentmain
```
- [ ] Repository cloned
- [ ] Location: `/opt/apps/dizidentmain`

### Configure Clients
```bash
# For each client:
cp clientxyz/.env.prod.example clientxyz/.env.prod
nano clientxyz/.env.prod
# Fill in: SPRING_DATASOURCE_PASSWORD, JWT_SECRET, VITE_API_BASE
```
- [ ] `clientxyz/.env.prod` configured
- [ ] `clientabc/.env.prod` configured

### Make Scripts Executable
```bash
chmod +x scripts/*.sh
```
- [ ] Scripts made executable

### Deploy Client XYZ
```bash
./scripts/deploy-vps.sh clientxyz main
```
- [ ] Container built: `docker images | grep xyz`
- [ ] Containers running: `docker ps | grep clientxyz`
- [ ] Backend healthy: `docker logs clientxyz-backend | tail -20`
- [ ] Frontend responding: `curl -I http://127.0.0.1:3001`

### Deploy Client ABC
```bash
./scripts/deploy-vps.sh clientabc main
```
- [ ] Container built: `docker images | grep abc`
- [ ] Containers running: `docker ps | grep clientabc`
- [ ] Backend healthy: `docker logs clientabc-backend | tail -20`

---

## 🌐 Nginx Configuration

### Create Configuration
```bash
sudo tee /etc/nginx/sites-available/hms > /dev/null <<'EOF'
# Client XYZ
upstream xyz_backend { server 127.0.0.1:8081; }
upstream xyz_frontend { server 127.0.0.1:3001; }

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
    }
    
    listen 80;
}

# Client ABC
upstream abc_backend { server 127.0.0.1:8082; }
upstream abc_frontend { server 127.0.0.1:3002; }

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
    }
    
    listen 80;
}
EOF
```
- [ ] Nginx config created

### Enable Nginx Site
```bash
sudo ln -s /etc/nginx/sites-available/hms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
- [ ] Nginx config valid: `sudo nginx -t` returns `successful`
- [ ] Nginx reloaded: `sudo systemctl status nginx`

---

## 🔒 SSL Certificate Setup

### Get Certificates
```bash
sudo certbot --nginx -d xyz.dizidental.cloud -d abc.dizidental.cloud
```
- [ ] Certificates obtained
- [ ] Let's Encrypt email configured
- [ ] Auto-renewal enabled

### Verify SSL
```bash
# Test HTTPS
curl -I https://xyz.dizidental.cloud
curl -I https://abc.dizidental.cloud
```
- [ ] SSL working for xyz
- [ ] SSL working for abc

---

## 🌐 Domain Configuration (Hostinger)

### Add DNS Records
In Hostinger Control Panel → DNS Settings:

```
Type    Name    Value               TTL
A       @       your-vps-ip         3600
A       xyz     your-vps-ip         3600
A       abc     your-vps-ip         3600
```

- [ ] A record for @ (root)
- [ ] A record for xyz subdomain
- [ ] A record for abc subdomain
- [ ] DNS propagated (wait up to 24 hours, usually faster)

### Verify DNS
```bash
# From local machine
nslookup xyz.dizidental.cloud
nslookup abc.dizidental.cloud

# Should resolve to your VPS IP
```

---

## ✅ Final Verification

### Health Checks
```bash
# Check containers
docker ps

# Check logs (no errors)
docker-compose -f clientxyz/docker-compose.prod.yml logs
docker-compose -f clientabc/docker-compose.prod.yml logs

# Check database
psql -h localhost -U appuser -d clinic_hms_xyz -c "\dt"

# Check Nginx
sudo systemctl status nginx

# Test endpoints
curl https://xyz.dizidental.cloud
curl https://abc.dizidental.cloud
```

- [ ] All containers running
- [ ] No errors in logs
- [ ] Database accessible
- [ ] Nginx routing traffic
- [ ] HTTPS working

### User Acceptance Testing
- [ ] Frontend loads at xyz subdomain
- [ ] Frontend loads at abc subdomain
- [ ] API endpoints respond (check Network tab)
- [ ] Users can login
- [ ] Database queries work
- [ ] File uploads work (if applicable)

---

## 🔄 Post-Deployment

### Setup Monitoring
```bash
# Create systemd service for auto-restart
sudo tee /etc/systemd/system/docker-compose-hms.service > /dev/null <<EOF
[Unit]
Description=HMS Docker Compose Service
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/apps/dizidentmain
ExecStart=/usr/bin/docker-compose -f docker-compose.prod.yml up
Restart=unless-stopped

[Install]
WantedBy=multi-user.target
EOF
```
- [ ] Systemd service created (optional)

### Backup Strategy
```bash
# Create backup directory
mkdir -p /backups/postgres

# Setup daily backup
crontab -e
# Add: 0 2 * * * pg_dump -h localhost -U appuser clinic_hms_xyz > /backups/postgres/hms_xyz_$(date +\%Y\%m\%d).sql
```
- [ ] Backup directory created
- [ ] Backup cron job configured

### Firewall Setup (Optional)
```bash
apt install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5432/tcp  # PostgreSQL (if needed remotely)
ufw enable
```
- [ ] Firewall configured (if applicable)

---

## 📞 Ongoing Maintenance

### Weekly
- [ ] Check disk space: `df -h`
- [ ] Check Docker logs: `docker logs clientxyz-backend`
- [ ] Database size: `sudo -u postgres psql -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database;"`

### Monthly
- [ ] Review Nginx error logs: `sudo tail -100 /var/log/nginx/error.log`
- [ ] Check SSL certificate expiry: `certbot certificates`
- [ ] Docker cleanup: `docker system prune -a`

### Quarterly
- [ ] Test backup restoration
- [ ] Review security settings
- [ ] Update system packages: `apt update && apt upgrade -y`

---

## 🆘 Emergency Contacts

- Hostinger Support: https://www.hostinger.com/support
- Docker Documentation: https://docs.docker.com/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Let's Encrypt: https://letsencrypt.org/support/

---

## 📝 Important Passwords & Keys (Keep Secure!)

Save these in a secure location (password manager):

```
PostgreSQL User: appuser
PostgreSQL Password: [YOUR_SECURE_PASSWORD]
PostgreSQL Host: localhost
PostgreSQL Port: 5432

JWT Secret (XYZ): [YOUR_JWT_SECRET]
JWT Secret (ABC): [YOUR_JWT_SECRET]

VPS SSH User: root
VPS IP: [YOUR_VPS_IP]
VPS Domain: dizidental.cloud
```

⚠️ **NEVER commit `.env.prod` files to Git!**

---

## ✨ Completion

When all items are checked, you have a fully operational multi-client HMS on Hostinger KVM VPS!

Next steps:
1. Train team on how to deploy updates: see [DEPLOY_VPS.md](DEPLOY_VPS.md)
2. Setup monitoring dashboards (optional)
3. Add more clients: copy existing client structure and redeploy
4. Configure client-specific features

---

**Date Completed**: ___________
**Deployed By**: ___________
**Environment**: Production (Hostinger KVM)
