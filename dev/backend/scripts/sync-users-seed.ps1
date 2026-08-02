# Sync users_seed.json from the current local database.
# Run after adding/editing users in dev so the seeder file stays in sync.

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir
$devProps = Join-Path $backendDir "src/main/resources/application-dev.properties"
$outputFile = Join-Path $backendDir "src/main/resources/data/users_seed.json"
$sqlFile = Join-Path $scriptDir "sync-users-seed.sql"

if (-not (Test-Path $devProps)) {
    throw "Missing application-dev.properties at $devProps"
}

$dbPassword = (Select-String -Path $devProps -Pattern '^spring\.datasource\.password=(.+)$').Matches.Groups[1].Value
$dbUrl = (Select-String -Path $devProps -Pattern '^spring\.datasource\.url=(.+)$').Matches.Groups[1].Value
$dbUser = (Select-String -Path $devProps -Pattern '^spring\.datasource\.username=(.+)$').Matches.Groups[1].Value

if ($dbUrl -match 'jdbc:postgresql://([^:/]+):(\d+)/([^?]+)') {
    $dbHost = $Matches[1]
    $dbPort = $Matches[2]
    $dbName = $Matches[3]
} else {
    throw "Could not parse database URL from application-dev.properties"
}

$psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
    Sort-Object { [version]$_.Directory.Parent.Name } -Descending |
    Select-Object -First 1

if (-not $psql) {
    throw "psql not found. Install PostgreSQL client tools or add psql to PATH."
}

$env:PGPASSWORD = $dbPassword
& $psql.FullName -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $sqlFile |
    Out-File -Encoding utf8 $outputFile

Write-Host "Synced users seed -> $outputFile"
