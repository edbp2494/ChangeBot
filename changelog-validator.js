const { WebClient } = require('@slack/web-api');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const mentionValidator = require('./mention-validator');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const BOT_USER_ID = 'U0973LJ4LP7'; // ID del bot changebot
const STATE_FILE = path.join(__dirname, 'changelog-state.json');

// Configuración de ventanas de validación
const VALIDATION_WINDOWS = [
  { start: 10, end: 11, name: 'Mañana' },
  { start: 15, end: 16, name: 'Tarde' },
  { start: 19, end: 20, name: 'Noche' }
];

const BUFFER_HOURS = 2; // Horas para completar validaciones después de CHANGELOG
const CHECK_INTERVAL = 20; // Minutos entre checks

/**
 * Obtiene el estado actual de validación
 */
function getState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error reading state file:', error);
  }
  return { changelogs: [], validatedAt: new Date().toISOString() };
}

/**
 * Guarda el estado de validación
 */
function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error writing state file:', error);
  }
}

/**
 * Obtiene mensajes del canal desde hace N horas
 */
async function getRecentMessages(hoursBack = 24) {
  try {
    const channels = [process.env.SLACK_CHANNEL_ID];
    
    // Si hay un usuario interno configurado, también revisar mensajes directos
    if (process.env.INTERNAL_USER_ID) {
      channels.push(process.env.INTERNAL_USER_ID);
    }

    let allMessages = [];

    for (const channel of channels) {
      try {
        const result = await slack.conversations.history({
          channel: channel,
          oldest: Math.floor(Date.now() / 1000) - (hoursBack * 3600)
        });

        if (result.messages) {
          // Marcar de qué canal vienen los mensajes
          const messagesWithSource = result.messages.map(msg => ({
            ...msg,
            source_channel: channel,
            is_dm: channel === process.env.INTERNAL_USER_ID
          }));
          allMessages.push(...messagesWithSource);
        }
      } catch (error) {
        logger.error(`Error fetching messages from ${channel}:`, error.message);
      }
    }

    return allMessages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

/**
 * Verifica si el mensaje menciona al bot
 */
function isBotMentioned(message) {
  if (!message.text) return false;
  
  // Buscar mention directa del bot
  const botMentionPattern = new RegExp(`<@${BOT_USER_ID}>`, 'i');
  if (botMentionPattern.test(message.text)) {
    return true;
  }
  
  // Buscar @changebot en el texto
  const nameMentionPattern = /@changebot/i;
  if (nameMentionPattern.test(message.text)) {
    return true;
  }
  
  return false;
}

/**
 * Extrae información de CHANGELOG del mensaje
 */
function parseChangelogMessage(text) {
  const changelogPattern = /CHANGELOG\s+\[([^\]]+)\]\s+\[([^\]]+)\]/i;
  const match = text.match(changelogPattern);
  
  if (match) {
    const ticketPattern = /([A-Z]+-\d+)/g;
    const tickets = [];
    let ticketMatch;
    
    while ((ticketMatch = ticketPattern.exec(text)) !== null) {
      tickets.push(ticketMatch[1]);
    }

    return {
      component: match[1],
      version: match[2],
      tickets: tickets,
      hasMentions: text.includes('@qa-support') || text.includes('@eduardo.baptista'),
      text: text
    };
  }

  return null;
}

/**
 * Verifica si está en ventana de validación
 */
function isInValidationWindow() {
  const now = moment();
  const hour = now.hour();
  const minute = now.minute();
  
  return VALIDATION_WINDOWS.some(window => {
    if (hour === window.start) {
      return true; // Cualquier minuto de la hora inicial
    }
    if (hour === window.end && minute < 60) {
      return true; // Durante la hora final
    }
  });
}

/**
 * Obtiene la ventana de validación actual
 */
function getCurrentWindow() {
  const now = moment();
  const hour = now.hour();
  
  return VALIDATION_WINDOWS.find(window => {
    return (hour >= window.start && hour < window.end) || 
           (hour === window.end && now.minute() < 60);
  });
}

/**
 * Valida un mensaje específico por mention
 */
async function validateMentionedMessage(message) {
  console.log(`\n[${moment().format('YYYY-MM-DD HH:mm:ss')}] 🔔 Validación por mention detectada!`);
  
  const changelog = parseChangelogMessage(message.text);
  if (!changelog) {
    // Responder que no se encontró CHANGELOG válido
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      text: `🤖 Hola! No encontré un formato de CHANGELOG válido en tu mensaje.\n\n✅ **Formato correcto:**\n\`CHANGELOG [Componente] [vX.X.X] [@qa-soporte] - TICKET-123\`\n\n💡 Mencióname en un mensaje con CHANGELOG para validación inmediata.`,
      thread_ts: message.ts
    });
    return;
  }
  
  console.log(`📝 CHANGELOG detectado: ${changelog.component} v${changelog.version}`);
  
  // Validar inmediatamente
  const jiraService = require('./services/jiraService');
  const slackService = require('./services/slackService');
  
  try {
    const validation = await jiraService.validateJiraTickets(changelog.tickets);
    const response = validation.isValid 
      ? slackService.buildApprovalMessage(changelog, validation)
      : slackService.buildPendingMessage(changelog, validation);
    
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      ...response,
      thread_ts: message.ts
    });
    
    console.log(`✅ Validación por mention completada: ${validation.isValid ? 'APROBADO' : 'PENDIENTE'}`);
    
  } catch (error) {
    console.error('Error validando mention:', error);
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      text: `🤖 ❌ Error procesando tu CHANGELOG. Inténtalo de nuevo o contacta al administrador.`,
      thread_ts: message.ts
    });
  }
}

/**
 * Valida CHANGELOGs pendientes
 */
async function validateChangelogs() {
  console.log(`\n[${moment().format('YYYY-MM-DD HH:mm:ss')}] 🚀 Iniciando validación completa...`);

  // PRIORIDAD 1: Validar mentions inmediatamente
  console.log('🔔 Paso 1: Buscando mentions @changebot...');
  await mentionValidator.checkForMentions();

  // PRIORIDAD 2: Validaciones programadas (solo en ventanas de tiempo)
  if (!isInValidationWindow()) {
    console.log('⏰ Fuera de ventana de validación - Solo mentions procesadas');
    return;
  }

  console.log('📅 Paso 2: Validaciones programadas de CHANGELOGs...');
  
  const state = getState();
  const messages = await getRecentMessages(24);
  let newChangelogs = [];
  let pendingValidations = [];

  // Procesar CHANGELOGs (excluyendo los que ya fueron procesados por mention)
  for (const msg of messages) {
    if (msg.bot_id || msg.subtype === 'bot_message') continue;
    
    // Skip mensajes con mentions ya procesados
    if (mentionValidator.isBotMentioned(msg)) {
      continue;
    }
    
    const changelog = parseChangelogMessage(msg.text);
    if (!changelog) continue;

    const msgTimestamp = moment.unix(msg.ts.split('.')[0]);
    const changelogId = `${msg.ts}`;
    const existingChangelog = state.changelogs.find(c => c.id === changelogId);

    if (!existingChangelog) {
      // CHANGELOG nuevo
      const newEntry = {
        id: changelogId,
        component: changelog.component,
        version: changelog.version,
        tickets: changelog.tickets,
        user: msg.user,
        timestamp: msgTimestamp.toISOString(),
        detectedAt: new Date().toISOString(),
        hasMentions: changelog.hasMentions,
        status: 'pending',
        lastChecked: new Date().toISOString()
      };

      state.changelogs.push(newEntry);
      newChangelogs.push(newEntry);

      console.log(`✓ CHANGELOG NUEVO: ${changelog.component} v${changelog.version}`);
    } else {
      // CHANGELOG existente
      const hoursSinceCreation = moment().diff(moment(existingChangelog.timestamp), 'hours');

      if (existingChangelog.status === 'pending' && hoursSinceCreation <= BUFFER_HOURS) {
        pendingValidations.push({
          ...existingChangelog,
          hoursSinceCreation,
          hoursRemaining: BUFFER_HOURS - hoursSinceCreation
        });
      }
    }
  }

  saveState(state);

  // Notificar sobre nuevos CHANGELOGs
  if (newChangelogs.length > 0) {
    await notifyNewChangelogs(newChangelogs);
  }

  // Notificar sobre pendientes
  if (pendingValidations.length > 0) {
    await notifyPendingValidations(pendingValidations);
  }

  // Mostrar resumen
  showSummary(state, newChangelogs, pendingValidations);

  return {
    newChangelogs,
    pendingValidations,
    windowActive: isInValidationWindow(),
    currentWindow: getCurrentWindow()
  };
}

/**
 * Notifica sobre nuevos CHANGELOGs
 */
async function notifyNewChangelogs(changelogs) {
  for (const changelog of changelogs) {
    const hours = Math.round(moment().diff(moment(changelog.timestamp), 'hours', true) * 10) / 10;
    
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🆕 *CHANGELOG Detectado*\n*Componente:* ${changelog.component}\n*Versión:* ${changelog.version}\n*Tickets:* ${changelog.tickets.join(', ')}\n*Usuario:* <@${changelog.user}>`
        }
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `⏱️ Detected hace ${hours} hora(s) | Validar dentro de ${BUFFER_HOURS} horas`
        }]
      }
    ];

    try {
      await slack.chat.postMessage({
        channel: SLACK_CHANNEL_ID,
        text: `CHANGELOG ${changelog.component} v${changelog.version} detectado`,
        blocks: blocks
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}

/**
 * Notifica sobre CHANGELOGs pendientes
 */
async function notifyPendingValidations(pending) {
  for (const changelog of pending) {
    const statusEmoji = changelog.hoursRemaining > 1 ? '⏳' : '⚠️';
    
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${statusEmoji} *CHANGELOG Pendiente*\n*Componente:* ${changelog.component}\n*Versión:* ${changelog.version}\n*Tiempo Restante:* ${Math.round(changelog.hoursRemaining * 60)} minutos`
        }
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `📋 Recordatorio: Completa la validación en Jira (cerrar tickets + evidencia)`
        }]
      }
    ];

    try {
      await slack.chat.postMessage({
        channel: SLACK_CHANNEL_ID,
        text: `Validación pendiente: ${changelog.component}`,
        blocks: blocks
      });
    } catch (error) {
      console.error('Error sending pending notification:', error);
    }
  }
}

/**
 * Muestra resumen de validación
 */
function showSummary(state, newChangelogs, pendingValidations) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE VALIDACIÓN');
  console.log('='.repeat(60));
  console.log(`Ventana Activa: ${isInValidationWindow() ? '✅ SÍ (' + (getCurrentWindow()?.name || 'N/A') + ')' : '❌ NO'}`);
  console.log(`CHANGELOGs Nuevos: ${newChangelogs.length}`);
  console.log(`CHANGELOGs Pendientes: ${pendingValidations.length}`);
  console.log(`CHANGELOGs Totales Registrados: ${state.changelogs.length}`);
  console.log(`Última Validación: ${state.validatedAt}`);
  
  if (pendingValidations.length > 0) {
    console.log('\n⏳ PENDIENTES:');
    pendingValidations.forEach(p => {
      console.log(`  - ${p.component} v${p.version} (${Math.round(p.hoursRemaining * 60)} min restantes)`);
    });
  }
  
  console.log('='.repeat(60) + '\n');
}

/**
 * Ejecuta validación completa
 */
async function runValidation() {
  try {
    const result = await validateChangelogs();
    return result;
  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runValidation().then(result => {
    console.log('\nValidación completada exitosamente');
    process.exit(0);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateChangelogs,
  getState,
  saveState,
  VALIDATION_WINDOWS,
  isInValidationWindow,
  getCurrentWindow
};