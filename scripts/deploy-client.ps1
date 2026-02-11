# Deploy a specific client (Windows PowerShell version)
# Usage: .\deploy-client.ps1 clientxyz

param(
    [Parameter(Mandatory=$true)]
    [string]$Client
)

$ErrorActionPreference = "Stop"

$ClientDir = $Client

if (-not (Test-Path $ClientDir)) {
    Write-Host "❌ Error: Client directory $ClientDir not found" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deploying $Client..." -ForegroundColor Green
Write-Host "================================"

Push-Location $ClientDir

try {
    # Stop existing containers
    Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
    docker-compose down

    # Build and start services
    Write-Host "🔨 Building and starting services..." -ForegroundColor Cyan
    docker-compose up -d --build

    # Wait for services to be ready
    Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Check service health
    Write-Host "🏥 Checking service health..." -ForegroundColor Cyan
    docker-compose ps

    Write-Host ""
    Write-Host "✅ Deployment complete for $Client" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Service URLs:" -ForegroundColor Cyan
    
    # Parse ports from docker-compose.yml
    $frontendPort = (Select-String -Path "docker-compose.yml" -Pattern '- "(\d+):80"').Matches.Groups[1].Value
    $backendPort = (Select-String -Path "docker-compose.yml" -Pattern '- "(\d+):8080"').Matches.Groups[1].Value
    $dbPort = (Select-String -Path "docker-compose.yml" -Pattern '- "(\d+):5432"').Matches.Groups[1].Value
    
    Write-Host "   Frontend: http://localhost:$frontendPort" -ForegroundColor White
    Write-Host "   Backend:  http://localhost:$backendPort" -ForegroundColor White
    Write-Host "   Database: localhost:$dbPort" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 View logs: cd $ClientDir; docker-compose logs -f" -ForegroundColor Yellow
    Write-Host "🛑 Stop:      cd $ClientDir; docker-compose down" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
