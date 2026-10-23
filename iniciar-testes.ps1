# ============================================================
#  MedCase - inicia o ambiente de testes
#    1. Backend Flask        (porta 5000)  -> janela "MedCase - Backend"
#    2. API de WhatsApp      (porta 3005)  -> janela "MedCase - WhatsApp"
#    3. App no Expo Go       (Metro 8081)  -> janela "MedCase - Expo Go"
#  e abre no navegador o QR do WhatsApp e o simulador da maleta.
#
#  Uso: clique duas vezes em iniciar-testes.bat
#   (ou: powershell -ExecutionPolicy Bypass -File iniciar-testes.ps1)
#  Na primeira vez instala as dependencias que faltarem.
#  Opcao: -SemNavegador  (nao abre as abas do QR e do simulador)
# ============================================================
param([switch]$SemNavegador)
$ErrorActionPreference = 'Stop'

$raiz    = $PSScriptRoot
$backend = Join-Path $raiz 'backend'
$zap     = Join-Path $raiz 'whatsapp'
$app     = Join-Path $raiz 'MedCaseApp'

function Titulo($t) { Write-Host ""; Write-Host "== $t ==" -ForegroundColor Cyan }
function Ok($m)     { Write-Host "  [OK] $m" -ForegroundColor Green }
function Aviso($m)  { Write-Host "  [!]  $m" -ForegroundColor Yellow }
function Falhar($m) { Write-Host "  [ERRO] $m" -ForegroundColor Red; exit 1 }

function PortaEmUso($porta) {
    return [bool](Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue)
}

function AbrirJanela($titulo, $pasta, $comando) {
    $script = "`$Host.UI.RawUI.WindowTitle = '$titulo'; $comando"
    Start-Process powershell -WorkingDirectory $pasta -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $script)
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   MEDCASE - ambiente de testes" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ------------------------------------------------------------
Titulo "Verificando ferramentas"
foreach ($cmd in 'python', 'node', 'npm', 'npx') {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Falhar "$cmd nao encontrado no PATH. Instale e tente de novo." }
}
Ok ("Python " + (python --version 2>&1) + " / Node " + (node --version))

foreach ($p in $backend, $zap, $app) {
    if (-not (Test-Path $p)) { Falhar "Pasta nao encontrada: $p" }
}

# ------------------------------------------------------------
Titulo "Dependencias (so instala o que faltar)"
$py = Join-Path $backend '.venv\Scripts\python.exe'
if (-not (Test-Path $py)) {
    Aviso "Criando ambiente virtual do backend..."
    Push-Location $backend
    python -m venv .venv
    & $py -m pip install -q -r requirements.txt
    Pop-Location
}
Ok "Backend (.venv)"

if (-not (Test-Path (Join-Path $zap 'node_modules'))) {
    Aviso "Instalando dependencias do WhatsApp (baixa o Chromium, pode demorar)..."
    Push-Location $zap; npm install; Pop-Location
}
Ok "WhatsApp (node_modules)"

if (-not (Test-Path (Join-Path $app 'node_modules'))) {
    Aviso "Instalando dependencias do app..."
    Push-Location $app; npm install; Pop-Location
}
Ok "App (node_modules)"

# ------------------------------------------------------------
Titulo "Rede"
$ip = $null
try {
    $rota = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop | Sort-Object RouteMetric | Select-Object -First 1
    $ip = (Get-NetIPAddress -InterfaceIndex $rota.InterfaceIndex -AddressFamily IPv4 -ErrorAction Stop | Select-Object -First 1).IPAddress
} catch { }
if ($ip) { Ok "IP deste PC na rede: $ip" } else { Aviso "Nao consegui descobrir o IP do PC (rode 'ipconfig')."; $ip = '<IP-do-PC>' }

# ------------------------------------------------------------
Titulo "Iniciando servicos"
if (PortaEmUso 5000) { Aviso "Porta 5000 ja em uso: backend parece ja estar rodando (nao abri outro)." }
else { AbrirJanela 'MedCase - Backend (porta 5000)' $backend '.\.venv\Scripts\python.exe init.py'; Ok "Backend iniciando..." }

if (PortaEmUso 3005) { Aviso "Porta 3005 ja em uso: WhatsApp parece ja estar rodando (nao abri outro)." }
else { AbrirJanela 'MedCase - WhatsApp (porta 3005)' $zap 'node api.js'; Ok "WhatsApp iniciando..." }

if (PortaEmUso 8081) { Aviso "Porta 8081 ja em uso: o Metro/Expo parece ja estar rodando (nao abri outro)." }
else { AbrirJanela 'MedCase - Expo Go' $app 'npx expo start --go'; Ok "Expo iniciando..." }

# ------------------------------------------------------------
Titulo "Aguardando o backend responder"
# 127.0.0.1 (e nao "localhost"): no Windows "localhost" tenta IPv6 primeiro e
# demora ~2s para cair no IPv4, onde o Flask escuta.
$backendOk = $false
$limite = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $limite) {
    try {
        $r = Invoke-RestMethod 'http://127.0.0.1:5000/api/health' -TimeoutSec 3
        if ($r.status -eq 'ok') { $backendOk = $true; break }
    } catch { Start-Sleep -Seconds 1 }
}
if ($backendOk) { Ok "Backend no ar: http://localhost:5000/api/health" }
else { Aviso "Backend nao respondeu em 45s. Veja a janela 'MedCase - Backend'." }

if (-not $SemNavegador) {
    if ($backendOk) { Start-Process 'http://localhost:5000/simulador' }
    Start-Sleep -Seconds 3
    Start-Process 'http://localhost:3005/qr'
}

# ------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  PRONTO! Proximos passos" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  1. No celular (mesmo Wi-Fi), abra no navegador:"
Write-Host "       http://${ip}:5000/api/health   -> deve mostrar {""status"":""ok""}" -ForegroundColor White
Write-Host "     Se nao abrir: libere o Python no Firewall do Windows (redes privadas)."
Write-Host "  2. Escaneie o QR do WhatsApp (aba http://localhost:3005/qr)"
Write-Host "     no seu celular: WhatsApp > Aparelhos conectados > Conectar aparelho."
Write-Host "  3. Na janela 'MedCase - Expo Go', escaneie o QR com o app Expo Go"
Write-Host "     (Android: pelo Expo Go / iPhone: pela Camera)."
Write-Host "  4. Simulador da maleta: aba http://localhost:5000/simulador"
Write-Host "     Gere um ID, vincule no app (Integracao ESP32) e clique em Iniciar."
Write-Host ""
Write-Host "  Para parar tudo: feche as 3 janelas abertas." -ForegroundColor DarkGray
