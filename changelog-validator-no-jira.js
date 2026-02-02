const { WebClient } = require('@slack/web-api');
const moment = require('moment');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const BOT_USER_ID = 'U0973LJ4LP7';

const processedMessages = new Set();

/**
 * Parsear mensaje de CHANGELOG (mismo parser que funciona)
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
  
  // Extraer tickets
  const ticketPattern = /[A-Z]+-\d+/g;
  const tickets = [...new Set(text.match(ticketPattern) || [])];
  
  console.log(`📊 RESULTADO FINAL: ${component} ${version}, tickets: ${tickets.join(', ')}`);
  
  // Buscar menciones
  const hasMentions = /@qa-support|@qa-soporte|@changebot/i.test(text) ||
                      text.includes(`<@${BOT_USER_ID}>`) ||
                      text.includes(`<@${BOT_USER_ID.toLowerCase()}>`);
  
  return {
    component,
    version,
    tickets,
    hasMentions,
    isValid: tickets.length > 0 && hasMentions
  };
}

function isBotMentioned(message) {
  if (!message.text) return false;
  
  const text = message.text.toLowerCase();
  
  return text.includes(`<@${BOT_USER_ID.toLowerCase()}>`) || 
         text.includes(`<@${BOT_USER_ID}>`) || 
         text.includes('@changebot') ||
         text.includes('changelog');
}

async function validateMentionedMessage(message) {
  if (processedMessages.has(message.ts)) {
    return;
  }
  
  processedMessages.add(message.ts);
  console.log(`[${moment().format('HH:mm:ss')}] 🔔 Validación iniciada!`);
  
  const changelog = parseChangelogMessage(message.text);
  
  if (!changelog.isValid) {
    const errorMsg = !changelog.hasMentions 
      ? `<@${message.user}> ⚠️ Falta mención requerida (@changebot)`
      : `<@${message.user}> ⚠️ No encontré tickets válidos en el CHANGELOG`;
      
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      thread_ts: message.ts,
      text: errorMsg
    });
    return;
  }
  
  try {
    // Simular respuesta QA (sin validar Jira)
    let response = '';
    
    for (const ticketId of changelog.tickets) {
      response += `[${ticketId}] Título del ticket simulado - Ready to Release\n`;
    }
    
    response += `\nSe da approved por parte de QA para CHANGELOG ${changelog.component} \`${changelog.version}\``;
    
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      thread_ts: message.ts,
      text: response
    });
    
    console.log(`✅ RESPUESTA ENVIADA: ${changelog.component} ${changelog.version}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function checkForMentions() {
  console.log(`[${moment().format('HH:mm:ss')}] 🔍 Buscando mentions (SIN JIRA)...`);
  
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
          
          console.log(`🔔 MENTION encontrada: ${msg.ts}`);
          await validateMentionedMessage(msg);
          mentionsFound++;
        }
      }
    }
    
    console.log(mentionsFound > 0 ? `✅ Procesadas ${mentionsFound} validaciones` : '😴 Sin mentions nuevas');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  console.log('🤖 ChangeBot - Validador SIN JIRA (Solo Parser)');
  checkForMentions()
    .then(() => console.log('🏁 Completado'))
    .catch(error => console.error('❌ Error:', error));
}

module.exports = { checkForMentions, validateMentionedMessage, isBotMentioned };