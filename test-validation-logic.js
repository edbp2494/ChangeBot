require('dotenv').config();
const axios = require('axios');

const JIRA_BASE = `https://${process.env.JIRA_DOMAIN}/rest/api/2`;
const auth = {
  username: process.env.JIRA_EMAIL,
  password: process.env.JIRA_API_TOKEN
};

// Simular la clase JiraValidator
class JiraValidator {
  constructor() {
    this.baseURL = JIRA_BASE;
    this.auth = auth;
  }

  async validateTicket(ticketId) {
    try {
      console.log(`\n🔍 Validando ${ticketId}...`);
      
      const response = await axios.get(`${this.baseURL}/issue/${ticketId}`, {
        auth: this.auth,
        params: {
          fields: 'summary,status,assignee,comment,attachment'
        },
        timeout: 10000
      });

      const issue = response.data;
      const status = issue.fields.status.name;
      const summary = issue.fields.summary;
      const assignee = issue.fields.assignee?.displayName || issue.fields.assignee?.name || null;
      
      console.log(`   ${summary} - ${status}`);

      // Verificar estado cerrado - expandir lista de estados válidos
      const validStates = ['Closed', 'Done', 'Ready to Release', 'Resolved', 'Finalizada', 'Cerrado'];
      const isClosed = validStates.includes(status);
      console.log(`     isClosed: ${isClosed} (status: ${status})`);
      
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
        hasEvidence: hasEvidenceOrImages,
        valid: isValid
      };

    } catch (error) {
      console.error(`❌ ${ticketId}: ${error.response?.status} - ${error.message}`);
      return {
        ticketId,
        error: 'Ticket no encontrado en Jira',
        valid: false
      };
    }
  }
}

// Probar
(async () => {
  const validator = new JiraValidator();
  
  const results = await Promise.all([
    validator.validateTicket('SPHC-6835'),
    validator.validateTicket('SPTO-6355'),
    validator.validateTicket('RPMX-30130')
  ]);
  
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('RESUMEN DE VALIDACIONES');
  console.log('═══════════════════════════════════════════════');
  
  results.forEach(result => {
    const status = result.valid ? '✅ VÁLIDO' : '❌ PENDIENTE';
    console.log(`${result.ticketId}: ${status}`);
    if (result.assignee) console.log(`  Responsable: ${result.assignee}`);
    if (result.error) console.log(`  Error: ${result.error}`);
  });
  
  // Simular respuesta
  console.log('\n\n═══════════════════════════════════════════════');
  console.log('RESPUESTA ESPERADA EN SLACK');
  console.log('═══════════════════════════════════════════════\n');
  
  const jiraBaseUrl = 'https://rappidev.atlassian.net/browse';
  const allValid = results.every(r => r.valid);
  
  if (allValid) {
    console.log('✅ TODOS VÁLIDOS - RESPUESTA APPROVED\n');
    for (const result of results) {
      console.log(`* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - *${result.status}* :white_check_mark:`);
    }
    console.log(`\nSe da approved por parte de QA para CHANGELOG support-chats \`v1.89.0\``);
  } else {
    console.log('⚠️ Validaciones pendientes para CHANGELOG support-chats `v1.89.0`:\n');
    
    // Solo mostrar los pendientes
    for (const result of results) {
      if (!result.valid) {
        let responsibleTag = '';
        if (result.assignee) {
          const assigneeName = result.assignee.toLowerCase().replace(/\s+/g, '.');
          responsibleTag = ` @${assigneeName}`;
        }
        
        if (result.error === 'Ticket no encontrado en Jira') {
          console.log(`* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> - ${result.error}${responsibleTag}`);
        } else if (!result.isClosed) {
          console.log(`* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - *${result.status}*${responsibleTag}`);
        } else if (!result.hasEvidence) {
          console.log(`* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - 👀 *Falta evidencia*${responsibleTag}`);
        }
      }
    }
    
    // Los válidos van abajo con checkmark (en un changelog con mezcla)
    const validResults = results.filter(r => r.valid);
    if (validResults.length > 0) {
      console.log('\n🎉 Tickets válidos:');
      for (const result of validResults) {
        console.log(`* <${jiraBaseUrl}/${result.ticketId}|${result.ticketId}> ${result.summary} - *${result.status}* :white_check_mark:`);
      }
    }
  }

})();
