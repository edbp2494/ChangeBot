#!/bin/bash
# Script de instalación rápida para ChangeBot
# Ejecutar: chmod +x quick-start.sh && ./quick-start.sh

echo ""
echo "=========================================="
echo "ChangeBot - Quick Start"
echo "=========================================="
echo ""

# Verificar si .env existe
if [ ! -f .env ]; then
    echo "⚠️  Archivo .env no encontrado"
    echo "Creando .env desde .env.example..."
    cp .env.example .env
    echo "✓ Archivo .env creado"
    echo ""
    echo "⚠️  IMPORTANTE: Edita .env y configura:"
    echo "   - SLACK_BOT_TOKEN"
    echo "   - SLACK_CHANNEL_ID"
    echo ""
else
    echo "✓ Archivo .env encontrado"
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "Descárgalo desde: https://nodejs.org"
    exit 1
fi

echo "✓ Node.js $(node --version) encontrado"
echo ""

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm install
    echo "✓ Dependencias instaladas"
    echo ""
fi

# Probar el validador
echo "Probando validador..."
node changelog-validator.js
echo ""

echo "=========================================="
echo "✓ ChangeBot está listo"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Edita .env con tus tokens de Slack/Jira"
echo "2. (En Windows) Ejecuta: .\setup-scheduler.ps1 -Setup"
echo "3. (En Linux/Mac) Configura cron jobs"
echo ""
echo "Documentación completa en SCHEDULER.md"
echo ""