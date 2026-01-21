@echo off
echo ==========================================
echo   Construyendo Pendientes 2.0 (Optimizado)
echo ==========================================

cd /d "%~dp0"

echo [1/4] Instalando dependencias del Frontend...
cd frontend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error instalando dependencias.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/4] Construyendo Frontend (React)...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error construyendo frontend.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/4] Desplegando archivos estaticos al Backend...
cd ..
if not exist "backend\wwwroot" mkdir "backend\wwwroot"

:: Limpiar wwwroot antiguo
del /q /s "backend\wwwroot\*"

:: Copiar nuevos archivos
xcopy /s /y /e "frontend\dist\*" "backend\wwwroot\"

echo [4/4] Iniciando Servidor Backend (.NET)...
cd backend
echo Servidor escuchando en http://localhost:5002
echo Puedes configurar tu Cloudflare Tunnel apuntando a http://localhost:5002
echo Presiona Ctrl+C para detener.
dotnet run

pause
