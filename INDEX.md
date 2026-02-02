# 📚 ChangeBot - Índice de Documentación

## 🎯 POR DÓNDE EMPEZAR

### **Si es tu primera vez**
👉 Lee esto primero: [QUICKSTART.md](QUICKSTART.md) (5 minutos)
- Cómo obtener tokens
- Cómo configurar
- Cómo verificar que funciona

### **Si necesitas documentación completa**
👉 Lee esto: [SCHEDULER.md](SCHEDULER.md) (15 minutos)
- Cómo funcionan las ventanas de validación
- Cómo gestionar tareas
- Solución de problemas

### **Si quieres saber qué hay dentro**
👉 Lee esto: [README.md](README.md)
- Arquitectura del proyecto
- Características técnicas
- Configuración avanzada

### **Para verificar que todo está listo**
👉 Lee esto: [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- Resumen de lo que se creó
- Ventajas del sistema
- Próximos pasos

---

## 🗺️ MAPA DEL PROYECTO

```
ChangeBot/
│
├── 📖 DOCUMENTACIÓN
│   ├── QUICKSTART.md         ← EMPIEZA AQUÍ
│   ├── SCHEDULER.md          ← Documentación completa
│   ├── README.md             ← Características
│   └── SETUP_COMPLETE.md     ← Verificación final
│
├── ⚙️ CONFIGURACIÓN
│   ├── .env.example          ← Template (cópia a .env)
│   ├── .env                  ← Tus tokens (NO subir a git)
│   └── package.json          ← Dependencias
│
├── 🤖 SCRIPTS PRINCIPALES
│   ├── changelog-validator.js    ← El corazón del bot
│   ├── setup-scheduler.ps1       ← Configurar en Windows
│   ├── setup-scheduler.bat       ← Alternativa Batch
│   └── quick-start.sh            ← Para Linux/Mac
│
├── 💼 SERVICIOS
│   ├── services/
│   │   ├── messageValidator.js   ← Valida formato
│   │   ├── jiraService.js        ← Conecta con Jira
│   │   ├── slackService.js       ← Envía mensajes
│   │   └── internalValidator.js  ← Validaciones internas
│   │
│   └── utils/
│       └── logger.js             ← Sistema de logs
│
└── 📊 ESTADO
    └── changelog-state.json  ← Se genera automáticamente
```

---

## 📋 DECISIÓN RÁPIDA

### **¿Qué necesitas?**

| Pregunta | Respuesta |
|----------|-----------|
| **¿Cómo empiezo?** | [QUICKSTART.md](QUICKSTART.md) - 5 min |
| **¿Cómo funciona?** | [README.md](README.md) - 10 min |
| **¿Cómo configuro horarios?** | [SCHEDULER.md](SCHEDULER.md) - 15 min |
| **¿Qué se creó?** | [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - 3 min |
| **¿Dónde está el código?** | [services/](services) - Explora |
| **¿Cómo agrego tokens?** | [QUICKSTART.md](QUICKSTART.md) Paso 1 |

---

## ✅ CHECKLIST DE SETUP

```
□ 1. Leer QUICKSTART.md
□ 2. Obtener SLACK_BOT_TOKEN
□ 3. Obtener SLACK_CHANNEL_ID
□ 4. Editar .env con los tokens
□ 5. Ejecutar setup-scheduler.ps1 -Setup
□ 6. Ejecutar setup-scheduler.ps1 -List (verificar tareas)
□ 7. Ejecutar setup-scheduler.ps1 -Test (probar ahora)
□ 8. ¡Listo! Esperar a la próxima ventana (10:00, 15:00 o 19:00)
```

---

## 🔄 FLUJO TÍPICO

```
Usuario escribe CHANGELOG en Slack
           ↓
[Espera hasta ventana horaria]
           ↓
ChangeBot ejecuta automáticamente
           ↓
Lee todos los mensajes recientes
           ↓
Detecta CHANGELOGs sin validar
           ↓
Valida tickets en Jira
           ↓
Envía notificación en Slack
           ↓
Si todo OK → Aprueba
Si falta → Pide completar
Si error → Guía de corrección
```

---

## 📞 SOPORTE RÁPIDO

| Problema | Solución |
|----------|----------|
| "No sé por dónde empezar" | [QUICKSTART.md](QUICKSTART.md) - Paso 1 |
| "No sé cómo obtener tokens" | [QUICKSTART.md](QUICKSTART.md) - Paso 1 |
| "Las tareas no se ejecutan" | [SCHEDULER.md](SCHEDULER.md) - Troubleshooting |
| "No se detectan CHANGELOGs" | [SCHEDULER.md](SCHEDULER.md) - Troubleshooting |
| "¿Cómo cambio horarios?" | [SCHEDULER.md](SCHEDULER.md) - Gestión |
| "Quiero entender la arquitectura" | [README.md](README.md) - Arquitectura |

---

## 🎯 TU PRÓXIMO PASO

**→ Abre [QUICKSTART.md](QUICKSTART.md) ahora** ← 

Te mostrará exactamente qué hacer en 3 pasos simples.

---

**Usuario GitHub**: `eduardo-baptista_rappinc`
**Proyecto**: ChangeBot - Validación Automática de CHANGELOGs
**Estado**: ✅ Listo para usar