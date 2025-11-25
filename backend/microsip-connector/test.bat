@echo off
echo.
echo ====================================
echo   PRUEBA DE CONEXION A FIREBIRD
echo ====================================
echo.

cd /d "%~dp0"

echo Instalando dependencias si es necesario...
call npm install --silent

echo.
echo Ejecutando pruebas de conexion...
echo.

node test-connection.js

echo.
echo ====================================
echo   PRUEBA FINALIZADA
echo ====================================
echo.
echo Presiona cualquier tecla para salir...
pause >nul
