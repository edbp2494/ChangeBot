@echo off
echo 🚀 ChangeBot - Script de Ejecución
echo.
echo Navegando al directorio correcto...
cd /d D:\Rappi\Changelog

echo 📋 Verificando archivos...
if not exist "bot-simple.js" (
    echo ❌ Archivo bot-simple.js no encontrado
    pause
    exit /b 1
)

if not exist ".env" (
    echo ❌ Archivo .env no encontrado
    pause
    exit /b 1
)

echo ✅ Archivos encontrados
echo.
echo 🤖 Ejecutando bot simple...
node bot-simple.js

echo.
echo ✅ Ejecución completada
pause