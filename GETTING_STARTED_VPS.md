# 🚀 VPS Deployment - Quick Start Summary

## Current Status ✅

Your multi-client HMS project is **ready for VPS deployment**!

### What's Done:
- ✅ Multi-client architecture with separate codebases
- ✅ Docker setup for each client (separate containers & ports)
- ✅ Production docker-compose files (`docker-compose.prod.yml`)
- ✅ Production environment templates (`.env.prod.example`)
- ✅ Automated deployment scripts (Bash & PowerShell)
- ✅ Complete VPS setup documentation
- ✅ PostgreSQL configuration (shared, multi-database)
- ✅ Nginx reverse proxy configuration
- ✅ SSL/TLS setup with Let's Encrypt
- ✅ All code committed to Git

---

## 📋 What You Need Before Starting

1. **Hostinger KVM VPS Account**
   - Domain: `dizidental.cloud`
   - VPS IP address (from Hostinger panel)
   - Root SSH access

2. **Git Repository**
   - GitHub, GitLab, or similar (with your repo)
   - Remote URL ready

3. **Secure Passwords** (keep in password manager)
   - PostgreSQL user password (20+ chars)
   - JWT secrets for each client (32+ chars)

---

## 🎯 Deployment Steps (5 Minutes)

### Step 1: Push Code to Git (Local Machine)
```powershell
# Verify everything is committed
git status

# Push to your remote repository
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

### Step 2: VPS Initial Setup (5 minutes)
```bash
# SSH to VPS
ssh root@dizidental.cloud

# Copy and paste entire script:
apt update && apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker root
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
apt install -y git postgresql-16 nginx certbot python3-certbot-nginx
sudo systemctl start postgresql && sudo systemctl enable postgresql
```

### Step 3: PostgreSQL Setup (3 minutes)
```bash
# Create databases
sudo -u postgres psql <<EOF
CREATE DATABASE clinic_hms_xyz;
CREATE DATABASE clinic_hms_abc;
CREATE USER appuser WITH PASSWORD 'your_secure_password_here';
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

### Step 4: Clone & Configure (2 minutes)
```bash
# Clone your repository
mkdir -p /opt/apps
cd /opt/apps
git clone https://github.com/your-username/your-repo.git dizidentmain
cd dizidentmain

# Configure clients
cp clientxyz/.env.prod.example clientxyz/.env.prod
cp clientabc/.env.prod.example clientabc/.env.prod

# Edit configuration (replace password with actual)
nano clientxyz/.env.prod
# SPRING_DATASOURCE_PASSWORD=your_secure_password_here
# JWT_SECRET=xyz_secret_key_32_chars_minimum_needed_okay
# VITE_API_BASE=https://xyz.dizidental.cloud/api

nano clientabc/.env.prod
# SPRING_DATASOURCE_PASSWORD=your_secure_password_here
# JWT_SECRET=abc_secret_key_32_chars_minimum_needed_okay
# VITE_API_BASE=https://abc.dizidental.cloud/api

# Make scripts executable
chmod +x scripts/*.sh
```

### Step 5: Deploy Clients (5-10 minutes)
```bash
# Deploy XYZ (takes 3-5 min with Docker build)
./scripts/deploy-vps.sh clientxyz main

# Deploy ABC (takes 3-5 min with Docker build)
./scripts/deploy-vps.sh clientabc main

# Verify running
docker ps
```

### Step 6: Nginx Setup (2 minutes)
```bash
# Create Nginx config
sudo tee /etc/nginx/sites-available/hms > /dev/null <<'EOF'
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

# Enable and test
sudo ln -s /etc/nginx/sites-available/hms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Get SSL Certificates (2 minutes)
```bash
# Get certificates for both subdomains
sudo certbot --nginx -d xyz.dizidental.cloud -d abc.dizidental.cloud

# Follow prompts:
# - Enter email
# - Accept Let's Encrypt terms
# - Enable redirect to HTTPS
```

### Step 8: Configure DNS (Hostinger Panel)
1. Go to Hostinger → Domain Manager → DNS Settings
2. Add A records:
   ```
   Type    Name    Value           TTL
   A       @       your-vps-ip     3600
   A       xyz     your-vps-ip     3600
   A       abc     your-vps-ip     3600
   ```
3. Wait for DNS propagation (usually 5 minutes, max 24 hours)

### Step 9: Verify Deployment

```bash
# Test frontend (should return HTML)
curl https://xyz.dizidental.cloud
curl https://abc.dizidental.cloud

# Test API endpoint
curl https://xyz.dizidental.cloud/api/health
curl https://abc.dizidental.cloud/api/health

# Check containers
docker ps

# Check logs
docker-compose -f clientxyz/docker-compose.prod.yml logs
```

---

## 📊 Port Mapping Reference

| Client | Frontend | Backend | Database |
|--------|----------|---------|----------|
| xyz    | 3001     | 8081    | clinic_hms_xyz |
| abc    | 3002     | 8082    | clinic_hms_abc |
| def    | 3003     | 8083    | clinic_hms_def |

All share single PostgreSQL on `localhost:5432`

---

## 🔗 Access Your Deployment

After DNS propagates (check with `nslookup xyz.dizidental.cloud`):

- **Client XYZ Frontend**: https://xyz.dizidental.cloud
- **Client XYZ API**: https://xyz.dizidental.cloud/api
- **Client ABC Frontend**: https://abc.dizidental.cloud
- **Client ABC API**: https://abc.dizidental.cloud/api

---

## 📚 Documentation Files

Read these for more details:

1. **[VPS_SETUP.md](VPS_SETUP.md)** - Detailed VPS setup from scratch
2. **[DEPLOY_VPS.md](DEPLOY_VPS.md)** - Quick deployment reference
3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Complete step-by-step checklist
4. **[MULTI_CLIENT_GUIDE.md](MULTI_CLIENT_GUIDE.md)** - Managing multiple clients
5. **[STRUCTURE.md](STRUCTURE.md)** - Architecture overview

---

## 🔄 Future Deployments

After initial setup, redeploying is simple:

```bash
# On your local machine
git add .
git commit -m "Your changes"
git push origin main

# On VPS
cd /opt/apps/dizidentmain
git pull origin main
./scripts/deploy-vps.sh clientxyz main    # Just your changes build & deploy
```

---

## 🆘 Troubleshooting

### Docker can't connect to PostgreSQL
```bash
# In docker-compose.prod.yml, use:
SPRING_DATASOURCE_URL: jdbc:postgresql://host.docker.internal:5432/clinic_hms_xyz
```

### DNS not resolving
```bash
# Check DNS from local machine
nslookup xyz.dizidental.cloud

# Wait 24 hours for propagation
# Or check propagation: https://mxtoolbox.com/
```

### Container keeps restarting
```bash
# Check logs
docker logs clientxyz-backend

# Verify .env.prod has correct passwords
cat /opt/apps/dizidentmain/clientxyz/.env.prod

# Test database connection
docker exec clientxyz-backend bash -c 'nc -zv host.docker.internal 5432'
```

### SSL certificate issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew --force-renewal
```

See [MULTI_CLIENT_GUIDE.md](MULTI_CLIENT_GUIDE.md) for more troubleshooting.

---

## ✅ Checklist

Complete deployment checklist available in [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

- [ ] Code pushed to Git
- [ ] VPS system updated
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] PostgreSQL installed
- [ ] Databases created
- [ ] Repository cloned on VPS
- [ ] .env.prod files configured
- [ ] Clients deployed
- [ ] Nginx configured
- [ ] SSL certificates obtained
- [ ] DNS records added
- [ ] DNS propagated
- [ ] Frontend accessible
- [ ] API responding

---

## 🎯 Next Steps

1. **Configure Git Remote** (before pushing):
   ```powershell
   git remote add origin https://github.com/your-username/your-repo.git
   ```

2. **Push Code to Git** first, then SSH to VPS and start deployment

3. **Test Everything** by accessing the URLs in your browser

4. **Train Your Team** on how to deploy updates using the scripts

5. **Setup Monitoring** (optional) - consider UptimeRobot, DataDog, etc.

6. **Add More Clients** - copy existing client folder and repeat deployment steps

---

## 📞 Support & Resources

- Docker Documentation: https://docs.docker.com/
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Let's Encrypt Guide: https://letsencrypt.org/
- Hostinger Support: https://www.hostinger.com/support

---

## Key Credentials (Keep Secure!)

**⚠️ SAVE THESE IN A PASSWORD MANAGER!**

```
PostgreSQL:
  Host: localhost
  Port: 5432
  User: appuser
  Password: [YOUR_SECURE_PASSWORD]

Databases:
  - clinic_hms_xyz
  - clinic_hms_abc

VPS SSH:
  Host: dizidental.cloud
  User: root
  Password: [YOUR_VPS_PASSWORD]

JWT Secrets:
  XYZ: [YOUR_JWT_SECRET_XYZ]
  ABC: [YOUR_JWT_SECRET_ABC]

API Base URLs:
  XYZ: https://xyz.dizidental.cloud/api
  ABC: https://abc.dizidental.cloud/api
```

---

**Status**: ✅ Ready for Deployment  
**Last Updated**: February 11, 2026  
**Architecture**: Multi-client with shared PostgreSQL on Hostinger KVM VPS
