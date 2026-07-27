# Levanta KnowFlow con una URL publica temporal (Cloudflare quick tunnel).
#
# Uso (desde la raiz del proyecto, con Docker/BD ya corriendo):
#   powershell -ExecutionPolicy Bypass -File scripts\tunel.ps1
#
# El script: inicia el tunel, obtiene la URL publica, actualiza .env
# (NEXTAUTH_URL y NEXT_PUBLIC_BASE_URL) y arranca el servidor de desarrollo.
# La URL cambia en cada ejecucion; compartela de nuevo cada vez.

$ErrorActionPreference = "Stop"

# Localizar cloudflared (instalado via winget)
$cloudflared = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\cloudflared.exe"
if (-not (Test-Path $cloudflared)) {
  $found = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter cloudflared.exe -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) { $cloudflared = $found.FullName }
  else { Write-Error "cloudflared no esta instalado. Ejecuta: winget install Cloudflare.cloudflared"; exit 1 }
}

# Iniciar el tunel y esperar la URL publica
$logFile = "$env:TEMP\knowflow-tunnel.log"
Remove-Item $logFile -ErrorAction SilentlyContinue
Write-Host "Iniciando tunel Cloudflare..." -ForegroundColor Cyan
Start-Process $cloudflared -ArgumentList "tunnel", "--url", "http://localhost:3000", "--logfile", $logFile -WindowStyle Minimized

$url = $null
foreach ($i in 1..30) {
  Start-Sleep 2
  $log = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
  if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $url = $Matches[0]; break }
}
if (-not $url) { Write-Error "No se pudo obtener la URL del tunel (revisa $logFile)"; exit 1 }

# Actualizar .env con la URL publica
$envPath = Join-Path $PSScriptRoot "..\.env"
$contenido = Get-Content $envPath -Raw
$contenido = $contenido -replace "NEXTAUTH_URL=.*", "NEXTAUTH_URL=$url"
$contenido = $contenido -replace "NEXT_PUBLIC_BASE_URL=.*", "NEXT_PUBLIC_BASE_URL=$url"
Set-Content $envPath $contenido -Encoding utf8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  KnowFlow disponible publicamente en:" -ForegroundColor Green
Write-Host "  $url" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Green
Write-Host "  (la URL muere al cerrar esta ventana)"
Write-Host ""

# Arrancar el servidor de desarrollo (Ctrl+C para detener todo)
npm run dev:lan
