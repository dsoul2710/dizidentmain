# @echo off
# VPS Deployment Script for Multi-Client HMS
# Usage: deploy-vps.ps1 -Client <client-name> -Branch <branch>
# Example: deploy-vps.ps1 -Client clientxyz -Branch main

param(
    [Parameter(Mandatory=$true)]
    [string]$Client,
    
    [string]$Branch = "main"
)

$BaseDir = "D:\dizident\dizidentmain"
$ClientDir = "$BaseDir\$Client"

# Colors
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"

# Validation
if (-not (Test-Path $ClientDir)) {
    Write-Host "Error: Client directory not found: $ClientDir" -ForegroundColor $ErrorColor
    exit 1
}

if (-not (Test-Path "$ClientDir\.env.prod")) {
    Write-Host "Error: $ClientDir\.env.prod not found" -ForegroundColor $ErrorColor
    Write-Host "Create it from .env.prod.example:" -ForegroundColor $WarningColor
    Write-Host "  Copy-Item $ClientDir\.env.prod.example $ClientDir\.env.prod"
    Write-Host "  notepad $ClientDir\.env.prod"
    exit 1
}

Set-Location $ClientDir

Write-Host "================================" -ForegroundColor $WarningColor
Write-Host "Deploying: $Client (Branch: $Branch)" -ForegroundColor $WarningColor
Write-Host "================================" -ForegroundColor $WarningColor

# Step 1: Pull latest code
Write-Host "[1/5] Pulling latest code from Git..." -ForegroundColor $WarningColor
git pull origin $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git pull failed. Make sure remote is configured." -ForegroundColor $ErrorColor
    exit 1
}

# Step 2: Build backend image
Write-Host "[2/5] Building backend Docker image..." -ForegroundColor $WarningColor
docker build -f backend/Dockerfile -t dizidentmain-$Client-backend:latest ./backend
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed" -ForegroundColor $ErrorColor
    exit 1
}
Write-Host "✓ Backend image built" -ForegroundColor $SuccessColor

# Step 3: Build frontend image
Write-Host "[3/5] Building frontend Docker image..." -ForegroundColor $WarningColor
docker build -f frontend/Dockerfile -t dizidentmain-$Client-frontend:latest ./frontend
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed" -ForegroundColor $ErrorColor
    exit 1
}
Write-Host "✓ Frontend image built" -ForegroundColor $SuccessColor

# Step 4: Stop old containers
Write-Host "[4/5] Stopping old containers..." -ForegroundColor $WarningColor
docker-compose -f docker-compose.prod.yml --env-file .env.prod down -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 5: Start new containers
Write-Host "[5/5] Starting containers..." -ForegroundColor $WarningColor
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker compose up failed" -ForegroundColor $ErrorColor
    exit 1
}

# Wait for startup
Start-Sleep -Seconds 5

# Show status
Write-Host "================================" -ForegroundColor $WarningColor
Write-Host "✓ Deployment completed!" -ForegroundColor $SuccessColor
Write-Host "================================" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "Container Status:" -ForegroundColor $WarningColor
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "Recent Logs:" -ForegroundColor $WarningColor
docker-compose -f docker-compose.prod.yml logs --tail=10

Write-Host ""
Write-Host "Access at: https://$Client.srv1358942.hstgr.cloud" -ForegroundColor $SuccessColor
Write-Host "API at: https://$Client.srv1358942.hstgr.cloud/api" -ForegroundColor $SuccessColor

Write-Host ""
Write-Host "View logs (realtime):"
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f backend"
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f frontend"

Write-Host ""
Write-Host "Restart containers:"
Write-Host "  docker-compose -f docker-compose.prod.yml restart"
