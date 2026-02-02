const { WebClient } = require('@slack/web-api');
const moment = require('moment');
const axios = require('axios');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const BOT_USER_ID = 'U0973LJ4LP7'; // ID del bot changebot
const QA_SUPPORT_GROUP_ID = process.env.QA_SUPPORT_GROUP_ID; // ID del grupo @qa-support

// Sistema para evitar duplicados
const processedMessages = new Set();
const processedChangelogs = new Set();

// Limpiar cada 10 minutos
setInterval(() => {
  processedMessages.clear();
  processedChangelogs.clear();
}, 10 * 60 * 1000);

/**
 * Cliente Jira para validaciones
 */
class JiraValidator {
  constructor() {
    this.baseURL = `https://${process.env.JIRA_DOMAIN || 'rappidev.atlassian.net'}`;
    this.auth = {
      username: process.env.JIRA_EMAIL,
      password: process.env.JIRA_API_TOKEN
    };
    
    console.log(`🔧 Jira configurado: ${this.baseURL}`);
  }

  /**
   * Valida un ticket en Jira
   */
  async validateTicket(ticketId) {
    try {
      console.log(`🔍 ${ticketId}...`);
      
      // Probar primero con API v2
      let response;
      try {
        response = await axios.get(
          `${this.baseURL}/rest/api/2/issue/${ticketId}`,
          {
            auth: this.auth,
            params: {
              fields: 'status,summary,comment,attachment,created,updated,assignee'
            },
            timeout: 10000
          }
        );
      } catch (v2Error) {
        // Intentar con API v3 si v2 falla
        response = await axios.get(
          `${this.baseURL}/rest/api/3/issue/${ticketId}`,
          {
            auth: this.auth,
            params: {
              fields: 'status,summary,comment,attachment,created,updated,assignee'
            },
            timeout: 10000
          }
        );
      }

      const issue = response.data;
      const status = issue.fields.status.name;
      const summary = issue.fields.summary;
      const assignee = issue.fields.assignee?.displayName || issue.fields.assignee?.name || null;
      const assigneeEmail = issue.fields.assignee?.emailAddress || null;
      
      console.log(`   ${summary} - ${status}`);

      // Verificar estado cerrado - expandir lista de estados válidos
      const validStates = ['Closed', 'Done', 'Ready to Release', 'Resolved', 'Finalizada', 'Cerrado'];
      const isClosed = validStates.includes(status);
      
      // Buscar evidencia en comentarios
      let hasEvidence = false;
      if (issue.fields.comment && issue.fields.comment.comments && Array.isArray(issue.fields.comment.comments)) {
        hasEvidence = issue.fields.comment.comments.some(comment => {
          const bodyLower = (comment.body || '').toLowerCase();
          return bodyLower.includes('evidencia');
        });
        console.log(`     Evidencia en comentarios: ${hasEvidence}`);
      }

      // Verificar imágenes adjuntas (solo jpg, png, gif, etc. - no videos)
      let hasImages = false;
      if (issue.fields.attachment && Array.isArray(issue.fields.attachment) && issue.fields.attachment.length > 0) {
        hasImages = issue.fields.attachment.some(att => 
          att.mimeType && att.mimeType.startsWith('image/')
        );
        console.log(`     Imágenes adjuntas: ${hasImages}`);
      }
      
      const hasEvidenceOrImages = hasEvidence || hasImages;
      const isValid = isClosed && hasEvidenceOrImages;
      console.log(`     Validación Final: isClosed=${isClosed}, hasEvidence=${hasEvidence}, hasImages=${hasImages}, VÁLIDO=${isValid}`);

      return {
        ticketId,
        summary,
        status,
        isClosed,
        assignee,
        assigneeEmail,
        hasEvidence: hasEvidenceOrImages,
        valid: isValid
      };

    } catch (error) {
      console.error(`❌ ${ticketId}: ${error.response?.status} - ${error.message}`);
      
      if (error.response?.status === 404) {
        return {
          ticketId,
          summary: 'Ticket no encontrado',
          status: 'NOT_FOUND',
          isClosed: false,
          hasEvidence: false,
          valid: false,
          error: 'Ticket no encontrado en Jira'
        };
      }
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          ticketId,
          summary: 'Error de autenticación',
          status: 'AUTH_ERROR',
          isClosed: false,
          hasEvidence: false,
          valid: false,
          error: 'Error de autenticación con Jira'
        };
      }
      
      return {
        ticketId,
        summary: 'Error de validación',
        status: 'ERROR',
        isClosed: false,
        hasEvidence: false,
        valid: false,
        error: error.message
      };
    }
  }
}

const jiraValidator = new JiraValidator();

/**
 * Buscar user ID de Slack por email o username
 */
async function findSlackUserByEmail(email) {
  try {
    if (!email) return null;
    
    // Intentar lookup por email primero
    try {
      const result = await slack.users.lookupByEmail({ email });
      console.log(`   ✅ Usuario encontrado por email: ${result.user.id}`);
      return result.user.id;
    } catch (emailError) {
      // Si falla por email, intentar extraer username del email
      const username = email.split('@')[0]; // e.g., "eduardo.baptista"
      console.log(`   🔍 Intentando buscar por username: ${username}`);
      
      // Obtener lista de usuarios y buscar por nombre
      const users = await slack.users.list();
      
      for (const user of users.members) {
        // Buscar coincidencias en el campo "name" (username)
        if (user.name === username) {
          console.log(`   ✅ Usuario encontrado por nombre: ${user.id} (${user.name})`);
          return user.id;
        }
        
        // Fallback: buscar en real_name por si el nombre aparece allí
        if (user.real_name && user.real_name.toLowerCase().includes(username.replace('.', ' '))) {
          console.log(`   ✅ Usuario encontrado por real_name: ${user.id} (${user.real_name})`);
          return user.id;
        }
      }
      
      console.log(`   ℹ️ No se encontró usuario en Slack para ${email}`);
      return null;
    }
  } catch (error) {
    console.log(`   ℹ️ Error buscando usuario: ${error.message}`);
    return null;
  }
}

/**
 * Función para detectar mentions del bot
 */
function isBotMentioned(message) {
  if (!message.text) return false;
  
  const text = message.text.toLowerCase();
  
  // Buscar mention directa del bot o palabras clave
  const mentioned = text.includes(`<@${BOT_USER_ID.toLowerCase()}>`) || 
                   text.includes(`<@${BOT_USER_ID}>`) || 
                   text.includes('@changebot') ||
                   text.includes('@qa-support') ||
                   text.includes('changelog'); // También detectar si dice CHANGELOG
                   
  if (mentioned) {
    console.log(`🎯 Mention detectada en: "${message.text.substring(0, 50)}..."`);
  }
  
  return mentioned;
}

/**
 * Parsear mensaje de CHANGELOG
 */
function parseChangelogMessage(text) {
  console.log(`🔍 Parseando: "${text.substring(0, 100)}..."`);
  
  let component = 'unknown-component';
  let version = 'v1.0.0';
  
  // Buscar línea que contenga CHANGELOG
  const lines = text.split('\n');
  const changelogLine = lines.find(line => /changelog/i.test(line));
  
  if (changelogLine) {
    console.log(`📝 Línea CHANGELOG: "${changelogLine}"`);
    
    // Extraer versión (v1.89.0, 1.89.0, etc.)
    const versionMatch = changelogLine.match(/v?(\d+\.\d+(?:\.\d+)?)/i);
    if (versionMatch) {
      version = versionMatch[1];
      if (!version.startsWith('v')) {
        version = 'v' + version;
      }
      console.log(`🔢 Versión: ${version}`);
    }
    
    // Extraer componente después de CHANGELOG
    const afterChangelog = changelogLine.replace(/\*?changelog\*?/i, '').trim();
    const words = afterChangelog.split(/[\s\+]+/).filter(w => w.length > 0);
    
    for (const word of words) {
      if (!/v?\d+\.\d+/.test(word) && word.length > 2 && !/workes/i.test(word)) {
        component = word.replace(/[^\w-]/g, '');
        console.log(`🎯 Componente: ${component}`);
        break;
      }
    }
  }
  
  // Extraer tickets de Jira
  const ticketPattern = /[A-Z]+-\d+/g;
  const tickets = [...new Set(text.match(ticketPattern) || [])];
  
  console.log(`� CHANGELOG: ${component} ${version} | Tickets: ${tickets.join(', ')}`);
  
  // Buscar menciones requeridas (incluir mention directa del bot)
  const hasMentions = /@qa-support|@qa-soporte|@changebot/i.test(text) ||
                      text.includes(`<@${BOT_USER_ID}>`) ||
                      text.includes(`<@${BOT_USER_ID.toLowerCase()}>`);
  
  console.log(`🔍 Menciones: ${hasMentions ? '✅' : '❌'}`);
  
  // Extraer responsables mencionados
  const mentionPattern = /<@([UW][A-Z0-9]+)>/g;
  const mentions = [];
  let match;
  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return {
    component,
    version,
    tickets,
    hasMentions,
    mentions,
    originalText: text,
    isValid: tickets.length > 0 && hasMentions
  };
}

/**
 * Generar respuesta de validación completa
 */
async function generateValidationResponse(changelog, validationResults, originalUser) {
  const allValid = validationResults.every(result => result.valid);
  const jiraBaseUrl = 'https://rappidev.atlassian.net/browse';
  
  // Pre-procesar assignees: buscar user IDs de Slack
  for (const result of validationResults) {
    if (result.assigneeEmail) {
      const slackUserId = await findSlackUserByEmail(result.assigneeEmail);
      result.slackUserId = slackUserId;
      if (slackUserId) {
        console.log(`   ✅ Encontrado user Slack para ${result.assigneeEmail}: ${slackUserId}`);
      }
    }
  }
  
  if (allValid) {
    // ✅ Todos los tickets válidos - Generar APPROVED
    let response = '';
    
    for (const result of validationResults) {
      response += `* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - *${result.status}* :white_check_mark:\n`;
    }
    
    response += `\nSe da approved por parte de QA para CHANGELOG ${changelog.component} \`${changelog.version}\``;
    
    return {
      approved: true,
      message: response
    };
    
  } else {
    // ⚠️ Hay pendientes - NO generar approved
    let response = `⚠️ Validaciones pendientes para CHANGELOG ${changelog.component} \`${changelog.version}\`:\n\n`;
    
    for (const result of validationResults) {
      if (!result.valid) {
        if (result.error === 'Ticket no encontrado en Jira') {
          response += `* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> - Ticket no encontrado en Jira\n`;
        } else if (!result.isClosed) {
          response += `* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - *${result.status}*\n`;
        } else if (!result.hasEvidence) {
          response += `* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - 👀 *Falta evidencia*\n`;
        }
      } else {
        // ✅ Solo cuando ticket está cerrado Y tiene evidencia (completamente válido)
        response += `* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - *${result.status}* :white_check_mark:\n`;
      }
    }
    
    response += `\nCc: <@${originalUser}> ${QA_SUPPORT_GROUP_ID ? `<!subteam^${QA_SUPPORT_GROUP_ID}|@qa-support>` : '@qa-support'}`;
    
    return {
      approved: false,
      message: response
    };
  }
}

/**
 * Función principal de validación
 */
async function validateMentionedMessage(message) {
  if (processedMessages.has(message.ts)) {
    console.log(`⏭️ Mensaje ${message.ts} ya procesado`);
    return;
  }
  
  processedMessages.add(message.ts);
  console.log(`[${moment().format('HH:mm:ss')}] 🔔 Validación QA iniciada!`);
  
  // 1. PARSEAR MENSAJE
  const changelog = parseChangelogMessage(message.text);
  
  if (!changelog.isValid) {
    const errorMsg = !changelog.hasMentions 
      ? `<@${message.user}> ⚠️ Falta mención requerida (@qa-support o @changebot)`
      : `<@${message.user}> ⚠️ No encontré tickets válidos en el CHANGELOG`;
      
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      thread_ts: message.ts,
      text: errorMsg
    });
    return;
  }
  
  // Crear ID único para evitar duplicados (usar timestamp para evitar colisiones)
  const changelogId = `${changelog.component}-${changelog.version}-${changelog.tickets.join('-')}-${Date.now()}`;
  
  if (processedChangelogs.has(changelogId.replace(/-\d+$/, ''))) {
    console.log(`🔄 CHANGELOG similar ya procesado recientemente, omitiendo...`);
    return;
  }
  
  processedChangelogs.add(changelogId);
  
  try {
    console.log(`🎫 Validando tickets: ${changelog.tickets.join(', ')}`);
    
    // 2. VALIDAR CADA TICKET EN JIRA
    const validationResults = [];
    
    for (const ticketId of changelog.tickets) {
      const result = await jiraValidator.validateTicket(ticketId);
      validationResults.push(result);
      
      // Pequeña pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. GENERAR RESPUESTA
    const response = await generateValidationResponse(changelog, validationResults, message.user);
    
    // 4. ENVIAR RESPUESTA
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      thread_ts: message.ts,
      text: response.message
    });
    
    const status = response.approved ? '✅ APPROVED' : '⚠️ PENDIENTES';
    console.log(`${status} enviado para ${changelog.component} ${changelog.version}`);
    
  } catch (error) {
    console.error('❌ Error en validación:', error);
    processedChangelogs.delete(changelogId);
    
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      thread_ts: message.ts,
      text: `<@${message.user}> ❌ Error validando CHANGELOG: ${error.message}`
    });
  }
}

/**
 * Buscar mentions en el canal
 */
async function checkForMentions() {
  console.log(`[${moment().format('HH:mm:ss')}] 🔍 Buscando mentions QA...`);
  
  try {
    const result = await slack.conversations.history({
      channel: SLACK_CHANNEL_ID,
      oldest: Math.floor(Date.now() / 1000) - (15 * 60),
      limit: 20
    });

    let mentionsFound = 0;
    
    if (result.messages) {
      console.log(`📋 Revisando ${result.messages.length} mensajes`);
      
      for (const msg of result.messages) {
        if (msg.bot_id || !msg.user || !msg.text) continue;
        
        msg.source_channel = SLACK_CHANNEL_ID;
        
        if (isBotMentioned(msg)) {
          if (processedMessages.has(msg.ts)) {
            continue;
          }
          
          console.log(`🔔 MENTION QA encontrada: ${msg.ts}`);
          await validateMentionedMessage(msg);
          mentionsFound++;
        }
      }
    }
    
    console.log(mentionsFound > 0 ? `✅ Procesadas ${mentionsFound} validaciones QA` : '😴 Sin mentions nuevas');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  console.log('🤖 ChangeBot - Validador QA Completo');
  console.log('⏰ Ejecutando cada 20 segundos...\n');
  
  // Ejecutar inmediatamente
  checkForMentions()
    .catch(error => console.error('❌ Error:', error));
  
  // Luego ejecutar cada 20 segundos
  setInterval(() => {
    checkForMentions()
      .catch(error => console.error('❌ Error:', error));
  }, 20000);
}

module.exports = {
  checkForMentions,
  validateMentionedMessage,
  isBotMentioned
};