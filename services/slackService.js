const { WebClient } = require('@slack/web-api');
const { logger } = require('../utils/logger');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Envía respuesta automática en Slack
 * @param {string} channel - ID del canal
 * @param {string} timestamp - Timestamp del mensaje original
 * @param {Object} responseData - Datos para generar la respuesta
 */
async function sendSlackResponse(channel, timestamp, responseData) {
  try {
    let message = '';
    
    switch (responseData.type) {
      case 'approval':
        message = buildApprovalMessage(responseData);
        break;
      case 'error':
        message = buildErrorMessage(responseData);
        break;
      case 'pending':
        message = buildPendingMessage(responseData);
        break;
      default:
        logger.error('Unknown response type:', responseData.type);
        return;
    }

    await slack.chat.postMessage({
      channel: channel,
      text: message,
      thread_ts: timestamp, // Responder en hilo
      blocks: buildMessageBlocks(responseData)
    });

    logger.info(`Sent ${responseData.type} response to channel ${channel}`);

  } catch (error) {
    logger.error('Error sending Slack response:', error);
  }
}

/**
 * Construye mensaje de aprobación
 */
function buildApprovalMessage({ componentName, version }) {
  return `✅ Se da approved por parte de QA para CHANGELOG ${componentName} ${version}`;
}

/**
 * Construye mensaje de error de formato
 */
function buildErrorMessage({ issues, user }) {
  let message = `❌ <@${user}> El mensaje no cumple con el formato requerido:\n\n`;
  message += issues.join('\n');
  message += '\n\n📋 **Formato correcto:**\n';
  message += '```\nCHANGELOG [nombre-componente] [versión]\n[TICKET-XXX] Descripción\n@qa-support @usuario\n```';
  
  return message;
}

/**
 * Construye mensaje de pendientes
 */
function buildPendingMessage({ issues, componentName, version, user }) {
  let message = `⚠️ <@${user}> CHANGELOG ${componentName} ${version} tiene pendientes:\n\n`;
  message += issues.join('\n');
  message += '\n\n🔄 **Acciones requeridas:**\n';
  message += '• Cerrar tickets pendientes\n';
  message += '• Agregar evidencia (comentario o imagen)\n';
  message += '• Volver a enviar cuando esté completo';
  
  return message;
}

/**
 * Construye bloques estructurados para mejor visualización
 */
function buildMessageBlocks(responseData) {
  const blocks = [];

  switch (responseData.type) {
    case 'approval':
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: *CHANGELOG APROVADO*\n*Componente:* ${responseData.componentName}\n*Versión:* ${responseData.version}`
        }
      });
      break;

    case 'error':
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:x: *Formato Incorrecto*\n<@${responseData.user}> Por favor corrige los siguientes errores:`
        }
      });
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: responseData.issues.join('\n')
        }
      });

      blocks.push({
        type: 'divider'
      });

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Formato correcto:*\n```CHANGELOG [nombre-componente] [versión]\n[TICKET-XXX] Descripción\n@qa-support @usuario```'
        }
      });
      break;

    case 'pending':
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:warning: *CHANGELOG con Pendientes*\n*Componente:* ${responseData.componentName}\n*Versión:* ${responseData.version}\n<@${responseData.user}> Se encontraron los siguientes problemas:`
        }
      });

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: responseData.issues.join('\n')
        }
      });

      blocks.push({
        type: 'divider'
      });

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':recycle: *Acciones Requeridas:*\n• Cerrar tickets pendientes en Jira\n• Agregar evidencia (comentario con "evidencia" o imagen adjunta)\n• Volver a enviar el CHANGELOG cuando esté completo'
        }
      });
      break;
  }

  return blocks;
}

/**
 * Obtiene información del usuario de Slack
 */
async function getUserInfo(userId) {
  try {
    const response = await slack.users.info({ user: userId });
    return response.user;
  } catch (error) {
    logger.error(`Error getting user info for ${userId}:`, error);
    return null;
  }
}

/**
 * Menciona a usuarios específicos en un mensaje
 */
async function mentionUsers(channel, userIds, message) {
  try {
    const mentions = userIds.map(id => `<@${id}>`).join(' ');
    const fullMessage = `${mentions} ${message}`;
    
    await slack.chat.postMessage({
      channel: channel,
      text: fullMessage
    });

    logger.info(`Mentioned users ${userIds.join(', ')} in channel ${channel}`);
  } catch (error) {
    logger.error('Error mentioning users:', error);
  }
}

module.exports = {
  sendSlackResponse,
  getUserInfo,
  mentionUsers
};