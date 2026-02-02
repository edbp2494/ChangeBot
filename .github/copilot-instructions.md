<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# ChangeBot - Automatización de Validación de CHANGELOG

Este es un bot automatizado para validar mensajes de CHANGELOG en Slack (#qa-soporte) con integración a Jira.

## Funcionalidades Principales

1. **Validación Automática sin Bot Admin**: Detecta CHANGELOGs automáticamente sin permisos de admin
2. **3 Ventanas de Validación**: 10-11h, 15-16h, 19-20h con checks cada 20 minutos
3. **Integración Jira**: Valida estado "Closed" de tickets y evidencia
4. **Respuestas Automáticas**: Aprueba o solicita correcciones automáticamente
5. **Estado Persistente**: Rastrea CHANGELOGs en archivo local

## Arquitectura

- **Script Principal**: Node.js + Express (sin servidor HTTP necesario)
- **APIs**: Slack Web API + Jira REST API  
- **Automatización**: Windows Task Scheduler (cada 20 min en ventanas horarias)
- **Deployment**: Local con ejecución automática

## Configuración Completada ✅

El proyecto ChangeBot ha sido configurado exitosamente:

✅ **Script Principal**: changelog-validator.js (sin servidor HTTP)
✅ **Windows Task Scheduler**: setup-scheduler.ps1 configurado
✅ **Documentación Completa**: 5 guías de setup y uso
✅ **Validación de Estado**: changelog-state.json (auto-generado)
✅ **Notificaciones**: Integración directa con Slack API

## Documentación Creada

- **INDEX.md** - Índice y mapa del proyecto
- **QUICKSTART.md** - Guía de 3 pasos para empezar
- **SCHEDULER.md** - Documentación completa de horarios
- **SETUP_COMPLETE.md** - Verificación de lo que se creó
- **README.md** - Documentación técnica

## Estado: 🚀 Listo para Configuración

### Próximos Pasos Inmediatos

1. **Abre INDEX.md** - Lee el mapa del proyecto
2. **Abre QUICKSTART.md** - Sigue los 3 pasos de setup
3. **Configura .env** - Agrega tus tokens de Slack
4. **Ejecuta setup** - `.\setup-scheduler.ps1 -Setup`
5. **Verifica tareas** - `.\setup-scheduler.ps1 -List`

## Información de Usuario

- **GitHub User**: eduardo-baptista_rappinc
- **Email**: eduardo.baptista+rappinc@rappi.com
- **Tokens Validados**: ✅ Listos para configuración