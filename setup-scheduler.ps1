# Script para configurar validaciones automáticas de CHANGELOG
param(
    [switch]$Setup = $false,
    [switch]$Remove = $false,
    [switch]$List = $false,
    [switch]$Test = $false
)

$ProjectDir = "D:\Rappi\Changelog"
$NodeExe = "node"
$Script = "$ProjectDir\changelog-validator.js"

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Setup-Tasks {
    Write-Header "Configurando CHANGELOG Validator"
    
    $windows = @(
        @{ Start = 10; End = 11; Name = "Mañana"; Prefix = "Mañana" },
        @{ Start = 15; End = 16; Name = "Tarde"; Prefix = "Tarde" },
        @{ Start = 19; End = 20; Name = "Noche"; Prefix = "Noche" }
    )
    
    $minutes = @(0, 20, 40)
    $taskCount = 0
    
    foreach ($window in $windows) {
        Write-Host "Configurando ventana $($window.Name) ($($window.Start):00 - $($window.End):00)" -ForegroundColor Yellow
        
        foreach ($min in $minutes) {
            $time = "{0:D2}:{1:D2}" -f $window.Start, $min
            $taskName = "ChangeBot\Validar-$($window.Prefix)-$time"
            
            try {
                $action = New-ScheduledTaskAction -Execute $NodeExe -Argument "changelog-validator.js" -WorkingDirectory $ProjectDir
                $trigger = New-ScheduledTaskTrigger -Daily -At $time
                $settings = New-ScheduledTaskSettingsSet -RunOnlyIfNetworkAvailable -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
                
                Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
                
                Write-Host "  ✓ Tarea creada: $time" -ForegroundColor Green
                $taskCount++
            } catch {
                Write-Host "  ✗ Error creando tarea: $_" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
    
    Write-Host "✓ Se crearon $taskCount tareas programadas" -ForegroundColor Green
}

function List-Tasks {
    Write-Header "Tareas de ChangeBot Programadas"
    
    try {
        $tasks = Get-ScheduledTask -TaskPath "\ChangeBot\*" -ErrorAction SilentlyContinue
        
        if ($tasks) {
            foreach ($task in $tasks) {
                $nextRun = $task.NextRunTime
                $lastRun = $task.LastRunTime
                Write-Host "📅 $($task.TaskName)" -ForegroundColor Cyan
                Write-Host "   Próxima ejecución: $nextRun"
                Write-Host "   Última ejecución: $lastRun"
                Write-Host ""
            }
        } else {
            Write-Host "No se encontraron tareas de ChangeBot" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error listando tareas: $_" -ForegroundColor Red
    }
}

function Remove-Tasks {
    Write-Header "Eliminando Tareas de ChangeBot"
    
    try {
        $tasks = Get-ScheduledTask -TaskPath "\ChangeBot\*" -ErrorAction SilentlyContinue
        
        if ($tasks) {
            foreach ($task in $tasks) {
                Unregister-ScheduledTask -TaskName $task.TaskName -Confirm:$false -ErrorAction SilentlyContinue
                Write-Host "✓ Tarea eliminada: $($task.TaskName)" -ForegroundColor Green
            }
            Write-Host "✓ Todas las tareas han sido eliminadas" -ForegroundColor Green
        } else {
            Write-Host "No hay tareas para eliminar" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Error eliminando tareas: $_" -ForegroundColor Red
    }
}

function Test-Validator {
    Write-Header "Probando Validador de CHANGELOG"
    
    Write-Host "Ejecutando validación manual..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        Set-Location $ProjectDir
        & $NodeExe test-private-message.js
    } catch {
        Write-Host "Error durante la prueba: $_" -ForegroundColor Red
    }
}

# Main
if ($Test) {
    Test-Validator
} elseif ($Remove) {
    Remove-Tasks
} elseif ($List) {
    List-Tasks
} elseif ($Setup) {
    Setup-Tasks
    Write-Host "ℹ️  Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Verifica las tareas: .\setup-scheduler.ps1 -List" -ForegroundColor Gray
    Write-Host "2. Prueba el validador: .\setup-scheduler.ps1 -Test" -ForegroundColor Gray
    Write-Host "3. Las validaciones se ejecutarán automáticamente" -ForegroundColor Gray
} else {
    Write-Header "CHANGELOG Validator - Configurador"
    Write-Host "Uso:" -ForegroundColor Cyan
    Write-Host "  .\setup-scheduler.ps1 -Setup    [Crear tareas programadas]" -ForegroundColor Gray
    Write-Host "  .\setup-scheduler.ps1 -List     [Listar tareas existentes]" -ForegroundColor Gray
    Write-Host "  .\setup-scheduler.ps1 -Remove   [Eliminar todas las tareas]" -ForegroundColor Gray
    Write-Host "  .\setup-scheduler.ps1 -Test     [Probar validador]" -ForegroundColor Gray
    Write-Host ""
}