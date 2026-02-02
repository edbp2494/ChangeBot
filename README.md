# ChangeBot - CHANGELOG Validator para Slack & Jira

Bot automatizado para validación de mensajes de CHANGELOG en Slack con integración a Jira.

## 🚀 Características

- **Validación automática de CHANGELOGs** contra Jira
- **Respuesta inmediata** cuando se menciona `@changebot`
- **Detección de evidencia** en comentarios y archivos adjuntos
- **Mención de grupo** @qa-support automática
- **Sin servidor HTTP** requerido (ejecución local)

## 📋 Requisitos

- Node.js 18+
- Slack Bot Token
- Jira API Token
- Acceso a API de Slack y Jira

## 🔧 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/edbp2494/ChangeBot.git
cd ChangeBot

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### Variables de Entorno Requeridas

```env
SLACK_BOT_TOKEN=xoxb-...              # Token del bot
SLACK_SIGNING_SECRET=...               # Signing secret
SLACK_CHANNEL_ID=C...                  # ID del canal
JIRA_DOMAIN=rappidev.atlassian.net     # Dominio Jira
JIRA_EMAIL=user@rappi.com             # Email Jira
JIRA_API_TOKEN=...                     # Token API Jira
QA_SUPPORT_GROUP_ID=S...               # ID del grupo @qa-support
```

## 📖 Uso

### Validación Inmediata

Menciona al bot en Slack con un CHANGELOG:

```
@changebot CHANGELOG [Componente] [v1.0.0] [@qa-soporte] - TICKET-123
```

### Ejecutar localmente

```bash
# Iniciar bot
npm start

# Desarrollo con auto-reload
npm run dev

# Configurar tareas programadas (Windows)
npm run setup
```

## 🏗️ Estructura del Proyecto

```
.
├── index.js                 # Punto de entrada principal
├── mention-validator.js     # Validador de mentions
├── changelog-validator.js   # Validador (legacy)
├── services/
│   ├── jiraService.js      # Integración Jira
│   ├── slackService.js     # Integración Slack
│   ├── messageValidator.js # Validación de mensajes
│   └── internalValidator.js
├── routes/
│   ├── slack.js            # Rutas Slack
│   └── validation.js       # Rutas de validación
├── utils/
│   └── logger.js           # Logging
├── package.json
└── .env
```

## 🔍 Cómo Funciona

### 1. Detección de Mentions
El bot revisa el canal cada 20 segundos buscando `@changebot`

### 2. Validación de Jira
Para cada ticket:
- ✅ Verifica estado cerrado
- ✅ Busca evidencia en comentarios
- ✅ Valida archivos adjuntos

### 3. Respuesta en Slack
Responde en el mismo hilo con validaciones

### Ejemplo de Respuesta

```
⚠️ Validaciones pendientes para CHANGELOG support-chats `v1.89.0`:

* SPHC-6835 [Android] Feature X - 👀 Falta evidencia
* SPTO-6355 [iOS] Feature Y - Finalizada ✅

Cc: @usuario <!subteam^S0XXXXXXXXXX|@qa-support>
```

## 🔐 Seguridad

- ✅ Credenciales en `.env` (no en git)
- ✅ Validación de firma Slack
- ✅ Autenticación Jira

## 📚 Documentación Adicional

- [INDEX.md](INDEX.md) - Mapa del proyecto
- [QUICKSTART.md](QUICKSTART.md) - Guía rápida
- [SCHEDULER.md](SCHEDULER.md) - Tareas programadas
- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Verificación

---

**Estado:** ✅ Listo para Producción  
**Última actualización:** Feb 2, 2026
