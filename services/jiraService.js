const axios = require('axios');
const moment = require('moment');
const { logger } = require('../utils/logger');

/**
 * Cliente de Jira configurado con autenticación
 */
class JiraClient {
  constructor() {
    this.baseURL = process.env.JIRA_BASE_URL;
    this.auth = {
      username: process.env.JIRA_USERNAME,
      password: process.env.JIRA_API_TOKEN
    };
  }

  /**
   * Obtiene información de un ticket de Jira
   */
  async getIssue(ticketId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/rest/api/2/issue/${ticketId}`,
        {
          auth: this.auth,
          params: {
            fields: 'status,created,updated,comment,attachment'
          }
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Error fetching Jira issue ${ticketId}:`, error.message);
      throw error;
    }
  }

  /**
   * Obtiene comentarios de un ticket
   */
  async getComments(ticketId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/rest/api/2/issue/${ticketId}/comment`,
        { auth: this.auth }
      );
      return response.data.comments || [];
    } catch (error) {
      logger.error(`Error fetching comments for ${ticketId}:`, error.message);
      return [];
    }
  }

  /**
   * Obtiene attachments de un ticket
   */
  async getAttachments(ticketId) {
    try {
      const issue = await this.getIssue(ticketId);
      return issue.fields.attachment || [];
    } catch (error) {
      logger.error(`Error fetching attachments for ${ticketId}:`, error.message);
      return [];
    }
  }
}

const jiraClient = new JiraClient();

/**
 * Valida una lista de tickets de Jira
 * @param {Array} tickets - Array de IDs de tickets
 * @returns {Object} Resultado de la validación
 */
async function validateJiraTickets(tickets) {
  const issues = [];
  let allValid = true;

  for (const ticketId of tickets) {
    try {
      logger.info(`Validating ticket: ${ticketId}`);
      
      const issue = await jiraClient.getIssue(ticketId);
      const ticketValidation = await validateSingleTicket(ticketId, issue);
      
      if (!ticketValidation.isValid) {
        allValid = false;
        issues.push(...ticketValidation.issues);
      }

    } catch (error) {
      allValid = false;
      issues.push(`❌ **${ticketId}**: Error al acceder al ticket - ${error.message}`);
    }
  }

  return {
    allValid,
    issues,
    totalTickets: tickets.length
  };
}

/**
 * Valida un solo ticket de Jira
 */
async function validateSingleTicket(ticketId, issue) {
  const issues = [];
  let isValid = true;

  // 1. Verificar estado "Closed"
  const status = issue.fields.status.name.toLowerCase();
  if (status !== 'closed' && status !== 'cerrado') {
    issues.push(`❌ **${ticketId}**: Estado actual es "${issue.fields.status.name}" (debe estar Closed)`);
    isValid = false;
  }

  // 2. Verificar evidencia en comentarios
  const hasEvidenceComment = await checkEvidenceInComments(ticketId);
  
  // 3. Verificar imágenes adjuntas recientes
  const hasRecentImages = await checkRecentAttachments(ticketId, issue);

  // Si no tiene evidencia ni imágenes recientes
  if (!hasEvidenceComment && !hasRecentImages) {
    issues.push(`❌ **${ticketId}**: Falta evidencia (comentario con "evidencia" o imagen adjunta)`);
    isValid = false;
  }

  return { isValid, issues };
}

/**
 * Verifica si hay comentarios con "evidencia"
 */
async function checkEvidenceInComments(ticketId) {
  try {
    const comments = await jiraClient.getComments(ticketId);
    
    return comments.some(comment => 
      comment.body.toLowerCase().includes('evidencia')
    );
  } catch (error) {
    logger.error(`Error checking comments for ${ticketId}:`, error);
    return false;
  }
}

/**
 * Verifica si hay imágenes adjuntas recientes
 */
async function checkRecentAttachments(ticketId, issue) {
  try {
    const attachments = issue.fields.attachment || [];
    
    if (attachments.length === 0) {
      return false;
    }

    // Obtener fecha de cierre del ticket
    const closedDate = issue.fields.updated ? moment(issue.fields.updated) : moment();
    
    // Buscar imágenes adjuntas en la fecha de cierre o posterior
    const recentImages = attachments.filter(attachment => {
      const attachmentDate = moment(attachment.created);
      const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(attachment.filename);
      const isRecent = attachmentDate.isSameOrAfter(closedDate, 'day');
      
      return isImage && isRecent;
    });

    return recentImages.length > 0;
  } catch (error) {
    logger.error(`Error checking attachments for ${ticketId}:`, error);
    return false;
  }
}

module.exports = {
  validateJiraTickets,
  jiraClient
};