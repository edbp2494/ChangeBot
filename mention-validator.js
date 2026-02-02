const { WebClient } = require('@slack/web-api');
const moment = require('moment');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const BOT_USER_ID = 'U0973LJ4LP7'; // ID del bot changebot

/**
 * Validador optimizado para mentions @changebot
 * Ejecuta validaciones inmediatas cuando alguien menciona al bot
 */

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
    const component = match[1].trim();
    const version = match[2].trim();
    
    // Buscar tickets de Jira
    const ticketPattern = /[A-Z]+-\d+/g;
    const tickets = text.match(ticketPattern) || [];
    
    // Verificar si tiene las menciones requeridas (@qa-soporte)
    const hasMentions = /@qa-soporte|@channel|@here/.test(text);
    
    return {
      component,
      version,
      tickets: [...new Set(tickets)], // Remover duplicados
      hasMentions,
      fullText: text
    };
  }
  
  return null;
}

/**
 * Valida un mensaje específico por mention
 */
async function validateMentionedMessage(message) {
  console.log(`\n[${moment().format('YYYY-MM-DD HH:mm:ss')}] 🔔 Validación por mention detectada!`);
  console.log(`📍 Canal: ${message.source_channel || SLACK_CHANNEL_ID}`);
  console.log(`👤 Usuario: ${message.user}`);
  
  const changelog = parseChangelogMessage(message.text);
  
  if (!changelog) {
    console.log('❌ No se encontró CHANGELOG válido en el mensaje');
    
    // Responder con formato esperado
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🤖 *ChangeBot* - No encontré un CHANGELOG válido'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ *Formato correcto:*\n```CHANGELOG [Componente] [vX.X.X] [@qa-soporte] - TICKET-123```\n\n💡 Mencióname (@changebot) en un mensaje con CHANGELOG para validación inmediata.'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `⏰ Validación solicitada por <@${message.user}> • ${moment().format('HH:mm:ss')}`
            }
          ]
        }
      ],
      thread_ts: message.ts
    });
    return;
  }
  
  console.log(`📝 CHANGELOG detectado: ${changelog.component} v${changelog.version}`);
  console.log(`🎫 Tickets: ${changelog.tickets.join(', ')}`);
  console.log(`📢 Menciones: ${changelog.hasMentions ? 'Sí' : 'No'}`);
  
  // Validar inmediatamente
  try {
    const jiraService = require('./services/jiraService');
    const slackService = require('./services/slackService');
    
    console.log('🔍 Iniciando validación de Jira...');
    const validation = await jiraService.validateJiraTickets(changelog.tickets);
    
    const response = validation.isValid 
      ? slackService.buildApprovalMessage(changelog, validation)
      : slackService.buildPendingMessage(changelog, validation);
    
    // Agregar información de que fue validación por mention
    response.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🔔 Validación inmediata por mention • Solicitada por <@${message.user}> • ${moment().format('HH:mm:ss')}`
        }
      ]
    });
    
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      ...response,
      thread_ts: message.ts
    });
    
    console.log(`✅ Validación por mention completada: ${validation.isValid ? '🟢 APROBADO' : '🟡 PENDIENTE'}`);
    
    if (validation.isValid) {
      console.log('🎉 CHANGELOG aprobado automáticamente!');
    } else {
      console.log('⏳ CHANGELOG requiere correcciones:');
      validation.issues.forEach(issue => console.log(`   - ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Error validando mention:', error);\n    \n    await slack.chat.postMessage({\n      channel: message.source_channel || SLACK_CHANNEL_ID,\n      blocks: [\n        {\n          type: 'section',\n          text: {\n            type: 'mrkdwn',\n            text: '🤖 *ChangeBot* - Error de Validación'\n          }\n        },\n        {\n          type: 'section',\n          text: {\n            type: 'mrkdwn',\n            text: '❌ Ocurrió un error procesando tu CHANGELOG.\\n\\n🔄 Inténtalo de nuevo en unos minutos\\n📞 Si el problema persiste, contacta al administrador'\n          }\n        },\n        {\n          type: 'context',\n          elements: [\n            {\n              type: 'mrkdwn',\n              text: `⚠️ Error reportado por <@${message.user}> • ${moment().format('HH:mm:ss')}`\n            }\n          ]\n        }\n      ],\n      thread_ts: message.ts\n    });\n  }\n}\n\n/**\n * Obtiene mensajes recientes y busca mentions\n */\nasync function checkForMentions() {\n  console.log(`\\n[${moment().format('YYYY-MM-DD HH:mm:ss')}] 🔍 Buscando mentions de @changebot...`);\n  \n  try {\n    const channels = [SLACK_CHANNEL_ID];\n    \n    // Si hay un usuario interno configurado, también revisar mensajes directos\n    if (process.env.INTERNAL_USER_ID) {\n      channels.push(process.env.INTERNAL_USER_ID);\n    }\n\n    let mentionsFound = 0;\n    \n    for (const channel of channels) {\n      try {\n        // Solo buscar mensajes de los últimos 5 minutos para optimizar\n        const result = await slack.conversations.history({\n          channel: channel,\n          oldest: Math.floor(Date.now() / 1000) - (5 * 60), // 5 minutos\n          limit: 10 // Solo últimos 10 mensajes\n        });\n\n        if (result.messages) {\n          for (const msg of result.messages) {\n            if (msg.bot_id || msg.subtype === 'bot_message') continue;\n            \n            // Agregar metadata del canal\n            msg.source_channel = channel;\n            msg.is_dm = channel === process.env.INTERNAL_USER_ID;\n            \n            if (isBotMentioned(msg)) {\n              console.log(`🔔 MENTION encontrada: ${msg.ts}`);\n              await validateMentionedMessage(msg);\n              mentionsFound++;\n            }\n          }\n        }\n      } catch (error) {\n        console.error(`Error checking channel ${channel}:`, error.message);\n      }\n    }\n    \n    if (mentionsFound === 0) {\n      console.log('😴 No se encontraron mentions recientes');\n    } else {\n      console.log(`✅ Procesadas ${mentionsFound} mentions`);\n    }\n    \n  } catch (error) {\n    console.error('Error general buscando mentions:', error);\n  }\n}\n\n// Ejecutar si es llamado directamente\nif (require.main === module) {\n  console.log('🤖 ChangeBot - Validador de Mentions Iniciado');\n  console.log('🔔 Buscando mentions @changebot para validación inmediata...');\n  \n  checkForMentions()\n    .then(() => {\n      console.log('\\n🏁 Validación de mentions completada');\n    })\n    .catch(error => {\n      console.error('❌ Error en validación de mentions:', error);\n    });\n}\n\nmodule.exports = {\n  checkForMentions,\n  validateMentionedMessage,\n  isBotMentioned\n};