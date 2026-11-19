# ==============================================================================
# Radio Sentinel - Passerelle d'Acces Distant Nomade (Multi-Provider)
# Supporte Cloudflare Tunnel (par defaut, gratuit sans compte) et Ngrok (secours)
# Permet de laisser le PC a la maison et d'utiliser la sonde 4G/GPS sur le
# Samsung Galaxy A14 n'importe ou dans Libreville en donnees mobiles (sans Wi-Fi).
# ==============================================================================

param(
    [ValidateSet("cloudflare", "ngrok", "auto")]
    [string]$Provider = "cloudflare"
)

$Host.UI.RawUI.WindowTitle = "Radio Sentinel - Tunnel Nomade 4G ($Provider)"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetUrl = "https://localhost:8000"

Write-Host ""
Write-Host "RADIO SENTINEL - PASSERELLE NOMADE DISTANTE ($Provider.ToUpper())" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor DarkCyan
Write-Host "Ce script relie votre Samsung Galaxy A14 (en 4G dans la rue)"
Write-Host "a votre PC reste a la maison via un tunnel securise HTTPS."
Write-Host ""

# Verification que le serveur Radio Sentinel tourne sur le port 8000
$PortCheck = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if (-not $PortCheck) {
    Write-Host "[ATTENTION] Le serveur Radio Sentinel n'est pas detecte sur le port 8000." -ForegroundColor Yellow
    Write-Host "            Pensez a lancer 'lancer.bat' en parallele dans une autre fenetre !" -ForegroundColor Gray
    Write-Host ""
}

# ------------------------------------------------------------------------------
# Provider : NGROK (Alternative / Secours)
# ------------------------------------------------------------------------------
if ($Provider -eq "ngrok") {
    $NgrokExe = Join-Path $ScriptDir "ngrok.exe"
    if (-not (Test-Path $NgrokExe)) {
        $CmdCheck = Get-Command "ngrok" -ErrorAction SilentlyContinue
        if ($CmdCheck) {
            $NgrokExe = $CmdCheck.Source
        } else {
            Write-Host "[ERREUR] ngrok.exe non trouve dans le dossier ni dans le PATH." -ForegroundColor Red
            Write-Host "         Telechargez ngrok sur https://ngrok.com/download ou utilisez le mode Cloudflare." -ForegroundColor Yellow
            Exit 1
        }
    }

    Write-Host "[...] Demarrage du tunnel Ngrok vers $TargetUrl..." -ForegroundColor Cyan
    $ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
    $ProcessInfo.FileName = $NgrokExe
    $ProcessInfo.Arguments = "http 8000 --host-header=localhost:8000"
    $ProcessInfo.UseShellExecute = $true
    $Process = [System.Diagnostics.Process]::Start($ProcessInfo)

    # Attente de l'API locale Ngrok pour recuperer l'URL publique
    $PublicUrl = $null
    for ($i = 0; $i -lt 15; $i++) {
        Start-Sleep -Seconds 1
        try {
            $NgrokApi = Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -ErrorAction SilentlyContinue
            if ($NgrokApi -and $NgrokApi.tunnels) {
                $HttpsTunnel = $NgrokApi.tunnels | Where-Object { $_.public_url -like "https://*" } | Select-Object -First 1
                if ($HttpsTunnel) {
                    $PublicUrl = $HttpsTunnel.public_url
                    break
                }
            }
        } catch {}
    }

    if ($PublicUrl) {
        Write-Host ""
        Write-Host "=================================================================" -ForegroundColor Green
        Write-Host "TUNNEL NGROK PUBLIC ACTIF - VOS URLS D'ACCES 4G MOBILE :" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Tableau de bord All-in-One : $PublicUrl" -ForegroundColor Cyan
        Write-Host "   Balise GPS allegee         : $PublicUrl/gps" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Scannez le QR Code affiche sur votre ecran PC avec le Samsung A14 !" -ForegroundColor White
        Write-Host "=================================================================" -ForegroundColor Green
        Write-Host ""

        # Enregistrement dans l'API de Radio Sentinel
        try {
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
            $TunnelBody = "{""url"":""$PublicUrl"",""provider"":""ngrok"",""active"":true}"
            Invoke-RestMethod -Uri "https://localhost:8000/api/tunnel" -Method Post -Body $TunnelBody -ContentType "application/json" -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
        } catch {}

        try {
            Start-Process "https://localhost:8000/?tunnel=$PublicUrl"
        } catch {}
    } else {
        Write-Host "[ERREUR] Impossible de recuperer l'URL publique de Ngrok." -ForegroundColor Red
    }

    Write-Host "Appuyez sur Entree pour quitter le moniteur..."
    Read-Host
    Exit 0
}

# ------------------------------------------------------------------------------
# Provider : CLOUDFLARE (Par defaut, zero configuration, HTTPS gratuit)
# ------------------------------------------------------------------------------
$ExeName = "cloudflared.exe"
$ExePath = Join-Path $ScriptDir $ExeName

# Verification et telechargement automatique de cloudflared si absent
if (-not (Test-Path $ExePath)) {
    Write-Host "[...] Binaire Cloudflare Tunnel non detecte. Telechargement officiel..." -ForegroundColor Yellow
    $DownloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing
        Write-Host "[OK] Telechargement termine avec succes." -ForegroundColor Green
    } catch {
        Write-Host "[ERREUR] Erreur lors du telechargement Cloudflare : $_" -ForegroundColor Red
        Write-Host "Astuce : Vous pouvez utiliser Ngrok en secours : .\tunnel.ps1 -Provider ngrok" -ForegroundColor Yellow
        Exit 1
    }
}

Write-Host "[...] Demarrage du tunnel securise Cloudflare vers Radio Sentinel ($TargetUrl)..." -ForegroundColor Cyan
Write-Host "      (Generation de l'URL publique HTTPS en cours, veuillez patienter quelques secondes)" -ForegroundColor Gray
Write-Host ""

$ProcessInfo = New-Object System.Diagnostics.ProcessStartInfo
$ProcessInfo.FileName = $ExePath
$ProcessInfo.Arguments = "tunnel --url $TargetUrl --no-tls-verify"
$ProcessInfo.RedirectStandardError = $true
$ProcessInfo.UseShellExecute = $false
$ProcessInfo.CreateNoWindow = $false

$Process = [System.Diagnostics.Process]::Start($ProcessInfo)
$OpenedBrowser = $false

# Lecture du flux de log pour extraire l'URL .trycloudflare.com
while (-not $Process.HasExited) {
    $Line = $Process.StandardError.ReadLine()
    if ($Line) {
        if ($Line -match "https://[a-zA-Z0-9-]+\.trycloudflare\.com" -and -not $OpenedBrowser) {
            $PublicUrl = $Matches[0]
            $OpenedBrowser = $true

            # Enregistrement automatique de l'URL dans l'API de Radio Sentinel
            try {
                [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
                $TunnelBody = "{""url"":""$PublicUrl"",""provider"":""cloudflare"",""active"":true}"
                Invoke-RestMethod -Uri "https://localhost:8000/api/tunnel" -Method Post -Body $TunnelBody -ContentType "application/json" -TimeoutSec 3 -ErrorAction SilentlyContinue | Out-Null
            } catch {}

            Write-Host ""
            Write-Host "=================================================================" -ForegroundColor Green
            Write-Host "TUNNEL PUBLIC CLOUDFLARE ACTIF - VOS URLS D'ACCES 4G MOBILE :" -ForegroundColor Green
            Write-Host ""
            Write-Host "   Tableau de bord All-in-One : $PublicUrl" -ForegroundColor Cyan
            Write-Host "   Balise GPS allegee         : $PublicUrl/gps" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Scannez le QR Code affiche sur votre ecran PC avec le Samsung A14 !" -ForegroundColor White
            Write-Host "=================================================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "Ouverture automatique du tableau de bord avec le QR Code de connexion..." -ForegroundColor Gray
            Write-Host "Laissez cette fenetre ouverte pendant toute votre sortie terrain." -ForegroundColor Gray
            Write-Host "Appuyez sur Ctrl+C pour arreter le tunnel." -ForegroundColor DarkGray
            Write-Host ""

            # Ouverture automatique de la page avec le QR Code dynamique du tunnel
            try {
                Start-Process "https://localhost:8000/?tunnel=$PublicUrl"
            } catch {}
        }
    }
}
