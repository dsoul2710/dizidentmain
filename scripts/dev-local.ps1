# Start local dev environment (Windows PowerShell)
# Usage: .\dev-local.ps1 [mode]
# Modes: docker (default), native

param(
    [string]$Mode = "docker"
)

$BaseDir = Split-Path -Parent $PSScriptRoot
$DevDir = Join-Path $BaseDir "dev"

Write-Host "🚀 Starting Dev Environment" -ForegroundColor Cyan
Write-Host ""

if ($Mode -eq "docker") {
    Write-Host "Mode: Docker Compose" -ForegroundColor Green
    Write-Host ""
    
    Set-Location $DevDir
    docker-compose up --build
    
} elseif ($Mode -eq "native") {
    Write-Host "Mode: Native (Backend + Frontend separately)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📦 Backend: http://localhost:8080" -ForegroundColor Yellow
    Write-Host "🎨 Frontend: http://localhost:5173" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run these commands in separate terminals:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  # Terminal 1 - Backend" -ForegroundColor Gray
    Write-Host "  cd $DevDir\backend" -ForegroundColor White
    Write-Host '  $env:SPRING_PROFILES_ACTIVE="dev"; .\gradlew.bat bootRun' -ForegroundColor White
    Write-Host ""
    Write-Host "  # Terminal 2 - Frontend" -ForegroundColor Gray
    Write-Host "  cd $DevDir\frontend" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
    
} else {
    Write-Host "❌ Unknown mode: $Mode" -ForegroundColor Red
    Write-Host "Available modes: docker, native" -ForegroundColor Yellow
    exit 1
}
