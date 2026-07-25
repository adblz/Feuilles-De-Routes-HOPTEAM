@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Sauvegarde de la base - Feuille de Route

REM ============================================================
REM   SAUVEGARDE DE LA BASE DE PRODUCTION
REM   Double-clique ce fichier pour creer une copie de secours.
REM   Lance chaque jour par la tache planifiee avec l'argument "auto".
REM ============================================================

REM Ne pas faire de pause si lance par la tache planifiee (argument "auto").
set "NOPAUSE="
if /i "%~1"=="auto" set "NOPAUSE=1"

echo ================================================
echo   SAUVEGARDE DE LA BASE
echo ================================================
echo.

REM --- 1. Trouver l'outil pg_dump ---
set "PGDUMP="
where pg_dump >nul 2>nul
if not errorlevel 1 set "PGDUMP=pg_dump"
if not defined PGDUMP call :chercher_pgdump
if not defined PGDUMP goto :err_pgdump

REM --- 2. Lire l'adresse de connexion (1re ligne commencant par "postgres") ---
set "FICHIER_CONN=sauvegardes\connexion.txt"
if not exist "%FICHIER_CONN%" goto :err_fichier

set "CONN="
for /f "usebackq delims=" %%l in (`findstr /b /i "postgres" "%FICHIER_CONN%"`) do if not defined CONN set "CONN=%%l"
if not defined CONN goto :err_conn

REM --- 3. Construire un nom de fichier date (independant de la langue) ---
for /f "usebackq delims=" %%s in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HHmm'"`) do set "STAMP=%%s"
set "OUT=sauvegardes\sauvegarde_!STAMP!.sql"

REM --- 4. Lancer la sauvegarde ---
echo Sauvegarde en cours vers : !OUT!
echo (cela peut prendre quelques secondes)
echo.
"!PGDUMP!" "!CONN!" --no-owner --no-privileges -f "!OUT!"
if errorlevel 1 goto :err_dump

REM --- 5. Supprimer les sauvegardes de plus de 30 jours ---
forfiles /p "sauvegardes" /m sauvegarde_*.sql /d -30 /c "cmd /c del @path" >nul 2>nul

echo.
echo ================================================
echo   SAUVEGARDE REUSSIE
echo   Fichier : !OUT!
echo ================================================
echo.
if not defined NOPAUSE pause
exit /b 0

REM ================= sous-routines et erreurs =================

:chercher_pgdump
for /f "delims=" %%d in ('dir /b /ad /o-n "C:\Program Files\PostgreSQL" 2^>nul') do (
    if exist "C:\Program Files\PostgreSQL\%%d\bin\pg_dump.exe" (
        set "PGDUMP=C:\Program Files\PostgreSQL\%%d\bin\pg_dump.exe"
        goto :eof
    )
)
goto :eof

:err_pgdump
echo [ERREUR] Impossible de trouver pg_dump.
echo   Il faut installer les outils PostgreSQL.
echo.
if not defined NOPAUSE pause
exit /b 1

:err_fichier
echo [ERREUR] Fichier manquant : %FICHIER_CONN%
echo.
if not defined NOPAUSE pause
exit /b 1

:err_conn
echo [ERREUR] Aucune adresse de connexion trouvee dans %FICHIER_CONN%
echo   Colle l'adresse "postgresql://..." sur sa PROPRE ligne, SANS # au debut.
echo.
if not defined NOPAUSE pause
exit /b 1

:err_dump
echo.
echo [ERREUR] La sauvegarde a echoue. Le fichier peut etre incomplet.
echo   Verifie l'adresse de connexion dans %FICHIER_CONN%.
echo.
if not defined NOPAUSE pause
exit /b 1
