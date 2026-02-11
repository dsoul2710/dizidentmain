# Project Structure - Separate Codebases Architecture

## 📁 Complete Directory Structure

```
dizidentmain/
│
├── 📂 clientxyz/                    # Client XYZ - Complete Independent Application
│   ├── backend/                     # Spring Boot application
│   │   ├── src/main/
│   │   │   ├── java/com/clinic/hms/
│   │   │   │   ├── controller/
│   │   │   │   ├── service/
│   │   │   │   ├── repository/
│   │   │   │   ├── entity/
│   │   │   │   ├── dto/
│   │   │   │   ├── security/
│   │   │   │   └── config/
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   ├── build.gradle
│   │   ├── Dockerfile
│   │   └── gradlew / gradlew.bat
│   │
│   ├── frontend/                    # React + Vite application
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── api/
│   │   │   ├── utils/
│   │   │   ├── App.jsx
│   │   │   ├── main.jsx
│   │   │   └── config.js
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   │
│   ├── docker-compose.yml           # Container orchestration
│   ├── init-db.sql                  # Database initialization
│   ├── .env.example                 # Environment template
│   ├── .env                         # Actual credentials (git-ignored)
│   └── uploads/                     # File uploads (git-ignored)
│
├── 📂 clientabc/                    # Client ABC - Identical structure
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.yml
│   ├── init-db.sql
│   ├── .env.example
│   └── uploads/
│
├── 📂 backend/                      # Template for creating new clients
│   └── (complete Spring Boot code)
│
├── 📂 frontend/                     # Template for creating new clients
│   └── (complete React code)
│
├── 📂 scripts/                      # Deployment automation
│   ├── deploy-client.sh             # Deploy single client (Linux)
│   ├── deploy-all.sh                # Deploy all clients (Linux)
│   ├── deploy-client.ps1            # Deploy single client (Windows)
│   ├── deploy-all.ps1               # Deploy all clients (Windows)
│   ├── stop-client.sh               # Stop client
│   └── logs-client.sh               # View logs
│
├── 📄 .gitignore                    # Git ignore rules
├── 📄 README.md                     # Main documentation
├── 📄 QUICKSTART.md                 # Quick start guide
├── 📄 STRUCTURE.md                  # This file
├── 📄 VPS_DEPLOYMENT.md             # Production deployment
├── 📄 GIT_SETUP.md                  # Git workflow
└── 📄 COMMANDS.md                   # Command reference
```

## 🎯 Architecture Principles

### 1. Complete Independence

Each client folder is a **fully independent application**:
- Own backend codebase
- Own frontend codebase
- Own database
- Own Docker containers
- Own configuration
- Own deployments

### 2. Customization Freedom

```
Client XYZ Features:
- Custom appointment workflow
- Special billing rules
- Unique branding
- Custom reports

Client ABC Features:
- Different patient flow
- Modified UI/UX
- Different pricing model
- Custom integrations
```

**No conflict between clients!** Each can evolve independently.

### 3. Isolated Data

```
┌─────────────────────────────┐
│ Client XYZ (Port 3001)      │
├─────────────────────────────┤
│ Frontend (clientxyz-frontend)│
│ Backend (clientxyz-backend)  │
│ Database (clinic_hms_xyz)    │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Client ABC (Port 3002)      │
├─────────────────────────────┤
│ Frontend (clientabc-frontend)│
│ Backend (clientabc-backend)  │
│ Database (clinic_hms_abc)    │
└─────────────────────────────┘
```

No shared resources = complete isolation.

## 🔧 How It Works

### Docker Compose Per Client

Each client has its own `docker-compose.yml`:

```yaml
services:
  postgres:     # Isolated database
  backend:      # Independent Spring Boot
  frontend:     # Separate React app
```

### Environment Configuration

Each client has `.env` file:

```env
# clientxyz/.env
DB_PASSWORD=xyz_password
JWT_SECRET=xyz_secret
VITE_API_BASE=https://xyz.domain.com

# clientabc/.env
DB_PASSWORD=abc_password
JWT_SECRET=abc_secret
VITE_API_BASE=https://abc.domain.com
```

### Port Allocation

| Client | Frontend | Backend | Database |
|--------|----------|---------|----------|
| xyz    | 3001     | 8081    | 5433     |
| abc    | 3002     | 8082    | 5434     |
| new    | 3003     | 8083    | 5435     |

Formula: Base port + client number

## 🚀 Workflows

### Creating New Client

```bash
# Step 1: Copy existing client
cp -r clientxyz clientnew

# Step 2: Update clientnew/.env
DB_PASSWORD=new_password
JWT_SECRET=new_secret
VITE_API_BASE=http://localhost:8083

# Step 3: Update clientnew/docker-compose.yml
# - Container names: clientnew-*
# - Ports: 3003:80, 8083:8080, 5435:5432
# - Database: clinic_hms_new

# Step 4: Deploy
./scripts/deploy-client.sh clientnew
```

### Updating Specific Client

```bash
# Make changes to clientxyz/backend/src/ or clientxyz/frontend/src/
cd clientxyz

# Test locally
docker-compose up -d --build

# Commit to Git
git add clientxyz/
git commit -m "XYZ: Add custom feature"
git push

# Deploy to production
ssh vps
cd /opt/apps/dizidentmain/clientxyz
git pull
docker-compose up -d --build
```

### Sharing Code Between Clients (Manual)

```bash
# Developer decides to share a feature
# Copy specific files/components from one client to another

cp clientxyz/backend/src/.../CustomController.java \
   clientabc/backend/src/.../CustomController.java

# Test in clientabc
cd clientabc
docker-compose up -d --build
```

**Note**: Sharing is manual and intentional. No automated coupling.

## 🎨 Customization Examples

### 1. Different Branding

**Client XYZ:**
```css
/* clientxyz/frontend/src/assets/css/style.css */
:root {
  --primary-color: #4f83ff;
  --logo: url('/logo-xyz.png');
}
```

**Client ABC:**
```css
/* clientabc/frontend/src/assets/css/style.css */
:root {
  --primary-color: #f59e0b;
  --logo: url('/logo-abc.png');
}
```

### 2. Custom Features

**Client XYZ Only:**
```java
// clientxyz/backend/.../controller/CustomReportController.java
@RestController
@RequestMapping("/api/xyz-custom-reports")
public class CustomReportController {
    // XYZ-specific reporting logic
}
```

**Client ABC doesn't have this** - completely independent.

### 3. Different Image Generation

**Client XYZ:**
```jsx
// clientxyz/frontend/src/components/ImageGenerator.jsx
export function generatePrescription(data) {
  // XYZ-specific template
  // Custom watermark
  // Different layout
}
```

**Client ABC:**
```jsx
// clientabc/frontend/src/components/ImageGenerator.jsx
export function generatePrescription(data) {
  // ABC-specific template
  // Different watermark
  // Unique design
}
```

## 📦 Git Repository Structure

```
main branch
├── clientxyz/
├── clientabc/
├── clientdef/
├── backend/ (template)
├── frontend/ (template)
└── scripts/

# Optional: Client-specific branches
├── branch: client/xyz
├── branch: client/abc
└── branch: client/def
```

## 🔄 Deployment Flow

```
Development            Production
───────────            ──────────

clientxyz/            VPS: /opt/apps/dizidentmain/clientxyz/
├── Edit code    →    ├── git pull
├── Test local   →    ├── docker-compose up -d --build
└── git push     →    └── Running on xyz.domain.com

clientabc/            VPS: /opt/apps/dizidentmain/clientabc/
├── Edit code    →    ├── git pull
├── Test local   →    ├── docker-compose up -d --build
└── git push     →    └── Running on abc.domain.com
```

## ✅ Advantages

✅ **Full Control** - Modify anything per client  
✅ **No Conflicts** - Changes don't affect others  
✅ **Easy Testing** - Test one client without risk  
✅ **Flexible Versioning** - Different versions per client  
✅ **Custom Integrations** - Client-specific APIs  
✅ **Independent Scaling** - Scale clients individually  

## ⚠️ Considerations

⚠️ **Code Duplication** - Similar code in multiple places  
⚠️ **Manual Sharing** - Copy features between clients manually  
⚠️ **More Maintenance** - Update each client separately  
⚠️ **Disk Space** - Multiple copies of code  

**Trade-off**: Flexibility vs Efficiency

## 🆚 Alternative: Shared Codebase

If you prefer shared code with client configs, see `docker/` and `clients/` directories for the alternate architecture.

**This Architecture**: Maximum flexibility, complete independence  
**Shared Architecture**: Easier updates, less duplication

Choose based on your needs!

## 📊 Comparison

| Aspect | Separate Codebases | Shared Codebase |
|--------|-------------------|-----------------|
| Customization | ⭐⭐⭐⭐⭐ Full | ⭐⭐⭐ Limited |
| Maintenance | ⭐⭐ More work | ⭐⭐⭐⭐⭐ Easy |
| Updates | Manual per client | One update → all |
| Disk Space | More | Less |
| Flexibility | Maximum | Moderate |
| Risk | Isolated | Shared |

## 🎯 Use This Architecture When:

- ✅ Clients need very different features
- ✅ Custom workflows per client
- ✅ Different UI/UX requirements
- ✅ Independent evolution expected
- ✅ Clients managed by different teams
- ✅ Different release schedules

## 🚀 Ready to Go!

Your project is set up for maximum flexibility. Each client is independent and can be customized without limits.

---

**Architecture**: Separate Codebases Per Client  
**Last Updated**: February 11, 2026
