@echo off
:: Se ubica en el directorio donde está este archivo .bat
cd /d "%~dp0"

:: Mensaje de log
echo [%DATE% %TIME%] Solicitando respaldo manual de la base de datos...

:: Ejecuta la petición al servidor local
:: Asegurate de que el backend (dotnet run) esté activo
curl -X POST http://localhost:5002/api/database/backup

:: (Opcional) Pausa para ver el resultado si lo corres manual
if "%1"=="manual" pause
