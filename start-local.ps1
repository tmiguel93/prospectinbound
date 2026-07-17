$ErrorActionPreference = 'Stop'

if (-not (Test-Path '.env')) {
  Write-Error 'Execute primeiro .\\setup-local.ps1.'
}

npm run start

