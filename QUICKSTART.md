# 🚀 SETUP RÁPIDO - ChangeBot

## Paso 1: Configurar Variables de Entorno

Abre el archivo `.env` y configura:

```bash
# Token de Slack (SIN permisos de admin requeridos)
SLACK_BOT_TOKEN=xoxb-your-token-here

# ID del canal #qa-soporte
SLACK_CHANNEL_ID=C1234567890

# (Opcional) Si usas Jira
JIRA_BASE_URL=https://company.atlassian.net
JIRA_USERNAME=user@company.com
JIRA_API_TOKEN=your-api-token
```

### ¿Cómo obtener estos valores?

**SLACK_BOT_TOKEN:**
1. Ve a [api.slack.com/apps](https://api.slack.com/apps)
2. Abre tu app
3. Sección "OAuth & Permissions"
4. Copia "Bot User OAuth Token"

**SLACK_CHANNEL_ID:**
1. En Slack, abre #qa-soporte
2. Click en el nombre del canal (arriba)
3. Busca el ID en el panel derecho (formato: C...)
3. O en los detalles: aparece en la URL como `C1234567890`

---

## Paso 2: Crear Tareas Programadas Automáticas

### **Windows (PowerShell como Administrador)**

```powershell
# Abre PowerShell como Admin y ejecuta:

cd D:\Rappi\Changelog
.\setup-scheduler.ps1 -Setup
```

Este comando crea 9 tareas automáticas:
- 3 checks en ventana de Mañana (10:00, 10:20, 10:40)
- 3 checks en ventana de Tarde (15:00, 15:20, 15:40)
- 3 checks en ventana de Noche (19:00, 19:20, 19:40)

### **Linux/Mac (Cron)**

```bash
# Edita tu crontab:
crontab -e

# Agrega estas líneas:
0,20,40 10 * * * cd /path/to/changebot && node changelog-validator.js
0,20,40 15 * * * cd /path/to/changebot && node changelog-validator.js
0,20,40 19 * * * cd /path/to/changebot && node changelog-validator.js
```

---

## Paso 3: Verificar que Funciona

### **Windows:**
```powershell
# Ver tareas creadas
.\setup-scheduler.ps1 -List

# Probar ahora mismo
.\setup-scheduler.ps1 -Test
```

### **Linux/Mac:**
```bash
# Probar ahora
node changelog-validator.js
```

---

## ✅ ¡Listo!

El bot está configurado. Ahora:

1. **El bot se ejecutará automáticamente** en las ventanas horarias
2. **Detectará CHANGELOGs** sin que hagas nada
3. **Enviará notificaciones** si falta validación
4. **No necesitas intervención manual** (a menos que haya errores)

---

## 📝 Ejemplo de Uso

Usuario escribe en #qa-soporte:
```
CHANGELOG [mi-componente] [v1.2.3]
[RST-1867] Nueva funcionalidad
[RST-1868] Bug fix
@qa-support
```

Dentro de 20 minutos (en la ventana activa):

✅ **ChangeBot detecta:**
- Nuevo CHANGELOG identificado
- Componente: mi-componente
- Versión: v1.2.3
- Tickets: RST-1867, RST-1868
- Buffer: 2 horas para completar validación

**Notificación en Slack:**
```
🆕 CHANGELOG Detectado
Componente: mi-componente
Versión: v1.2.3
Tickets: RST-1867, RST-1868
Validar dentro de 2 horas
```

---

## 🛠️ Gestión

### Ver todas las tareas (Windows):
```powershell
schtasks /query /tn ChangeBot
```

### Eliminar todas las tareas (Windows):
```powershell
.\setup-scheduler.ps1 -Remove
```

### Ver logs (Windows Event Viewer):
- Abre: Event Viewer
- Ve a: Windows Logs > System
- Filtra por "Task Scheduler"

---

## 🆘 Solución de Problemas

**"Tareas no se ejecutan"**
- Verifica que PowerShell se abrió como Administrador
- Revisa que las tareas se crearon: `.\setup-scheduler.ps1 -List`

**"Error de autenticación en Slack"**
- Verifica que SLACK_BOT_TOKEN es correcto en .env
- Revisa que el token no tiene caracteres extras

**"No se detectan CHANGELOGs"**
- Verifica que SLACK_CHANNEL_ID es correcto
- Prueba manualmente: `node changelog-validator.js`

**"Las notificaciones no llegan"**
- Confirma que el bot está en el canal #qa-soporte
- Verifica que tiene permiso `chat:write`

---

## 📞 Soporte

Para más información:
- Lee [SCHEDULER.md](SCHEDULER.md) - Guía completa
- Lee [README.md](README.md) - Documentación del proyecto