const { WebClient } = require('@slack/web-api');
const { logger } = require('../utils/logger');

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Valida mensajes internos para usuarios específicos
 * @param {Object} event - Evento del mensaje de Slack
 * @returns {Object} Resultado de la validación interna
 */
async function validateInternalMessage(event) {
  try {
    const { text, user } = event;
    
    // Obtener información del usuario de Slack
    const userInfo = await slack.users.info({ user: user });
    const userEmail = userInfo.user.profile?.email || '';
    const displayName = userInfo.user.profile?.display_name || userInfo.user.real_name || '';
    
    logger.info(`Internal validation for user: ${displayName} (${userEmail})`);

    // Validaciones especiales para Eduardo Baptista
    if (userEmail.includes('eduardo.baptista') || displayName.includes('Eduardo')) {
      return validateEduardoMessage(text, userInfo.user);
    }

    // Validar uso de tokens de Copilot/GitHub
    if (text.toLowerCase().includes('copilot') || text.toLowerCase().includes('github')) {
      return validateCopilotUsage(text, userInfo.user);
    }

    return {
      isInternal: false,
      needsValidation: false
    };

  } catch (error) {
    logger.error('Error in internal message validation:', error);
    return {
      isInternal: false,
      needsValidation: false,
      error: error.message
    };
  }
}

/**
 * Validaciones específicas para Eduardo Baptista
 */
function validateEduardoMessage(text, user) {
  const validations = [];
  let isValid = true;

  // Validar formato de mensaje interno
  if (text.includes('INTERNAL') || text.includes('@eduardo.baptista')) {
    validations.push({
      type: 'internal_message',
      status: 'validated',
      message: `✅ Mensaje interno validado para ${user.profile.display_name}`
    });
  }

  // Validar tokens de GitHub/Copilot
  if (text.toLowerCase().includes('token')) {
    validations.push({
      type: 'token_usage',
      status: 'tracked',
      message: `📊 Uso de tokens detectado - Usuario: eduardo-baptista_rappinc`,
      github_user: 'eduardo-baptista_rappinc',
      email: 'eduardo.baptista+rappinc@rappi.com'
    });
  }

  return {
    isInternal: true,
    needsValidation: true,
    isValid,
    validations,
    user: {
      slack_id: user.id,
      github_user: 'eduardo-baptista_rappinc',
      email: 'eduardo.baptista+rappinc@rappi.com'
    }
  };
}

/**
 * Validar uso de Copilot y tokens
 */
function validateCopilotUsage(text, user) {
  const usage = {
    detected_keywords: [],
    github_user: 'eduardo-baptista_rappinc',
    timestamp: new Date().toISOString()
  };

  // Detectar keywords relacionadas
  const keywords = ['copilot', 'github', 'token', 'api', 'usage'];
  keywords.forEach(keyword => {
    if (text.toLowerCase().includes(keyword)) {
      usage.detected_keywords.push(keyword);
    }
  });

  return {
    isInternal: true,
    needsValidation: true,
    type: 'copilot_usage',
    usage,
    message: `🤖 Uso de Copilot detectado - Keywords: ${usage.detected_keywords.join(', ')}`
  };
}

/**
 * Envía respuesta para validaciones internas
 */
async function sendInternalValidationResponse(channel, timestamp, validation) {
  try {
    let message = '';
    const blocks = [];

    if (validation.type === 'copilot_usage') {
      message = `🤖 **Validación de Copilot**\n${validation.message}`;
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🤖 *Uso de GitHub Copilot Detectado*\n*Usuario GitHub:* \`eduardo-baptista_rappinc\`\n*Keywords:* ${validation.usage.detected_keywords.join(', ')}`
        }
      });

      blocks.push({
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `📊 Timestamp: ${validation.usage.timestamp}`
        }]
      });
    } else {
      // Respuesta para validaciones internas generales
      message = validation.validations.map(v => v.message).join('\n');
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Validación Interna*\n*Usuario:* <@${validation.user.slack_id}>\n*GitHub:* \`${validation.user.github_user}\`\n*Email:* \`${validation.user.email}\``
        }
      });
    }

    await slack.chat.postMessage({
      channel: channel,
      text: message,
      thread_ts: timestamp,
      blocks: blocks
    });

    logger.info(`Sent internal validation response to channel ${channel}`);

  } catch (error) {
    logger.error('Error sending internal validation response:', error);
  }
}

module.exports = {
  validateInternalMessage,
  sendInternalValidationResponse
};