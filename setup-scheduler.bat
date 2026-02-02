@echo off
REM Script para configurar validaciones automáticas de CHANGELOG en Windows Task Scheduler
REM Ejecuta validaciones en 3 ventanas: 10-11h, 15-16h, 19-20h
REM Con checks cada 20 minutos

setlocal enabledelayedexpansion

REM Rutas
set PROJECT_DIR=D:\Rappi\Changelog
set NODE_PATH=node
set SCRIPT=%PROJECT_DIR%\changelog-validator.js

echo.
echo ========================================
echo Configurando CHANGELOG Validator
echo ========================================
echo.

REM Crear tareas para cada ventana
echo Creando tareas de validación...
echo.

REM VENTANA 1: 10:00 - 11:00
echo [1/3] Ventana MAÑANA (10:00 - 11:00)
for /L %%i in (0,20,40) do (
    set /A hour_check = 10
    set /A minute_check = %%i
    
    echo Creando tarea para 10:!minute_check:~-2!...
    
    schtasks /create /tn "ChangeBot\ValidarMañana-10-!minute_check:~-2!" ^
        /tr "cd /d %PROJECT_DIR% && %NODE_PATH% changelog-validator.js" ^
        /sc daily /st 10:!minute_check:~-2! /f
)

REM VENTANA 2: 15:00 - 16:00
echo.
echo [2/3] Ventana TARDE (15:00 - 16:00)
for /L %%i in (0,20,40) do (
    set /A hour_check = 15
    set /A minute_check = %%i
    
    echo Creando tarea para 15:!minute_check:~-2!...
    
    schtasks /create /tn "ChangeBot\ValidarTarde-15-!minute_check:~-2!" ^
        /tr "cd /d %PROJECT_DIR% && %NODE_PATH% changelog-validator.js" ^
        /sc daily /st 15:!minute_check:~-2! /f
)

REM VENTANA 3: 19:00 - 20:00
echo.
echo [3/3] Ventana NOCHE (19:00 - 20:00)
for /L %%i in (0,20,40) do (
    set /A hour_check = 19
    set /A minute_check = %%i
    
    echo Creando tarea para 19:!minute_check:~-2!...
    
    schtasks /create /tn "ChangeBot\ValidarNoche-19-!minute_check:~-2!" ^
        /tr "cd /d %PROJECT_DIR% && %NODE_PATH% changelog-validator.js" ^
        /sc daily /st 19:!minute_check:~-2! /f
)

echo.
echo ========================================
echo Configuración completada!
echo ========================================
echo.
echo Se han creado 9 tareas programadas:
echo - 3 chequeos en ventana de mañana (10:00, 10:20, 10:40)
echo - 3 chequeos en ventana de tarde (15:00, 15:20, 15:40)
echo - 3 chequeos en ventana de noche (19:00, 19:20, 19:40)
echo.
echo Para ver las tareas:
echo   schtasks /query /tn ChangeBot
echo.
echo Para eliminar las tareas:
echo   schtasks /delete /tn ChangeBot /f
echo.
pause