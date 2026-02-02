const { WebClient } = require('@slack/web-api');
const moment = require('moment');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const BOT_USER_ID = 'U0973LJ4LP7'; // ID del bot changebot

// Sistema para evitar duplicados
const processedMessages = new Set();
const processedChangelogs = new Set(); // Nuevo: rastrear CHANGELOGs procesados

// Limpiar mensajes procesados cada 10 minutos
setInterval(() => {
  processedMessages.clear();
  processedChangelogs.clear();
}, 10 * 60 * 1000);

// Función para verificar si el último mensaje fue del bot
async function isLastMessageFromBot(channel) {
  try {
    const result = await slack.conversations.history({
      channel: channel,
      limit: 10 // Revisar los últimos 10 mensajes
    });
    
    if (result.messages && result.messages.length > 0) {
      // Buscar el último mensaje que no sea del usuario actual que está haciendo mention
      for (const msg of result.messages) {
        // Verificar si es mensaje del bot ChangeBot
        if (msg.bot_id === BOT_USER_ID || 
            msg.user === BOT_USER_ID ||
            (msg.bot_profile && msg.bot_profile.id === BOT_USER_ID) ||
            (msg.text && msg.text.includes('Se da approved por parte de QA'))) {
          
          console.log(`🔍 Último mensaje relevante del bot encontrado: ${msg.ts}`);
          return true;
        }
        
        // Si encontramos un mensaje de usuario que no es bot, el bot puede responder
        if (msg.user && !msg.bot_id && !msg.subtype) {
          console.log(`🔍 Último mensaje de usuario encontrado: ${msg.ts}`);
          return false;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Error verificando último mensaje:', error);
    return false; // En caso de error, permitir respuesta
  }
}

// Función principal para validar mentions
function isBotMentioned(message) {
  if (!message.text) return false;
  
  const text = message.text.toLowerCase();
  
  // Buscar mention directa del bot
  if (text.includes(`<@${BOT_USER_ID.toLowerCase()}>`) || message.text.includes(`<@${BOT_USER_ID}>`)) {
    console.log(`🎯 Mention directa detectada: <@${BOT_USER_ID}>`);
    return true;
  }
  
  // Buscar @changebot en el texto
  if (text.includes('@changebot')) {
    console.log('🎯 Mention por nombre detectada: @changebot');
    return true;
  }
  
  return false;
}

// Función para parsear CHANGELOG de manera flexible
function parseChangelogMessage(text) {
  // Buscar la palabra CHANGELOG (flexible)
  const hasChangelog = /changelog/i.test(text);
  
  // Buscar tickets de Jira siempre
  const ticketPattern = /[A-Z]+-\d+/g;
  const tickets = text.match(ticketPattern) || [];
  
  // Buscar versiones (v1.0.0, 1.0.0, etc.)
  const versionPattern = /v?\d+\.\d+(?:\.\d+)?/g;
  const versions = text.match(versionPattern) || [];
  
  // Detectar componente del mensaje original
  let component = 'Componente';
  
  // Método 1: Buscar después de CHANGELOG
  if (hasChangelog) {
    const afterChangelog = text.split(/changelog\s+/i)[1];
    if (afterChangelog) {
      const words = afterChangelog.trim().split(/\s+/);
      if (words[0] && !ticketPattern.test(words[0]) && !versionPattern.test(words[0])) {
        component = words[0];
      }
    }
  }
  
  // Método 2: Buscar palabras que parezcan componentes (sin guiones ni números de ticket)
  const possibleComponents = text.split(/\s+/).filter(word => 
    word.length > 3 && 
    !ticketPattern.test(word) && 
    !versionPattern.test(word) &&
    !/^[@#+]/.test(word) &&
    !/^(cc:|https?:)/.test(word.toLowerCase())
  );
  
  if (possibleComponents.length > 0) {
    component = possibleComponents[0];
  }
  
  // Buscar menciones requeridas
  const hasMentions = /@qa-soporte|@channel|@here/.test(text);
  
  // Si tiene CHANGELOG o tickets, considerarlo válido
  if (hasChangelog || tickets.length > 0) {
    return {
      component: component.replace(/[^\w\s-]/g, ''), // Limpiar caracteres especiales
      version: versions[0] || 'v1.0.0',
      tickets: [...new Set(tickets)],
      hasMentions,
      fullText: text,
      isFlexibleFormat: !hasChangelog // Indica si fue detección flexible
    };
  }
  
  return null;
}

// Función para validar mensaje con mention
async function validateMentionedMessage(message) {
  // Evitar procesar el mismo mensaje múltiples veces
  if (processedMessages.has(message.ts)) {
    console.log(`⏭️ Mensaje ${message.ts} ya procesado, omitiendo...`);
    return;
  }
  
  processedMessages.add(message.ts);
  console.log(`[${moment().format('HH:mm:ss')}] 🔔 Validación por mention detectada!`);
  
  const changelog = parseChangelogMessage(message.text);
  
  if (!changelog || changelog.tickets.length === 0) {
    // Enviar mensaje indicando que no se encontró CHANGELOG válido
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      thread_ts: message.ts,
      text: `<@${message.user}> No encontré un CHANGELOG válido con tickets en tu mensaje. Asegúrate de incluir tickets de Jira.`,
    });
    return;
  }
  
  // Crear identificador único para el CHANGELOG
  const changelogId = `${changelog.component}-${changelog.version}-${changelog.tickets.join('-')}`;
  
  // Verificar si ya procesamos este CHANGELOG
  if (processedChangelogs.has(changelogId)) {
    console.log(`🔄 CHANGELOG ${changelogId} ya procesado, omitiendo respuesta duplicada...`);
    return;
  }
  
  // Verificar si el último mensaje fue del bot
  const lastMessageIsBot = await isLastMessageFromBot(message.source_channel || SLACK_CHANNEL_ID);
  if (lastMessageIsBot) {
    console.log(`🤖 Último mensaje fue del bot, esperando nueva mención para responder`);
    return;
  }
  
  processedChangelogs.add(changelogId);
  
  try {
    console.log(`📝 CHANGELOG detectado: ${changelog.component} ${changelog.version}`);
    console.log(`🎫 Tickets: ${changelog.tickets.join(', ')}`);
    
    // Formato requerido: [TICKET] Descripción - Ready to Release
    // Se da approved por parte de QA para CHANGELOG componente vX.X.X
    const mainTicket = changelog.tickets[0]; // Usar el primer ticket como principal
    const allTickets = changelog.tickets.length > 1 ? ` (${changelog.tickets.join(', ')})` : '';
    
    const responseText = `[${mainTicket}] Bot no muestra las opciones para contactar con soporte merchant - Ready to Release${allTickets}\n\nSe da approved por parte de QA para CHANGELOG ${changelog.component} ${changelog.version}`;
    
    // Enviar respuesta en hilo
    await slack.chat.postMessage({
      channel: message.source_channel || SLACK_CHANNEL_ID,
      thread_ts: message.ts,
      text: responseText,
    });
    
    console.log(`✅ Respuesta enviada con formato correcto para CHANGELOG: ${changelogId}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    // Remover de procesados si falla
    processedChangelogs.delete(changelogId);
    
    // Enviar mensaje de error
    try {
      await slack.chat.postMessage({
        channel: message.source_channel || SLACK_CHANNEL_ID,
        thread_ts: message.ts,
        text: `<@${message.user}> Error procesando tu mensaje: ${error.message}`,
      });
    } catch (secondError) {
      console.error('❌ Error enviando mensaje de error:', secondError);
    }
  }
}

// Función para buscar mentions
async function checkForMentions() {
  console.log(`[${moment().format('HH:mm:ss')}] 🔍 Buscando mentions en canal ${SLACK_CHANNEL_ID}...`);
  
  try {
    const result = await slack.conversations.history({
      channel: SLACK_CHANNEL_ID,
      oldest: Math.floor(Date.now() / 1000) - (15 * 60), // 15 minutos en lugar de 5
      limit: 20 // Más mensajes
    });

    let mentionsFound = 0;
    
    if (result.messages) {
      console.log(`📋 Encontrados ${result.messages.length} mensajes para revisar`);
      
      for (const msg of result.messages) {
        // Ignorar mensajes del bot y mensajes de sistema
        if (msg.bot_id || 
            msg.subtype === 'bot_message' || 
            msg.subtype === 'channel_join' ||
            msg.text?.includes('has joined the channel') ||
            msg.text?.includes('has left the channel') ||
            !msg.user) {
          continue;
        }
        
        msg.source_channel = SLACK_CHANNEL_ID;
        
        // Log de cada mensaje para debugging
        console.log(`📝 Revisando mensaje ${msg.ts}: "${msg.text?.substring(0, 50)}..."`);
        
        if (isBotMentioned(msg)) {
          // Evitar procesar duplicados
          if (processedMessages.has(msg.ts)) {
            console.log(`⏭️ Mensaje ${msg.ts} ya procesado anteriormente`);
            continue;
          }
          
          console.log(`🔔 MENTION encontrada: ${msg.ts}`);
          await validateMentionedMessage(msg);
          mentionsFound++;
        }
      }
    } else {
      console.log('❌ No se pudieron obtener mensajes');
    }
    
    console.log(mentionsFound > 0 ? `✅ Procesadas ${mentionsFound} mentions` : '😴 No hay mentions nuevas');
    
  } catch (error) {
    console.error('❌ Error accediendo al canal:', error.message);
    if (error.data && error.data.error) {
      console.error(`   Código de error Slack: ${error.data.error}`);
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  console.log('🤖 ChangeBot - Validador de Mentions');
  checkForMentions()
    .then(() => console.log('🏁 Completado'))
    .catch(error => console.error('❌ Error:', error));
}

module.exports = {
  checkForMentions,
  validateMentionedMessage,
  isBotMentioned
};