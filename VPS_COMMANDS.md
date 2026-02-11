# VPS Commands - Quick Deployment

## 🚀 Execute these commands on your VPS

### 1. SSH into VPS
```bash
ssh root@72.61.171.38
# Or if DNS is configured: ssh root@dizidental.cloud
```

### 2. Pull Latest Code
```bash
cd /opt/apps/dizidentmain
git pull origin master
```

### 3. Check .env.prod Files
```bash
# Verify files exist and have correct domain
cat clientxyz/.env.prod | grep VITE_API_BASE
cat clientabc/.env.prod | grep VITE_API_BASE

# Should show:
# VITE_API_BASE=https://xyz.dizidental.cloud/api
# VITE_API_BASE=https://abc.dizidental.cloud/api
```

### 4. Update Nginx Configuration
```bash
# Create/update Nginx config for new domain
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
    server_name xyz.dizidental.cloud;
    
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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    server_name abc.dizidental.cloud;
    
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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Save and test:**
```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. Deploy Containers
```bash
# Deploy Client XYZ
cd /opt/apps/dizidentmain
./scripts/deploy-vps.sh clientxyz master

# Wait for deployment to complete, then deploy Client ABC
./scripts/deploy-vps.sh clientabc master
```

### 6. Verify Deployment
```bash
# Check running containers
docker ps

# Check logs for Client XYZ
docker logs clientxyz-frontend
docker logs clientxyz-backend

# Check logs for Client ABC
docker logs clientabc-frontend
docker logs clientabc-backend
```

### 7. Test Access (Before DNS)
```bash
# Test with IP address
curl -I http://72.61.171.38:3001  # XYZ frontend
curl -I http://72.61.171.38:3002  # ABC frontend
curl http://72.61.171.38:8081/api/health  # XYZ API
curl http://72.61.171.38:8082/api/health  # ABC API
```

---

## 🌐 DNS Configuration

### Configure DNS in Hostinger (or your DNS provider)

**Add these A Records for dizidental.cloud:**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | 72.61.171.38 | 3600 |
| A | xyz | 72.61.171.38 | 3600 |
| A | abc | 72.61.171.38 | 3600 |
| A | www | 72.61.171.38 | 3600 |

**Check DNS Propagation:**
```bash
nslookup dizidental.cloud
nslookup xyz.dizidental.cloud
nslookup abc.dizidental.cloud
```

---

## 🔒 SSL Certificate Setup

### After DNS propagates (wait 5-15 minutes), install SSL:

```bash
# Install certificates for all subdomains
sudo certbot --nginx -d dizidental.cloud -d xyz.dizidental.cloud -d abc.dizidental.cloud

# Follow prompts:
# 1. Enter email address
# 2. Agree to terms
# 3. Choose to redirect HTTP to HTTPS (option 2)
```

**Test Auto-Renewal:**
```bash
sudo certbot renew --dry-run
```

---

## ✅ Final Verification

### Test HTTPS Access
```bash
# Should return 200 OK
curl -I https://xyz.dizidental.cloud
curl -I https://abc.dizidental.cloud

# Test API endpoints
curl https://xyz.dizidental.cloud/api/health
curl https://abc.dizidental.cloud/api/health
```

### Access in Browser
- **Client XYZ:** https://xyz.dizidental.cloud
- **Client ABC:** https://abc.dizidental.cloud

---

## 🔧 Troubleshooting

### If containers not starting:
```bash
docker ps -a
docker logs <container-name>
docker-compose -f clientxyz/docker-compose.prod.yml down
docker-compose -f clientxyz/docker-compose.prod.yml up -d
```

### If Nginx errors:
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### If PostgreSQL connection issues:
```bash
sudo -u postgres psql
\l  # List databases
\c clinic_hms_xyz  # Connect to database
\dt  # List tables
```

### Reset deployment:
```bash
# Stop all containers
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# Prune everything
docker system prune -a -f

# Redeploy
./scripts/deploy-vps.sh clientxyz master
./scripts/deploy-vps.sh clientabc master
```

---

## 📊 Monitoring

### View real-time logs:
```bash
# XYZ Client
docker logs -f clientxyz-frontend
docker logs -f clientxyz-backend

# ABC Client
docker logs -f clientabc-frontend
docker logs -f clientabc-backend
```

### Check resource usage:
```bash
docker stats
htop
df -h
```

---

## 🎯 Quick Reference

**VPS IP:** 72.61.171.38  
**Domain:** dizidental.cloud  
**PostgreSQL:** localhost:5432 (user: appuser, password: 9932)  
**Databases:** clinic_hms_xyz, clinic_hms_abc  

**Client XYZ:**
- Frontend: https://xyz.dizidental.cloud (port 3001)
- Backend: https://xyz.dizidental.cloud/api (port 8081)

**Client ABC:**
- Frontend: https://abc.dizidental.cloud (port 3002)
- Backend: https://abc.dizidental.cloud/api (port 8082)
