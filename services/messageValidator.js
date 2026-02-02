const { logger } = require('../utils/logger');

/**
 * Valida el formato del mensaje de CHANGELOG
 * @param {string} text - Texto del mensaje de Slack
 * @returns {Object} Resultado de la validación
 */
function validateMessage(text) {
  const issues = [];
  let isValid = true;

  // Verificar formato CHANGELOG
  const changelogPattern = /CHANGELOG\s+\[([^\]]+)\]\s+\[([^\]]+)\]/i;
  const changelogMatch = text.match(changelogPattern);
  
  if (!changelogMatch) {
    issues.push('❌ Formato incorrecto. Debe incluir: `CHANGELOG [nombre-componente] [versión]`');
    isValid = false;
  }

  // Verificar menciones obligatorias
  const requiredMentions = process.env.REQUIRED_MENTIONS?.split(',') || ['@qa-support', '@eduardo.baptista'];
  const missingMentions = requiredMentions.filter(mention => 
    !text.includes(mention.trim())
  );

  if (missingMentions.length > 0) {
    const mentionsNeeded = missingMentions.length === requiredMentions.length 
      ? requiredMentions.join(' y/o ')
      : missingMentions.join(', ');
    issues.push(`❌ Falta mención obligatoria: ${mentionsNeeded}`);
    isValid = false;
  }

  // Extraer tickets de Jira
  const ticketPattern = /([A-Z]+-\d+)/g;
  const tickets = [];
  let match;
  while ((match = ticketPattern.exec(text)) !== null) {
    if (!tickets.includes(match[1])) {
      tickets.push(match[1]);
    }
  }

  if (tickets.length === 0) {
    issues.push('❌ No se encontraron tickets de Jira (formato: ABC-123)');
    isValid = false;
  }

  const result = {
    isValid,
    issues,
    data: changelogMatch ? {
      componentName: changelogMatch[1],
      version: changelogMatch[2],
      tickets
    } : { tickets }
  };

  logger.info('Message validation result:', result);
  return result;
}

module.exports = {
  validateMessage
};