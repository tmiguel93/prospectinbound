$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error 'Node.js não foi encontrado. Instale a versão LTS em https://nodejs.org/ e execute este arquivo novamente.'
}

if (-not (Test-Path '.env')) {
  Copy-Item '.env.example' '.env'
  Write-Host 'Arquivo .env criado. Altere JWT_SECRET antes de usar em produção.'
}

npm install
New-Item -ItemType Directory -Path 'data' -Force | Out-Null
if (-not (Test-Path 'data/crm-local.db')) {
  New-Item -ItemType File -Path 'data/crm-local.db' | Out-Null
}
npm run db:migrate
npm run build
Write-Host 'Configuração concluída. Para iniciar, execute: .\\start-local.ps1'
