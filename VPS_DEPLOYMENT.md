# VPS Deployment Guide - Hostinger KVM

Step-by-step guide to deploy Dizident multi-client HMS on Hostinger VPS.

## 📋 Prerequisites

- Hostinger KVM VPS (minimum 2GB RAM, 2 CPU cores)
- Root/sudo access
- Domain names pointing to VPS IP (optional but recommended)

## 🚀 Initial VPS Setup

### 1. Connect to VPS

```bash
ssh root@your-vps-ip
```

### 2. Update System

```bash
apt update && apt upgrade -y
```

### 3. Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Install Git
apt install -y git

# Install other utilities
apt install -y curl wget nano htop
```

### 4. Create App Directory

```bash
mkdir -p /opt/apps
cd /opt/apps
```

## 📦 Deploy Application

### 1. Clone Repository

```bash
cd /opt/apps
git clone https://github.com/yourusername/dizidentmain.git
cd dizidentmain
```

### 2. Configure Environment Variables

**Important:** Update sensitive credentials before deployment!

```bash
# Edit clientxyz configuration
nano clients/clientxyz/config/backend.env
# Update:
# - SPRING_DATASOURCE_PASSWORD
# - JWT_SECRET (use a strong random string)

nano clients/clientxyz/config/frontend.env
# Update:
# - VITE_API_BASE (use your domain or VPS IP)

# Repeat for clientabc and other clients
```

**Generate secure JWT secret:**
```bash
# Generate 64-character random string
openssl rand -base64 64 | tr -d '\n'
```

### 3. Make Scripts Executable

```bash
chmod +x scripts/*.sh
```

### 4. Deploy All Clients

```bash
./scripts/deploy-all.sh
```

**Or deploy individual client:**
```bash
./scripts/deploy-client.sh clientxyz
```

### 5. Verify Deployment

```bash
# Check running containers
docker ps

# Check logs
docker logs clientxyz-backend
docker logs clientxyz-frontend
docker logs clientxyz-postgres

# Check health
curl http://localhost:8081/actuator/health
curl http://localhost:3001/health
```

## 🌐 Domain Setup (Optional but Recommended)

### 1. Point Domains to VPS

In your domain registrar/DNS settings:

```
A Record: xyz.yourdomain.com → your-vps-ip
A Record: abc.yourdomain.com → your-vps-ip
```

### 2. Install Nginx as Reverse Proxy

```bash
apt install -y nginx

# Stop Apache if running
systemctl stop apache2
systemctl disable apache2

# Enable and start Nginx
systemctl enable nginx
systemctl start nginx
```

### 3. Configure Nginx for Each Client

**Client XYZ:**
```bash
nano /etc/nginx/sites-available/clientxyz
```

```nginx
server {
    listen 80;
    server_name xyz.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support for chat
    location /ws {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Enable site:**
```bash
ln -s /etc/nginx/sites-available/clientxyz /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

**Repeat for Client ABC** (change ports and domain)

### 4. Setup SSL with Let's Encrypt

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate for each domain
certbot --nginx -d xyz.yourdomain.com
certbot --nginx -d abc.yourdomain.com

# Auto-renewal (already configured by certbot)
systemctl status certbot.timer
```

## 🔐 Security Hardening

### 1. Setup Firewall

```bash
# Install UFW
apt install -y ufw

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

# Enable firewall
ufw enable
ufw status
```

### 2. Disable Root SSH Login

```bash
# Create non-root user
adduser deployer
usermod -aG sudo deployer
usermod -aG docker deployer

# Copy SSH keys
mkdir -p /home/deployer/.ssh
cp ~/.ssh/authorized_keys /home/deployer/.ssh/
chown -R deployer:deployer /home/deployer/.ssh
chmod 700 /home/deployer/.ssh
chmod 600 /home/deployer/.ssh/authorized_keys

# Disable root login
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd

# Test login as deployer before closing root session!
```

### 3. Setup Fail2Ban

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### 4. Update Production Environment Variables

```bash
# Use strong passwords for PostgreSQL
nano clients/clientxyz/config/backend.env
# Change SPRING_DATASOURCE_PASSWORD

# Update docker-compose.yml
nano clients/clientxyz/docker-compose.yml
# Update POSTGRES_PASSWORD environment variable

# Rebuild with new passwords
cd /opt/apps/dizidentmain
./scripts/deploy-client.sh clientxyz
```

## 🔄 Auto-start on Reboot

### Option 1: Systemd Service (Recommended)

Create service file:
```bash
nano /etc/systemd/system/dizident-clientxyz.service
```

```ini
[Unit]
Description=Dizident Client XYZ
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/apps/dizidentmain/clients/clientxyz
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
systemctl daemon-reload
systemctl enable dizident-clientxyz
systemctl start dizident-clientxyz
systemctl status dizident-clientxyz
```

Repeat for other clients.

### Option 2: Crontab

```bash
crontab -e
```

Add line:
```bash
@reboot cd /opt/apps/dizidentmain && ./scripts/deploy-all.sh
```

## 📊 Monitoring & Maintenance

### Check Resource Usage

```bash
# System resources
htop

# Disk usage
df -h

# Docker stats
docker stats

# Logs size
du -sh clients/*/logs/
```

### Backup Strategy

Create backup script:
```bash
nano /opt/scripts/backup-dizident.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/dizident"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup databases
for CLIENT in clientxyz clientabc; do
    docker exec ${CLIENT}-postgres pg_dump -U postgres clinic_hms_${CLIENT} | gzip > $BACKUP_DIR/${CLIENT}_db_$DATE.sql.gz
done

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/apps/dizidentmain/clients/*/uploads/

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:
```bash
chmod +x /opt/scripts/backup-dizident.sh
crontab -e
# Add: 0 2 * * * /opt/scripts/backup-dizident.sh
```

### Update Application

```bash
cd /opt/apps/dizidentmain

# Pull latest code
git pull origin main

# Redeploy clients
./scripts/deploy-all.sh

# Or individual client
./scripts/deploy-client.sh clientxyz
```

## 🐛 Troubleshooting

### Check Logs

```bash
# All containers
docker ps -a

# Specific container logs
docker logs clientxyz-backend -f
docker logs clientxyz-postgres -f

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
# Restart client
cd /opt/apps/dizidentmain/clients/clientxyz
docker-compose restart

# Or specific service
docker-compose restart backend-xyz

# Full redeploy
docker-compose down
docker-compose up -d --build
```

### Database Issues

```bash
# Connect to PostgreSQL
docker exec -it clientxyz-postgres psql -U postgres -d clinic_hms_xyz

# Check connections
\conninfo
\dt

# View users table
SELECT * FROM users;

# Exit
\q
```

### Free Up Space

```bash
# Remove unused Docker images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove stopped containers
docker container prune

# Check disk usage
df -h
du -sh /var/lib/docker
```

### Performance Tuning

**PostgreSQL:**
```bash
# Edit PostgreSQL config in docker-compose.yml
nano clients/clientxyz/docker-compose.yml
```

Add to postgres service:
```yaml
command:
  - "postgres"
  - "-c"
  - "shared_buffers=256MB"
  - "-c"
  - "max_connections=200"
```

**Java Heap Size:**
```bash
nano clients/clientxyz/docker-compose.yml
```

Add to backend service environment:
```yaml
environment:
  JAVA_OPTS: "-Xms512m -Xmx1024m"
```

## 📞 Common Port Mapping

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| XYZ Frontend | 80 | 3001 |
| XYZ Backend | 8081 | 8081 |
| XYZ Database | 5432 | 5433 |
| ABC Frontend | 80 | 3002 |
| ABC Backend | 8082 | 8082 |
| ABC Database | 5432 | 5434 |

## ✅ Deployment Checklist

- [ ] VPS provisioned and accessible via SSH
- [ ] Docker and Docker Compose installed
- [ ] Git repository cloned to /opt/apps
- [ ] Environment variables updated (passwords, secrets)
- [ ] JWT secrets generated and configured
- [ ] All clients deployed successfully
- [ ] Health checks passing
- [ ] Domains pointed to VPS IP
- [ ] Nginx reverse proxy configured
- [ ] SSL certificates obtained (Let's Encrypt)
- [ ] Firewall configured (UFW)
- [ ] Auto-start configured (systemd/crontab)
- [ ] Backup script created and scheduled
- [ ] Monitoring setup (optional: Prometheus, Grafana)
- [ ] Documentation updated with actual credentials (secure location)

## 📧 Support

For issues, contact your DevOps team or refer to the main README.md
