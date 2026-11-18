# ==============================================================================
# Radio Sentinel — Passerelle d'Accès Distant Nomade (Cloudflare Tunnel)
# Permet de laisser le PC allume a la maison et d'utiliser la sonde 4G/GPS sur le
# Samsung Galaxy A14 n'importe ou dans Libreville en donnees mobiles (sans Wi-Fi).
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Host.UI.RawUI.WindowTitle = "Radio Sentinel — Tunnel Nomade 4G"

$ExeName = "cloudflared.exe"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ExePath = Join-Path $ScriptDir $ExeName
$TargetUrl = "https://localhost:8000"

Write-Host ""
Write-Host "📡 RADIO SENTINEL — PASSERELLE NOMADE DISTANTE" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor DarkCyan
Write-Host "Ce script permet de relier votre Samsung Galaxy A14 (en 4G dans la rue)"
Write-Host "a votre PC reste a la maison via un tunnel securise mondial gratuit."
Write-Host ""

# 1. Verification et telechargement automatique de cloudflared si absent
if (-not (Test-Path $ExePath)) {
    Write-Host "⏳ Binaire Cloudflare Tunnel non detecte. Telechargement officiel..." -ForegroundColor Yellow
    $DownloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing
        Write-Host "✅ Telechargement termine avec succes." -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors du telechargement : $_" -ForegroundColor Red
        Write-Host "Telechargez manuellement cloudflared-windows-amd64.exe depuis GitHub et renommez-le en cloudflared.exe"
        Exit 1
    }
}

# 2. Verification que le serveur Radio Sentinel tourne sur le port 8000
$PortCheck = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $PortCheck) {
    Write-Host "⚠️ ATTENTION : Le serveur Radio Sentinel ne semble pas actif sur le port 8000." -ForegroundColor Yellow
    Write-Host "   Pensez a executer 'lancer.bat' en parallele dans une autre fenetre !" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "🚀 Demarrage du tunnel securise vers Radio Sentinel ($TargetUrl)..." -ForegroundColor Cyan
Write-Host "   (Generation de l'URL publique HTTPS en cours, veuillez patienter quelques secondes)" -ForegroundColor Gray
Write-Host ""

# 3. Execution de cloudflared avec extraction de l'URL publique
$ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo.FileName = $ExePath
$ProcessInfo.Arguments = "tunnel --url $TargetUrl --no-tls-verify"
$ProcessInfo.RedirectStandardError = $true
$ProcessInfo.UseShellExecute = $false
$ProcessInfo.CreateNoWindow = $false

$Process = [System.Diagnostics.Process]::Start($ProcessInfo)

# Lecture du flux de log pour extraire l'URL .trycloudflare.com
while (-not $Process.HasExited) {
    $Line = $Process.StandardError.ReadLine()
    if ($Line) {
        if ($Line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com") {
            $PublicUrl = $Matches[0]
            Write-Host ""
            Write-Host "=================================================================" -ForegroundColor Green
            Write-Host "🎉 TUNNEL PUBLIC ACTIF — VOTRE URL D'ACCES 4G MOBILE :" -ForegroundColor Green
            Write-Host ""
            Write-Host "👉  $PublicUrl/gps" -ForegroundColor Yellow -BackgroundColor Black
            Write-Host ""
            Write-Host "Ouvrez cette adresse exacte sur le navigateur de votre Samsung A14 !" -ForegroundColor White
            Write-Host "Dashboard complet : $PublicUrl" -ForegroundColor Cyan
            Write-Host "=================================================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Laissez cette fenetre ouverte pendant toute votre sortie terrain." -ForegroundColor Gray
            Write-Host "Appuyez sur Ctrl+C pour arreter le tunnel." -ForegroundColor DarkGray
            Write-Host ""
        }
    }
}
