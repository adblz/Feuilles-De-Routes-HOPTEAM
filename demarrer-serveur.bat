@echo off
chcp 65001 >nul
title Lanceur - Feuille de Route
cd /d "%~dp0"

echo ================================================
echo   DEMARRAGE DU SERVEUR LOCAL + LIEN TELEPHONE
echo ================================================
echo.
echo Deux fenetres vont s'ouvrir :
echo   - "SERVEUR"        : laisse-la ouverte (c'est le moteur)
echo   - "LIEN TELEPHONE" : l'adresse https s'affichera dedans
echo.

REM 1) Le serveur local (sert le dossier frontend)
start "SERVEUR" cmd /k npx --yes http-server frontend -p 3000 -a 0.0.0.0 -c-1

REM On laisse 3 secondes au serveur pour demarrer
timeout /t 3 >nul

REM 2) Le tunnel public https (pour iPhone et amis a distance)
start "LIEN TELEPHONE" cmd /k npx --yes cloudflared tunnel --url http://localhost:3000

echo.
echo C'est parti !
echo.
echo  - Sur ton PC / Samsung (meme wifi) :  http://localhost:3000
echo  - Sur iPhone ou pour un ami :  cherche l'adresse "https://....trycloudflare.com"
echo    dans la fenetre "LIEN TELEPHONE".
echo.
echo Pour TOUT ARRETER : ferme simplement les deux fenetres noires.
echo.
pause
