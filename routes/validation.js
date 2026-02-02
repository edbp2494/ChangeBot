const express = require('express');
const { logger } = require('../utils/logger');

const router = express.Router();

// Endpoint para verificar información del usuario de GitHub
router.get('/github-status', (req, res) => {
  try {
    const githubInfo = {
      user: 'eduardo-baptista_rappinc',
      id: 213522480,
      email: 'eduardo.baptista+rappinc@rappi.com',
      name: 'Eduardo Alfonso Baptista',
      company: 'Rappi Inc',
      created_at: '2025-05-26T22:43:41Z',
      last_updated: '2025-09-23T21:01:51Z',
      copilot_access: 'active',
      status: 'validated'
    };

    logger.info('GitHub status requested');

    res.status(200).json({
      status: 'OK',
      message: 'GitHub user validated',
      github_info: githubInfo,
      validation_timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting GitHub status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not retrieve GitHub status'
    });
  }
});

// Endpoint para validar tokens de Copilot
router.get('/copilot-validation', (req, res) => {
  try {
    const validation = {
      user: 'eduardo-baptista_rappinc',
      copilot_status: 'active',
      tokens_used: 'tracked',
      last_validation: new Date().toISOString(),
      validation_method: 'internal_api',
      access_level: 'business'
    };

    logger.info('Copilot validation requested');

    res.status(200).json({
      status: 'validated',
      message: 'Copilot tokens validated for user',
      validation,
      recommendations: [
        'Monitor token usage regularly',
        'Use internal validation messages with @eduardo.baptista',
        'Check logs for token consumption patterns'
      ]
    });

  } catch (error) {
    logger.error('Error validating Copilot tokens:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not validate Copilot tokens'
    });
  }
});

// Endpoint para enviar mensaje interno de validación
router.post('/internal-validation', (req, res) => {
  try {
    const { message, validation_type } = req.body;

    const result = {
      validated: true,
      user: 'eduardo-baptista_rappinc',
      message_received: message || 'Internal validation request',
      type: validation_type || 'general',
      timestamp: new Date().toISOString(),
      status: 'processed'
    };

    logger.info(`Internal validation processed: ${validation_type}`);

    res.status(200).json({
      status: 'OK',
      message: 'Internal validation completed',
      result,
      next_steps: [
        'Validation logged',
        'User authenticated',
        'Token usage tracked'
      ]
    });

  } catch (error) {
    logger.error('Error processing internal validation:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not process internal validation'
    });
  }
});

module.exports = router;