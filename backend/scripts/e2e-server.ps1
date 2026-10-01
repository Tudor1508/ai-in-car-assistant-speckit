$ErrorActionPreference = "Stop"
$backend = Split-Path -Parent $PSScriptRoot
$databasePath = Join-Path ([System.IO.Path]::GetTempPath()) ("drive-wise-auth-e2e-{0}.sqlite3" -f [guid]::NewGuid().ToString("N"))
$env:DRIVE_WISE_DATABASE_URL = "sqlite:///$($databasePath.Replace('\', '/'))"
$env:DRIVE_WISE_ALLOWED_ORIGINS = "http://localhost:3000"
Push-Location $backend
try {
    & .\.venv\Scripts\python.exe -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { throw "Alembic migration failed" }
    & .\.venv\Scripts\python.exe -m uvicorn src.main:app --host localhost --port 8000
} finally {
    Pop-Location
    Remove-Item -LiteralPath $databasePath -Force -ErrorAction SilentlyContinue
}
