@echo off
chcp 65001 >nul
title Lanceur - Feuille de Route
cd /d "%~dp0"

echo ================================================
echo   DEMARRAGE DU SERVEUR LOCAL
echo ================================================
echo.

REM Recupere l'adresse Tailscale du PC
for /f "tokens=1" %%i in ('"C:\Program Files\Tailscale\tailscale.exe" ip 2^>nul') do set TAILSCALE_IP=%%i

REM Lance le serveur (accessible sur tout le reseau, pas seulement localhost)
start "SERVEUR FEUILLE DE ROUTE" cmd /k npx --yes http-server frontend -p 3000 -a 0.0.0.0 -c-1

timeout /t 2 >nul

echo.
echo ================================================
echo   OU SE CONNECTER ?
echo ================================================
echo.
echo   Sur ce PC :
echo     http://localhost:3000
echo.
if defined TAILSCALE_IP (
    echo   Sur ton telephone avec Tailscale :
    echo     http://%TAILSCALE_IP%:3000
    echo.
    echo   CONDITION : Tailscale doit etre installe et connecte
    echo   sur ton telephone avec le meme compte.
) else (
    echo   Tailscale non detecte. Lance Tailscale d'abord.
)
echo.
echo ================================================
echo   Pour ARRETER : ferme la fenetre noire "SERVEUR"
echo ================================================
echo.
pause
