$ErrorActionPreference = "Stop"
$backend = Split-Path -Parent $PSScriptRoot
$apiHost = $env:DRIVE_WISE_API_HOST
$apiPort = $env:DRIVE_WISE_API_PORT
if (-not $apiHost -or -not $apiPort) { throw "DRIVE_WISE_API_HOST and DRIVE_WISE_API_PORT must be configured" }
$databasePath = Join-Path ([System.IO.Path]::GetTempPath()) ("drive-wise-auth-e2e-{0}.sqlite3" -f [guid]::NewGuid().ToString("N"))
$env:DRIVE_WISE_DATABASE_URL = "sqlite:///$($databasePath.Replace('\', '/'))"
Push-Location $backend
try {
    & .\.venv\Scripts\python.exe -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw "Alembic migration failed" }
    & .\.venv\Scripts\python.exe -m uvicorn src.main:app --host $apiHost --port $apiPort --env-file .env
} finally {
    Pop-Location
    Remove-Item -LiteralPath $databasePath -Force -ErrorAction SilentlyContinue
}
