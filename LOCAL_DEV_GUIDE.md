# 🔧 Local Development + Multi-Client Management

Since each client needs **significant code customization**, keep separate codebases but streamline the workflow.

---

## 📁 Improved Structure

```
dizidentmain/
├── dev/                         # 🆕 Your main local development
│   ├── backend/
│   ├── frontend/
│   └── docker-compose.yml       # Local dev environment
│
├── clientabc/                   # Production code for ABC
│   ├── backend/
│   ├── frontend/
│   └── docker-compose.prod.yml
│
├── clientxyz/                   # Production code for XYZ
│   ├── backend/
│   ├── frontend/
│   └── docker-compose.prod.yml
│
└── scripts/
    ├── sync-to-client.sh        # Merge dev changes to specific client
    ├── pull-from-client.sh      # Pull client-specific code to test
    ├── dev-local.sh             # Run dev environment
    └── deploy-vps.sh            # Deploy client to VPS
```

---

## 🎯 Workflow

### 1️⃣ Daily Local Development
```bash
cd dev/backend
./gradlew bootRun    # Backend: http://localhost:8080

cd dev/frontend
npm run dev          # Frontend: http://localhost:5173
```

### 2️⃣ When You Need New Feature for Client ABC
```bash
# Test in local first
cd dev/
# ... code and test ...

# Sync specific files/folders to client
./scripts/sync-to-client.sh abc backend/src/service/BillingService.java
./scripts/sync-to-client.sh abc frontend/src/pages/BillingView.jsx

# Or sync entire modules
./scripts/sync-to-client.sh abc backend/src/service/
```

### 3️⃣ Client-Specific Changes
```bash
# Work directly in client folder
cd clientabc/backend/src/
# ... make ABC-specific changes ...

# Test locally by pulling to dev
./scripts/pull-from-client.sh abc backend/src/service/InventoryService.java
cd dev/backend && ./gradlew bootRun
```

### 4️⃣ Deploy to VPS
```bash
./scripts/deploy-vps.sh clientabc master
```

---

## 🛠️ Helper Scripts

### scripts/sync-to-client.sh
```bash
#!/bin/bash
# Usage: ./sync-to-client.sh <client> <path>
# Example: ./sync-to-client.sh abc backend/src/service/

CLIENT=$1
SOURCE_PATH=$2

if [ -z "$CLIENT" ] || [ -z "$SOURCE_PATH" ]; then
    echo "Usage: ./sync-to-client.sh <client> <path>"
    exit 1
fi

rsync -av "dev/$SOURCE_PATH" "client$CLIENT/$SOURCE_PATH"
echo "✅ Synced dev/$SOURCE_PATH → client$CLIENT/$SOURCE_PATH"
```

### scripts/dev-local.sh
```bash
#!/bin/bash
# Quick start dev environment
docker-compose -f dev/docker-compose.yml up
```

---

## 🎨 Git Branch Strategy

```bash
# Main branches
main                    # Production-ready code
dev                     # Development branch

# Client branches
client/abc              # ABC-specific code
client/xyz              # XYZ-specific code

# Feature branches
feature/billing-v2      # New feature (start from dev)
fix/abc/payment-bug     # Client-specific fix
```

### Workflow with Git
```bash
# Develop new feature
git checkout dev
git checkout -b feature/billing-v2
# ... develop in dev/ folder ...
git commit -m "feat: new billing module"

# Merge to ABC
git checkout client/abc
git merge feature/billing-v2
# Resolve conflicts if ABC has customizations
cd clientabc/ && test...

# Merge to XYZ (might need different changes)
git checkout client/xyz
git cherry-pick <specific-commits>  # Or selective merge
cd clientxyz/ && test...
```

---

## 🔄 Selective Merge Tool

### scripts/merge-helper.sh
```bash
#!/bin/bash
# Interactive merge tool

echo "What do you want to sync?"
echo "1. Common bug fix (apply to all clients)"
echo "2. Feature for specific client"
echo "3. All changes from dev to client"

read -p "Choice: " choice

case $choice in
    1)
        read -p "File path: " filepath
        cp "dev/$filepath" "clientabc/$filepath"
        cp "dev/$filepath" "clientxyz/$filepath"
        echo "✅ Applied to all clients"
        ;;
    2)
        read -p "Client (abc/xyz): " client
        read -p "File path: " filepath
        cp "dev/$filepath" "client$client/$filepath"
        echo "✅ Applied to client$client"
        ;;
    3)
        read -p "Client (abc/xyz): " client
        rsync -av --exclude='.env*' dev/ "client$client/"
        echo "✅ Full sync to client$client"
        ;;
esac
```

---

## 📊 Comparison

| Approach | When to Use |
|----------|-------------|
| **Shared codebase** | 95% same code, minor config differences |
| **Separate + dev/ (This)** | 50-80% same, significant per-client changes |
| **Fully separate** | <50% common code, completely different apps |

---

## ⚡ Quick Start

```bash
# 1. Create dev folder from existing client
cp -r clientxyz/ dev/
cd dev && rm -rf .env.prod* docker-compose.prod.yml

# 2. Create local development config
cat > dev/.env <<EOF
DB_PASSWORD=local123
JWT_SECRET=local_dev_secret_key_minimum_32_chars
VITE_API_BASE=http://localhost:8080
EOF

# 3. Start developing
cd dev/backend && ./gradlew bootRun
cd dev/frontend && npm run dev
```

**Ready to set this up?**
