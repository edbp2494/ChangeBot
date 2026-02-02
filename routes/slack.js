const express = require('express');
const crypto = require('crypto');
const { WebClient } = require('@slack/web-api');
const { validateMessage } = require('../services/messageValidator');
const { validateJiraTickets } = require('../services/jiraService');
const { sendSlackResponse } = require('../services/slackService');
const { validateInternalMessage, sendInternalValidationResponse } = require('../services/internalValidator');
const { logger } = require('../utils/logger');

const router = express.Router();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Verificación de firma de Slack para seguridad
function verifySlackRequest(req, res, next) {
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  const body = JSON.stringify(req.body);
  
  if (!signature || !timestamp) {
    return res.status(400).json({ error: 'Missing Slack signature headers' });
  }

  const time = Math.floor(new Date().getTime() / 1000);
  if (Math.abs(time - timestamp) > 300) {
    return res.status(400).json({ error: 'Request timestamp too old' });
  }

  const sigBasestring = 'v0:' + timestamp + ':' + body;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
    .update(sigBasestring, 'utf8')
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature))) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  next();
}

// Webhook principal para eventos de Slack
router.post('/events', verifySlackRequest, async (req, res) => {
  try {
    const { type, challenge, event } = req.body;

    // Verificación inicial de URL (solo ocurre una vez)
    if (type === 'url_verification') {
      return res.json({ challenge });
    }

    // Procesar eventos de mensajes
    if (type === 'event_callback' && event.type === 'message') {
      // Evitar procesar mensajes del bot
      if (event.bot_id || event.subtype === 'bot_message') {
        return res.status(200).send('OK');
      }

      // Solo procesar mensajes del canal #qa-soporte
      if (event.channel !== process.env.SLACK_CHANNEL_ID) {
        return res.status(200).send('OK');
      }

      // Procesar mensaje de CHANGELOG de forma asíncrona
      processChangelogMessage(event);
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing Slack event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Procesar mensaje de CHANGELOG
async function processChangelogMessage(event) {
  try {
    const { text, user, ts, channel } = event;

    logger.info(`Processing message from user ${user}: ${text}`);

    // 0. Verificar si es un mensaje interno que requiere validación especial
    const internalValidation = await validateInternalMessage(event);
    
    if (internalValidation.needsValidation) {
      await sendInternalValidationResponse(channel, ts, internalValidation);
      
      // Si es solo validación interna, no procesar como CHANGELOG
      if (internalValidation.isInternal && !text.includes('CHANGELOG')) {
        return;
      }
    }

    // 1. Validar formato del mensaje
    const messageValidation = validateMessage(text);
    
    if (!messageValidation.isValid) {
      await sendSlackResponse(channel, ts, {
        type: 'error',
        issues: messageValidation.issues,
        user: user
      });
      return;
    }

    // 2. Extraer información del mensaje
    const { componentName, version, tickets } = messageValidation.data;

    // 3. Validar tickets en Jira
    const jiraValidation = await validateJiraTickets(tickets);

    // 4. Enviar respuesta basada en validaciones
    if (jiraValidation.allValid) {
      // ✅ Todo correcto - aprobar CHANGELOG
      await sendSlackResponse(channel, ts, {
        type: 'approval',
        componentName,
        version,
        user
      });
    } else {
      // ❌ Hay pendientes - listar faltantes
      await sendSlackResponse(channel, ts, {
        type: 'pending',
        issues: jiraValidation.issues,
        componentName,
        version,
        user
      });
    }

  } catch (error) {
    logger.error('Error processing CHANGELOG message:', error);
  }
}

module.exports = router;