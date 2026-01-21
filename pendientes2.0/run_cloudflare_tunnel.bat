@echo off
echo ========================================
echo   Cloudflare Tunnel - Pendientes 2.0
echo ========================================
echo.
echo Iniciando tunel para el backend en puerto 5002...
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

REM Ejecutar cloudflared tunnel
cloudflare\cloudflared-windows-amd64.exe tunnel --url http://localhost:5002

echo.
echo Tunel cerrado.
pause
