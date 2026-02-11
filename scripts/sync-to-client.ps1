# Sync changes from dev to specific client (Windows PowerShell)
# Usage: .\sync-to-client.ps1 <client> <path>
# Example: .\sync-to-client.ps1 abc backend/src/service/BillingService.java
# Example: .\sync-to-client.ps1 xyz frontend/src/pages/

param(
    [Parameter(Mandatory=$true)]
    [string]$Client,
    
    [Parameter(Mandatory=$true)]
    [string]$SourcePath
)

$ErrorActionPreference = "Stop"

$BaseDir = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $BaseDir "dev\$SourcePath"
$Dest = Join-Path $BaseDir "client$Client\$SourcePath"

# Validate source
if (-not (Test-Path $Source)) {
    Write-Host "❌ Source not found: $Source" -ForegroundColor Red
    exit 1
}

# Validate client folder
if (-not (Test-Path (Join-Path $BaseDir "client$Client"))) {
    Write-Host "❌ Client folder not found: client$Client" -ForegroundColor Red
    Write-Host "Available clients: clientabc, clientxyz" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Syncing from dev to client$Client" -ForegroundColor Cyan
Write-Host "   Source: dev\$SourcePath"
Write-Host "   Dest:   client$Client\$SourcePath"
Write-Host ""

# Copy file or directory
if (Test-Path $Source -PathType Container) {
    # Directory - copy recursively
    $DestParent = Split-Path -Parent $Dest
    if (-not (Test-Path $DestParent)) {
        New-Item -ItemType Directory -Path $DestParent -Force | Out-Null
    }
    Copy-Item -Path $Source -Destination $DestParent -Recurse -Force
} else {
    # Single file
    $DestParent = Split-Path -Parent $Dest
    if (-not (Test-Path $DestParent)) {
        New-Item -ItemType Directory -Path $DestParent -Force | Out-Null
    }
    Copy-Item -Path $Source -Destination $Dest -Force
}

Write-Host ""
Write-Host "✅ Synced successfully!" -ForegroundColor Green
Write-Host "💡 Don't forget to test in client$Client before deploying" -ForegroundColor Yellow
