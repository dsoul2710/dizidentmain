# Git Setup Guide for Dizident Multi-Client HMS

## 📋 Prerequisites

1. Git installed on your machine
2. GitHub/GitLab/Bitbucket account (or any Git hosting service)
3. SSH key configured (optional but recommended)

## 🚀 Initial Setup

### Step 1: Create Remote Repository

1. Go to GitHub/GitLab/Bitbucket
2. Create a new repository named `dizidentmain` or `clinic-hms-multi`
3. **Do NOT initialize with README** (we already have one)
4. Copy the repository URL

### Step 2: Initialize Git Locally

Open terminal in the project root (`d:\dizident\dizidentmain`):

```powershell
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Multi-client dental HMS setup

- Shared backend (Spring Boot 4.0)
- Shared frontend (React 19 + Vite)
- Client configurations (clientxyz, clientabc)
- Docker setup with compose files
- Deployment scripts (bash + powershell)
- Complete documentation"

# Rename branch to main
git branch -M main
```

### Step 3: Connect to Remote Repository

```powershell
# Add remote repository (replace with your URL)
git remote add origin https://github.com/yourusername/dizidentmain.git

# Or using SSH
git remote add origin git@github.com:yourusername/dizidentmain.git

# Verify remote
git remote -v

# Push to remote
git push -u origin main
```

## 🔐 Protecting Sensitive Data

The `.gitignore` is already configured to exclude:
- `clients/*/config/backend.env`
- `clients/*/config/frontend.env`
- Database credentials
- Uploads directory
- Build artifacts

### Create Environment Templates (Optional)

```powershell
# Create example templates for documentation
Copy-Item clients\clientxyz\config\backend.env clients\clientxyz\config\backend.env.example
Copy-Item clients\clientxyz\config\frontend.env clients\clientxyz\config\frontend.env.example

# Remove sensitive data from examples
# Edit the .example files and replace real values with placeholders
```

## 🌿 Branching Strategy

### Option 1: Simple (Recommended for small team)

```
main (production-ready code)
  └── develop (active development)
```

```powershell
# Create develop branch
git checkout -b develop
git push -u origin develop
```

### Option 2: Client-specific branches (Advanced)

```
main
  ├── develop
  ├── client/xyz
  └── client/abc
```

```powershell
# Create client branches
git checkout -b client/xyz
git push -u origin client/xyz

git checkout -b client/abc  
git push -u origin client/abc
```

## 📝 Common Git Workflows

### Making Changes to Shared Code

```powershell
# Create feature branch
git checkout -b feature/add-appointment-reminder

# Make changes to backend/ or frontend/
# ... edit files ...

# Stage and commit
git add .
git commit -m "Feature: Add appointment reminder functionality"

# Push to remote
git push -u origin feature/add-appointment-reminder

# Create Pull Request on GitHub
# After approval, merge to main
```

### Updating Client Configuration

```powershell
# Create config branch
git checkout -b config/update-clientxyz

# Update client config
# Edit clients/clientxyz/config/brand.json

# Commit
git add clients/clientxyz/
git commit -m "Config: Update clientxyz branding colors"

# Push
git push -u origin config/update-clientxyz
```

### Pulling Latest Changes on VPS

```bash
# On your VPS
cd /opt/apps/dizidentmain

# Pull latest changes
git pull origin main

# Redeploy affected clients
./scripts/deploy-all.sh

# Or specific client
./scripts/deploy-client.sh clientxyz
```

## 🔄 Deployment Workflow

### Development → Production

```powershell
# 1. Test locally
cd clients\clientxyz
docker-compose up -d --build

# 2. Commit changes
git add .
git commit -m "Fix: Resolve billing calculation issue"
git push

# 3. On VPS, pull and deploy
ssh user@your-vps-ip
cd /opt/apps/dizidentmain
git pull
./scripts/deploy-client.sh clientxyz
```

## 🏷️ Tagging Releases

```powershell
# Create annotated tag for version
git tag -a v1.0.0 -m "Release v1.0.0: Initial production release"

# Push tag to remote
git push origin v1.0.0

# List all tags
git tag -l

# Checkout specific version
git checkout v1.0.0
```

## 📦 Setting Up on New VPS

```bash
#!/bin/bash
# setup-vps.sh

# Install Git
sudo apt update
sudo apt install -y git

# Clone repository
cd /opt/apps
git clone https://github.com/yourusername/dizidentmain.git
cd dizidentmain

# Copy environment files from secure location or create new ones
# (Don't commit actual .env files to git)
cp /secure/clientxyz-backend.env clients/clientxyz/config/backend.env
cp /secure/clientxyz-frontend.env clients/clientxyz/config/frontend.env

# Deploy
./scripts/deploy-all.sh
```

## 🔒 Secure Environment Variables on VPS

### Option 1: Use Git Submodule for Configs (Private Repo)

```bash
# Create separate private repo for configs
git init dizidentmain-configs

# Structure:
# dizidentmain-configs/
#   clientxyz/
#     backend.env
#     frontend.env
#   clientabc/
#     backend.env
#     frontend.env

# Push to private repo

# In main repo, add as submodule
cd /opt/apps/dizidentmain
git submodule add https://github.com/yourusername/dizidentmain-configs-private.git configs-private

# Link configs
ln -s ../../configs-private/clientxyz/backend.env clients/clientxyz/config/backend.env
```

### Option 2: Use Environment Variables (Best for Production)

Modify docker-compose.yml to use environment variables:

```yaml
services:
  backend-xyz:
    environment:
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD_XYZ}
      JWT_SECRET: ${JWT_SECRET_XYZ}
```

Then set on VPS:
```bash
export DB_PASSWORD_XYZ="secure-password"
export JWT_SECRET_XYZ="long-random-secret"
```

## 📊 Git Commands Cheat Sheet

```powershell
# Status
git status
git log --oneline

# Branches
git branch                  # List branches
git checkout -b new-branch  # Create and switch
git branch -d old-branch    # Delete local branch

# Stashing (temporary save)
git stash
git stash pop

# Undoing changes
git reset HEAD~1            # Undo last commit (keep changes)
git reset --hard HEAD~1     # Undo last commit (discard changes)
git checkout -- file.txt    # Discard changes to file

# Remote
git fetch                   # Download changes (don't apply)
git pull                    # Download and merge changes
git push                    # Upload changes

# Viewing changes
git diff                    # Unstaged changes
git diff --staged           # Staged changes
git diff main..develop      # Compare branches
```

## 🆘 Common Issues

### Problem: Accidentally committed .env files

```powershell
# Remove from git but keep local file
git rm --cached clients/clientxyz/config/backend.env
git commit -m "Remove sensitive env file from git"
git push

# The file stays on disk but is no longer tracked
```

### Problem: Merge conflicts

```powershell
# Pull latest changes
git pull origin main

# If conflicts occur:
# 1. Open conflicted files in editor
# 2. Look for <<<<<<< HEAD markers
# 3. Resolve conflicts manually
# 4. Remove conflict markers
# 5. Stage and commit

git add .
git commit -m "Resolve merge conflicts"
git push
```

### Problem: Need to sync fork with upstream

```powershell
# Add upstream remote
git remote add upstream https://github.com/original/dizidentmain.git

# Fetch upstream changes
git fetch upstream

# Merge into your branch
git merge upstream/main

# Push to your fork
git push origin main
```

## ✅ Next Steps

1. ✅ Initialize Git repository
2. ✅ Create remote repository on GitHub/GitLab
3. ✅ Push initial commit
4. ✅ Set up VPS and clone repository
5. ✅ Configure deployment keys/credentials
6. ✅ Test deployment workflow
7. ✅ Set up CI/CD (optional - GitHub Actions, GitLab CI)

## 📞 Need Help?

- Git Documentation: https://git-scm.com/doc
- GitHub Guides: https://guides.github.com
- Pro Git Book: https://git-scm.com/book/en/v2
