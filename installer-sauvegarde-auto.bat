@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Installer la sauvegarde automatique - Feuille de Route

REM ============================================================
REM   INSTALLE LA SAUVEGARDE AUTOMATIQUE QUOTIDIENNE
REM   A lancer UNE SEULE FOIS. Cree une tache Windows qui
REM   execute sauvegarder-base.bat chaque jour a 12h00.
REM ============================================================

set "NOM_TACHE=Sauvegarde Feuille de Route"
set "SCRIPT=%~dp0sauvegarder-base.bat"

echo ================================================
echo   INSTALLATION DE LA SAUVEGARDE AUTOMATIQUE
echo ================================================
echo.
echo   Tache      : %NOM_TACHE%
echo   Script     : %SCRIPT%
echo   Frequence  : tous les jours a 12h00
echo.

schtasks /create /tn "%NOM_TACHE%" /tr "\"%SCRIPT%\" auto" /sc daily /st 12:00 /f
if not %errorlevel%==0 (
    echo.
    echo [ERREUR] La creation de la tache a echoue.
    echo   Essaie de relancer ce fichier en tant qu'administrateur
    echo   (clic droit -^> Executer en tant qu'administrateur).
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo   C'EST FAIT
echo   La base sera sauvegardee automatiquement chaque jour.
echo   Pour verifier : ouvre le "Planificateur de taches" Windows
echo   et cherche : %NOM_TACHE%
echo ================================================
echo.
echo   Pour desinstaller plus tard, tape dans cette fenetre :
echo     schtasks /delete /tn "%NOM_TACHE%" /f
echo.
pause
exit /b 0
