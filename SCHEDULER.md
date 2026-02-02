# ChangeBot - Validación Automática Programada

Sistema automático de validación de CHANGELOGs en Slack sin necesidad de bot admin.

## 🎯 Características

### **Validación en 3 Ventanas Horarias**
- **10:00 - 11:00** (Mañana)
- **15:00 - 16:00** (Tarde)  
- **19:00 - 20:00** (Noche)

### **Dentro de cada ventana**
- ✅ Check cada **20 minutos** (automático)
- ✅ Detección inmediata de nuevos CHANGELOGs
- ✅ Notificaciones en tiempo real si falta validación
- ✅ **Buffer de 2 horas** para completar validaciones

### **Estado Persistente**
- Rastrea CHANGELOGs en archivo local `changelog-state.json`
- Evita notificaciones duplicadas
- Histórico de validaciones

## 📋 Requisitos Previos

### **1. Token de Slack (sin permisos de admin)**
- Ve a [api.slack.com/apps](https://api.slack.com/apps)
- Crea una nueva app o usa una existente
- Scopes necesarios:
  - `channels:history` - Leer historial del canal
  - `chat:write` - Enviar mensajes

### **2. Variable de entorno**
Copia `.env.example` a `.env` y completa:

```bash
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_CHANNEL_ID=C1234567890  # ID de #qa-soporte
```

### **3. Node.js instalado**
```bash
node --version  # v18 o superior
```

## 🚀 Configuración

### **Opción 1: PowerShell (Recomendado)**

```powershell
# Ejecutar como Administrador:

# 1. Crear tareas programadas
.\setup-scheduler.ps1 -Setup

# 2. Verificar tareas creadas
.\setup-scheduler.ps1 -List

# 3. Probar el validador
.\setup-scheduler.ps1 -Test
```

### **Opción 2: Batch Script**

```cmd
# Ejecutar como Administrador:
setup-scheduler.bat
```

### **Opción 3: Manual (PowerShell)**

```powershell
# Crear una tarea para probar a las 10:00
$time = "10:00"
$action = New-ScheduledTaskAction `
  -Execute "node" `
  -Argument "changelog-validator.js" `
  -WorkingDirectory "D:\Rappi\Changelog"

$trigger = New-ScheduledTaskTrigger -Daily -At $time

Register-ScheduledTask `
  -TaskName "ChangeBot\TestValidation" `
  -Action $action `
  -Trigger $trigger
```

## 📊 Cómo Funciona

```
10:00 ─→ Check #1 (Detecta CHANGELOGs nuevos)
         ↓ Envía notificación
         
10:20 ─→ Check #2 (Verifica validaciones pendientes)
         ↓ Notifica si faltan validaciones
         
10:40 ─→ Check #3 (Último check de la ventana)
         ↓ Recordatorio de límite de 2 horas
         
[Buffer de 2 horas para completar validaciones]

15:00 ─→ Segunda ventana de validación
         (Mismo proceso)

19:00 ─→ Última oportunidad de validación
```

## 📝 Estados de Validación

### **CHANGELOG Nuevo (🆕)**
```
Usuario envía:
CHANGELOG [mi-componente] [v1.0.0]
[RST-1867] Nueva feature
@qa-support

ChangeBot detecta automáticamente y notifica:
✓ Componente registrado
✓ Tickets extraídos
✓ Ventana para validar: 2 horas
```

### **Validación Pendiente (⏳)**
```
Si en el siguiente check el CHANGELOG no está validado:
⚠️ CHANGELOG pendiente
   - Componente: mi-componente
   - Versión: v1.0.0
   - Tiempo restante: 45 minutos
   - Acción: Cerrar tickets en Jira + agregar evidencia
```

### **Validación Completa (✅)**
```
Una vez que se cumplen todas las validaciones:
✓ Se da approved por parte de QA
  para CHANGELOG mi-componente v1.0.0
```

## 🔧 Gestión de Tareas

### **Listar tareas**
```powershell
schtasks /query /tn ChangeBot
# o
.\setup-scheduler.ps1 -List
```

### **Eliminar tareas**
```powershell
schtasks /delete /tn ChangeBot /f
# o
.\setup-scheduler.ps1 -Remove
```

### **Ver logs de ejecución**
```powershell
Get-WinEvent -LogPath "C:\Windows\System32\winevt\Logs\Microsoft-Windows-TaskScheduler%4Operational.evtx" | 
  Where-Object { $_.Message -like "*ChangeBot*" } | 
  Select-Object -First 10
```

## 📁 Archivos Importantes

- **changelog-validator.js** - Script principal de validación
- **changelog-state.json** - Estado persistente de CHANGELOGs (auto-generado)
- **setup-scheduler.ps1** - Configurador PowerShell
- **setup-scheduler.bat** - Configurador Batch
- **.env** - Variables de entorno con tokens

## 🔐 Seguridad

- Los tokens se guardan en `.env` (nunca commitar)
- El archivo `.gitignore` excluye archivos sensibles
- Las tareas se ejecutan bajo tu usuario
- Logs disponibles en Event Viewer de Windows

## 🐛 Solución de Problemas

### **Error: "not_authed"**
→ Verifica que `SLACK_BOT_TOKEN` esté correcto en `.env`

### **Tareas no se ejecutan**
→ Verifica que Windows Task Scheduler esté activo
→ Abre PowerShell/CMD como Administrador

### **No se envían notificaciones**
→ Confirma que `SLACK_CHANNEL_ID` es correcto
→ Verifica permisos del bot en el canal

### **Estado no se actualiza**
→ Elimina `changelog-state.json` y vuelve a ejecutar

## 📞 Próximos Pasos

1. **Configurar .env** con tus tokens
2. **Ejecutar setup**: `.\setup-scheduler.ps1 -Setup`
3. **Verificar tareas**: `.\setup-scheduler.ps1 -List`
4. **Probar**: `.\setup-scheduler.ps1 -Test`
5. **Esperar** a la próxima ventana de validación

---

**Estado**: ✅ Listo - Automático sin intervención manual