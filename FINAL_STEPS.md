# 🎯 ÚLTIMO PASO - Configurar Permisos de Slack

Tu token está configurado pero necesita más permisos. Aquí te explico cómo completar la configuración:

## 🔧 Paso 1: Configurar Permisos del Bot en Slack

### **Ir a la App de Slack:**
1. Ve a [api.slack.com/apps](https://api.slack.com/apps)
2. Busca y abre tu app existente (la que generó el token)

### **Configurar Scopes (Permisos):**
1. Ve a **OAuth & Permissions** en el menú izquierdo
2. Baja hasta **"Bot Token Scopes"**
3. Agrega estos permisos si no los tienes:

```
channels:history    → Leer historial de canales
channels:read       → Leer información de canales
chat:write          → Escribir mensajes
users:read          → Leer información de usuarios (opcional)
```

4. **Importante:** Después de agregar permisos, haz clic en **"Reinstall to Workspace"**

## 🎯 Paso 2: Obtener Channel ID

Después de reinstalar el bot, ejecuta:
```bash
node get-channel-id.js
```

Este script te dará el ID del canal #qa-soporte automáticamente.

## 📝 Paso 3: Configurar Channel ID

Cuando tengas el Channel ID, edítalo en `.env`:
```bash
SLACK_CHANNEL_ID=C1234567890  # Reemplaza con el ID real
```

---

## 🚀 Estado Actual:

✅ **Token configurado**  
✅ **9 tareas automáticas creadas**  
✅ **Sistema validador funcionando**  
⏳ **Solo falta**: Permisos del bot + Channel ID  

## ⏰ Recordatorio:

**Próxima ejecución automática:** Mañana a las 10:00  
**Después de eso:** Cada 20 minutos en ventanas horarias  
**Tú no haces nada:** Se ejecuta automáticamente  

---

## 🎉 Una vez configurado completamente:

```
Usuario escribe CHANGELOG en #qa-soporte
         ↓ (automático)
10:00 → ChangeBot detecta el mensaje
         ↓ (automático)  
10:00 → Valida formato y tickets Jira
         ↓ (automático)
10:00 → Responde en Slack con aprobación/pendientes
```

**¡Ya casi está listo!** Solo faltan los permisos del bot. 🚀