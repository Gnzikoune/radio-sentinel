@echo off
title Radio Sentinel - Observatoire Cellulaire & Cartographie RF (HTTPS)
cd /d "%~dp0"
echo ======================================================================
echo   RADIO SENTINEL - Observatoire Cellulaire & Cartographie RF
echo ======================================================================
echo.

if not exist "key.pem" (
    echo [INFO] Generation initiale des certificats SSL locaux pour le GPS...
    python generate_cert.py
)

echo [1] Sur ce PC, ouvrez le Dashboard dans votre navigateur :
echo     https://127.0.0.1:8000
echo.
echo [2] Sur votre smartphone (Samsung / Android), ouvrez :
echo     https://192.168.1.134:8000/gps
echo.
echo   * Astuce : Sur le telephone, cliquez sur "Parametres avances" puis
echo     "Continuer vers le site" pour autoriser la connexion locale securisee.
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur.
echo.
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem
pause
