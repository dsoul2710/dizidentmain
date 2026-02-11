# Dizident Multi-Client Dental HMS

**Separate Codebases Architecture** - Each client has independent code for maximum customization.

## 🏗️ Structure

```
dizidentmain/
├── clientxyz/           # Client XYZ
│   ├── backend/         # Spring Boot app
│   ├── frontend/        # React + Vite
│   ├── docker-compose.yml
│   ├── .env             # Credentials
│   └── uploads/
├── clientabc/           # Client ABC (same structure)
├── backend/             # Template for new clients
├── frontend/            # Template for new clients
└── scripts/             # Deployment tools
```

## ✨ Key Benefits

✅ **Full Independence** - Each client = separate codebase  
✅ **Custom Features** - Client-specific modifications  
✅ **Different Domains** - Unique domain per client  
✅ **Custom Branding** - Modify UI/UX independently  
✅ **Isolated Data** - Separate databases  

## 🚀 Quick Start

### 1. Setup Credentials

```powershell
cd clientxyz
copy .env.example .env
notepad .env  # Update DB_PASSWORD, JWT_SECRET, VITE_API_BASE
```

### 2. Deploy

```powershell
# Windows
.\scripts\deploy-client.ps1 clientxyz

# Linux
./scripts/deploy-client.sh clientxyz
```

### 3. Access

| Client | Frontend | Backend | Database |
|--------|----------|---------|----------|
| clientxyz | :3001 | :8081 | :5433 |
| clientabc | :3002 | :8082 | :5434 |

## 🎨 Add New Client

```powershell
# Copy existing client
Copy-Item clientxyz clientnew -Recurse
cd clientnew

# Update .env (passwords, secrets, domain)
# Update docker-compose.yml (ports, container names)

# Deploy
.\scripts\deploy-client.ps1 clientnew
```

## 🔧 Management

```powershell
# Deploy all
.\scripts\deploy-all.ps1

# View logs
cd clientxyz
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## 🌐 Production (Domains)

### 1. Update .env
```env
VITE_API_BASE=https://xyz.yourdomain.com
```

### 2. Nginx Reverse Proxy
```nginx
server {
    server_name xyz.yourdomain.com;
    location / { proxy_pass http://localhost:3001; }
    location /api { proxy_pass http://localhost:8081; }
}
```

### 3. SSL
```bash
certbot --nginx -d xyz.yourdomain.com
```

## 🎯 Customization

**Backend**: Modify `clientxyz/backend/src/`
- Custom controllers, services, entities
- Client-specific business logic

**Frontend**: Modify `clientxyz/frontend/src/`  
- Custom branding, components, pages
- Different UI/UX per client
- Custom image generation logic

## 📦 Git Usage

```bash
# Initial setup
git init
git add .
git commit -m "Multi-client HMS"
git push

# Update specific client
git add clientxyz/
git commit -m "Feature: Custom report for XYZ"
git push

# On VPS: pull and redeploy
git pull
cd clientxyz && docker-compose up -d --build
```

## 🔒 Security

- Use strong, unique passwords per client
- Generate JWT secrets: `openssl rand -base64 64`
- `.env` files are git-ignored (credentials safe)
- Enable HTTPS in production
- Regular backups

## 📚 Full Documentation

- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup
- [STRUCTURE.md](STRUCTURE.md) - Architecture details
- [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md) - Production deployment
- [GIT_SETUP.md](GIT_SETUP.md) - Git workflow
- [COMMANDS.md](COMMANDS.md) - Command reference

## 🐛 Troubleshooting

```powershell
# View logs
cd clientxyz
docker-compose logs

# Reset client
docker-compose down -v
docker-compose up -d --build

# Check ports
netstat -ano | findstr :3001
```

## ✅ Ready to Deploy!

Each client is a complete, independent application. Customize freely without affecting other clients.

---

**Last Updated**: February 11, 2026
