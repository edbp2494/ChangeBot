<<<<<<< HEAD
# ChangeBot - Automatización de Validación de CHANGELOG

Bot automatizado para validar mensajes de CHANGELOG en Slack (#qa-soporte) con integración a Jira.

**Nota**: Sin necesidad de permisos de admin en Slack. Se ejecuta automáticamente cada 20 minutos en 3 ventanas horarias.

## 🚀 Funcionalidades Principales

### 1. **Validación Automática sin Bot Admin**
- ✅ Detecta CHANGELOGs automáticamente
- ✅ No requiere agregar bot al canal (solo acceso de lectura)
- ✅ Funciona 24/7 sin intervención manual

### 2. **3 Ventanas de Validación Programadas**
- **10:00 - 11:00** (Mañana)
- **15:00 - 16:00** (Tarde)
- **19:00 - 20:00** (Noche)

### 3. **Validación Inteligente dentro de Ventanas**
- Check cada **20 minutos** (automático)
- **Buffer de 2 horas** para completar validaciones
- Notificaciones inmediatas si falta validación
- Rastreo de estado persistente

### 4. **Integración con Jira**
- Verifica que tickets estén en estado "Closed"
- Valida evidencia en comentarios (palabra: "evidencia")
- Comprueba imágenes adjuntas recientes

### 5. **Respuestas Automáticas en Slack**
- ✅ Aprobación cuando todo está correcto
- ⚠️ Lista específica de pendientes
- ❌ Errores de formato con guía

### 4. **Validación Interna**
- 🤖 **Usuario GitHub**: eduardo-baptista_rappinc validado
- 📊 **Tokens Copilot**: Monitoreo automático de uso
- ✅ **Mensajes Internos**: Validación especial para @eduardo.baptista

## 🏗️ Arquitectura

```
ChangeBot/
├── changelog-validator.js   # Script principal (sin servidor HTTP)
├── services/
│   ├── messageValidator.js  # Validación de formato
│   ├── jiraService.js       # Integración con Jira
│   └── slackService.js      # Respuestas automáticas
├── utils/
│   └── logger.js            # Sistema de logs
├── setup-scheduler.ps1      # Configurador automático
├── changelog-state.json     # Estado persistente (auto-generado)
└── SCHEDULER.md             # Guía de configuración
```

## ⚙️ Configuración Rápida

### **1. Configurar variables de entorno**
```bash
cp .env.example .env
# Edita .env con tus tokens
```

### **2. Crear tareas programadas** (PowerShell como Admin)
```powershell
.\setup-scheduler.ps1 -Setup
```

### **3. Verificar tareas**
```powershell
.\setup-scheduler.ps1 -List
```

### **4. Probar validador**
```powershell
.\setup-scheduler.ps1 -Test
```

¡Listo! Las validaciones se ejecutarán automáticamente.

## 🔧 Configuración de Slack

### 1. **Crear/Usar App de Slack**
1. Ve a [api.slack.com/apps](https://api.slack.com/apps)
2. Crea una nueva app o usa una existente
3. **NO necesitas permiso de admin** para agregar al canal

### 2. **Scopes Necesarios** (Bot Token Scopes)
- `channels:history` - Leer historial del canal
- `chat:write` - Enviar mensajes en el canal
- `users:read` - Obtener información de usuarios (opcional)

### 3. **Instalar en Workspace**
1. Instala la app en tu workspace
2. Agrega el bot al canal `#qa-soporte` (si es necesario)
3. El bot puede leer sin ser admin

### 4. **Obtener Token y Channel ID**
- Token: Ve a **OAuth & Permissions** → **Bot User OAuth Token**
- Channel ID: En Slack, abre `#qa-soporte` → Click en nombre → Copia el ID (formato: C...)

## 🎯 Configuración de Jira

### 1. **API Token**
1. Ve a [id.atlassian.com/manage/api-tokens](https://id.atlassian.com/manage/api-tokens)
2. Crea un nuevo token
3. Configura en `.env`

### 2. **Permisos Necesarios**
- Leer issues
- Leer comentarios
- Leer attachments

## 📝 Uso

### **Formato de Mensaje Válido**
```
CHANGELOG [mi-componente] [v1.2.3]
[RST-1867] Implementación de nueva funcionalidad
[RST-1868] Corrección de bug crítico
@qa-support @eduardo.baptista
```

### **Respuestas del Bot**

**✅ Aprobación:**
```
✅ Se da approved por parte de QA para CHANGELOG mi-componente v1.2.3
```

**⚠️ Pendientes:**
```
⚠️ @usuario CHANGELOG mi-componente v1.2.3 tiene pendientes:

❌ RST-1867: Estado actual es "In Progress" (debe estar Closed)
❌ RST-1868: Falta evidencia (comentario con "evidencia" o imagen adjunta)

🔄 Acciones requeridas:
• Cerrar tickets pendientes
• Agregar evidencia (comentario o imagen)
• Volver a enviar cuando esté completo
```

## 🚀 Deployment

### **Opción 1: Servidor Local**
```bash
npm start
```

### **Opción 2: Docker** (opcional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### **Opción 3: Cloud (Heroku, AWS, etc.)**
1. Configura variables de entorno
2. Expone puerto correcto
3. URL pública para webhook

## 🔍 Monitoreo

### **Health Check**
```bash
curl http://localhost:3000/health
```

### **Logs**
El bot registra todas las actividades:
- Mensajes procesados
- Validaciones realizadas  
- Respuestas enviadas
- Errores encontrados

## 🛠️ Desarrollo

### **Estructura de Respuesta de Jira**
```javascript
{
  allValid: boolean,
  issues: string[],
  totalTickets: number
}
```

### **Agregar Nuevas Validaciones**
1. Edita `services/messageValidator.js`
2. Implementa nueva lógica
3. Agrega tests correspondientes

## 📞 Soporte y Validación

### **Endpoints de Validación**
```bash
# Estado de GitHub
GET http://localhost:3000/validation/github-status

# Validación de Copilot
GET http://localhost:3000/validation/copilot-validation

# Validación interna
POST http://localhost:3000/validation/internal-validation
```

### **Usuario GitHub Validado**
- **Usuario**: eduardo-baptista_rappinc
- **Email**: eduardo.baptista+rappinc@rappi.com
- **Copilot**: Acceso activo y monitoreado

Para problemas o mejoras:
1. Revisa logs del servidor
2. Verifica configuración de Slack/Jira
3. Confirma permisos y tokens

---
**Estado**: ✅ Funcional - Automático 24/7
=======
# ChangeBot

## 🚀 Instalación local

1. Copiá `.env.example` como `.env` y completá tus datos:
   - SLACK_BOT_TOKEN
   - SLACK_SIGNING_SECRET
   - JIRA_DOMAIN
   - JIRA_EMAIL
   - JIRA_API_TOKEN

2. Instalá dependencias:
>>>>>>> 6a0c5f99da501f1a235cad821e923ef68ecbca59
