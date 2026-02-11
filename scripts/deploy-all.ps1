# Deploy all clients (Windows PowerShell version)
# Usage: .\deploy-all.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying all clients..." -ForegroundColor Green
Write-Host "================================"
Write-Host ""

# Get all client directories (exclude backend, frontend, clients, docker, scripts)
$Clients = Get-ChildItem -Path "." -Directory | 
    Where-Object { $_.Name -notin @('backend', 'frontend', 'clients', 'docker', 'scripts', '.git', 'node_modules') } |
    Select-Object -ExpandProperty Name

if ($Clients.Count -eq 0) {
    Write-Host "❌ No clients found in $ClientsDir" -ForegroundColor Red
    exit 1
}

Write-Host "Found clients: $($Clients -join ', ')" -ForegroundColor Cyan
Write-Host ""

# Deploy each client
foreach ($Client in $Clients) {
    Write-Host "📦 Deploying $Client..." -ForegroundColor Yellow
    & .\scripts\deploy-client.ps1 -Client $Client
    Write-Host ""
    Write-Host "---"
    Write-Host ""
}

Write-Host "✅ All clients deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Overall status:" -ForegroundColor Cyan
docker ps --filter "name=client" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
