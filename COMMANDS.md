# Commands Cheat Sheet

Quick reference for common commands.

## 🐳 Docker Commands

### Deploy
```bash
# Deploy single client
./scripts/deploy-client.sh clientxyz
.\scripts\deploy-client.ps1 clientxyz    # Windows

# Deploy all clients
./scripts/deploy-all.sh
.\scripts\deploy-all.ps1                 # Windows

# Manual deploy (from client directory)
cd clients/clientxyz
docker-compose up -d --build
```

### Manage
```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# Stop client
cd clients/clientxyz
docker-compose down

# Restart client
docker-compose restart

# Restart specific service
docker-compose restart backend-xyz
```

### Logs
```bash
# View all logs
cd clients/clientxyz
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend-xyz
docker-compose logs -f frontend-xyz
docker-compose logs -f postgres-xyz

# Last 100 lines
docker-compose logs --tail=100 backend-xyz
```

### Cleanup
```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Remove unused volumes (⚠️ deletes data)
docker volume prune

# Full cleanup
docker system prune -a --volumes
```

### Troubleshooting
```bash
# Enter container shell
docker exec -it clientxyz-backend bash
docker exec -it clientxyz-postgres psql -U postgres

# Copy files from container
docker cp clientxyz-backend:/app/logs/app.log ./local-logs/

# Check container stats
docker stats

# Inspect container
docker inspect clientxyz-backend
```

## 📦 Git Commands

### Basic Workflow
```bash
# Check status
git status

# Add files
git add .
git add specific-file.txt

# Commit
git commit -m "Your message here"

# Push to remote
git push
git push origin main

# Pull latest
git pull
git pull origin main
```

### Branches
```bash
# Create and switch to new branch
git checkout -b feature/new-feature

# Switch branches
git checkout main
git checkout develop

# List branches
git branch
git branch -a    # Include remote branches

# Delete branch
git branch -d feature/old-feature
```

### Collaboration
```bash
# Clone repository
git clone https://github.com/username/dizidentmain.git

# Add remote
git remote add origin <url>

# View remotes
git remote -v

# Fetch changes (don't apply)
git fetch

# Pull changes (fetch + merge)
git pull
```

### Undo Changes
```bash
# Discard changes to file
git checkout -- filename.txt

# Unstage file
git reset HEAD filename.txt

# Undo last commit (keep changes)
git reset HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Stash changes temporarily
git stash
git stash pop
```

## 🔧 Backend (Spring Boot)

### Local Development
```bash
# Run backend
cd backend
./gradlew bootRun              # Linux/Mac
.\gradlew.bat bootRun          # Windows

# Build JAR
./gradlew build

# Run tests
./gradlew test

# Clean build
./gradlew clean build
```

### Gradle
```bash
# List tasks
./gradlew tasks

# Check dependencies
./gradlew dependencies

# Refresh dependencies
./gradlew --refresh-dependencies
```

## ⚛️ Frontend (React + Vite)

### Local Development
```bash
# Install dependencies
cd frontend
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Package Management
```bash
# Install package
npm install package-name

# Install dev dependency
npm install -D package-name

# Update packages
npm update

# Check outdated packages
npm outdated

# Clean install
rm -rf node_modules package-lock.json
npm install
```

## 🗄️ Database (PostgreSQL)

### Docker PostgreSQL
```bash
# Connect to database
docker exec -it clientxyz-postgres psql -U postgres -d clinic_hms_xyz

# List databases
\l

# Connect to database
\c clinic_hms_xyz

# List tables
\dt

# Describe table
\d users

# Query
SELECT * FROM users;

# Exit
\q
```

### Backup & Restore
```bash
# Backup database
docker exec clientxyz-postgres pg_dump -U postgres clinic_hms_xyz > backup.sql

# Backup with compression
docker exec clientxyz-postgres pg_dump -U postgres clinic_hms_xyz | gzip > backup.sql.gz

# Restore database
docker exec -i clientxyz-postgres psql -U postgres clinic_hms_xyz < backup.sql

# Restore from compressed
gunzip < backup.sql.gz | docker exec -i clientxyz-postgres psql -U postgres clinic_hms_xyz
```

## 🌐 VPS/Server Management

### SSH
```bash
# Connect to VPS
ssh user@your-vps-ip
ssh -i ~/.ssh/key.pem user@your-vps-ip

# Copy files to VPS
scp local-file.txt user@vps:/remote/path/
scp -r local-folder user@vps:/remote/path/

# Copy files from VPS
scp user@vps:/remote/file.txt ./local-path/
```

### System Management
```bash
# Check disk usage
df -h
du -sh /opt/apps/dizidentmain

# Check memory
free -m

# Check CPU
htop
top

# Check processes
ps aux | grep java
ps aux | grep nginx

# Check open ports
netstat -tulpn
lsof -i :8081
```

### Nginx
```bash
# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo nginx -s reload

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Systemd Services
```bash
# Start service
sudo systemctl start dizident-clientxyz

# Stop service
sudo systemctl stop dizident-clientxyz

# Restart service
sudo systemctl restart dizident-clientxyz

# Enable on boot
sudo systemctl enable dizident-clientxyz

# Check status
sudo systemctl status dizident-clientxyz

# View logs
sudo journalctl -u dizident-clientxyz -f
```

## 🔥 Firewall (UFW)

```bash
# Check status
sudo ufw status

# Enable firewall
sudo ufw enable

# Disable firewall
sudo ufw disable

# Allow port
sudo ufw allow 8081
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Deny port
sudo ufw deny 8081

# Delete rule
sudo ufw delete allow 8081

# Reset firewall
sudo ufw reset
```

## 📊 Monitoring

### Resource Usage
```bash
# Docker stats (real-time)
docker stats

# Specific container
docker stats clientxyz-backend

# Disk usage by containers
docker system df

# Detailed view
docker system df -v
```

### Application Logs
```bash
# Spring Boot logs
docker logs clientxyz-backend -f
docker logs clientxyz-backend --tail=100

# Nginx access logs
docker exec clientxyz-frontend tail -f /var/log/nginx/access.log

# PostgreSQL logs
docker logs clientxyz-postgres -f
```

### Health Checks
```bash
# Backend health
curl http://localhost:8081/actuator/health

# Frontend health
curl http://localhost:3001/health

# Check all client containers
docker ps --filter "name=client" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 🚨 Emergency Commands

### Kill Process by Port
```bash
# Linux
sudo lsof -i :8081
sudo kill -9 <PID>

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

### Force Stop Docker
```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove all containers
docker rm $(docker ps -aq)

# Nuclear option (removes everything)
docker system prune -a --volumes
```

### Restore from Backup
```bash
# Stop client
cd clients/clientxyz
docker-compose down

# Restore database
gunzip < backup.sql.gz | docker exec -i clientxyz-postgres psql -U postgres clinic_hms_xyz

# Restore uploads
tar -xzf uploads_backup.tar.gz -C clients/clientxyz/

# Restart
docker-compose up -d
```

## 🎯 Quick Deployment

### First Time Setup
```bash
# On VPS
cd /opt/apps
git clone <repo-url> dizidentmain
cd dizidentmain
chmod +x scripts/*.sh

# Update configs
nano clients/clientxyz/config/backend.env
nano clients/clientxyz/config/frontend.env

# Deploy
./scripts/deploy-all.sh
```

### Update and Redeploy
```bash
# Pull latest code
cd /opt/apps/dizidentmain
git pull

# Redeploy
./scripts/deploy-all.sh

# Or specific client
./scripts/deploy-client.sh clientxyz
```

## 📝 Notes

- Replace `clientxyz` with your actual client name
- Use `sudo` for system commands on Linux
- Always backup before major changes
- Test locally before deploying to production
- Check logs if something doesn't work

---

**Need more help?** See [README.md](README.md) or [QUICKSTART.md](QUICKSTART.md)
