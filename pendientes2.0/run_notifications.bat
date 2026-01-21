@echo off
:: Se ubica en el directorio donde está este archivo .bat
cd /d "%~dp0"

:: Mensaje de log
echo [%DATE% %TIME%] Iniciando verificacion de notificaciones...

:: Ejecuta la petición al servidor local
:: Asegurate de que el backend (dotnet run) esté activo
curl -X POST http://localhost:5002/api/notifications/check-all

:: (Opcional) Pausa para ver el resultado si lo corres manual
if "%1"=="manual" pause
