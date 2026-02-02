const axios = require('axios');
require('dotenv').config();

const JIRA_BASE = `https://${process.env.JIRA_DOMAIN}/rest/api/2`;
const auth = {
  username: process.env.JIRA_EMAIL,
  password: process.env.JIRA_API_TOKEN
};

async function debugTicket(ticketId) {
  try {
    console.log(`\n🔍 Debugging ${ticketId}...`);
    
    const response = await axios.get(`${JIRA_BASE}/issue/${ticketId}`, {
      auth,
      params: {
        fields: 'summary,status,assignee,comment,attachment'
      },
      timeout: 10000
    });

    const issue = response.data;
    console.log(`✅ Ticket encontrado`);
    console.log(`📌 Summary: ${issue.fields.summary}`);
    console.log(`📌 Status: ${issue.fields.status.name}`);
    console.log(`📌 Assignee: ${issue.fields.assignee?.displayName || issue.fields.assignee?.name || 'SIN ASIGNAR'}`);
    
    const comments = issue.fields.comment?.comments || [];
    console.log(`📌 Total Comments: ${comments.length}`);
    
    if (comments.length > 0) {
      comments.forEach((comment, idx) => {
        const hasEvidencia = comment.body.toLowerCase().includes('evidencia');
        console.log(`   Comment ${idx + 1}: ${hasEvidencia ? '✅ TIENE "evidencia"' : '❌ Sin "evidencia"'}`);
        console.log(`      Body: ${comment.body.substring(0, 100)}...`);
      });
    }
    
    const attachments = issue.fields.attachment || [];
    console.log(`📌 Total Attachments: ${attachments.length}`);
    
    if (attachments.length > 0) {
      attachments.forEach((att, idx) => {
        const isImage = att.mimeType.startsWith('image/');
        console.log(`   Attachment ${idx + 1}: ${isImage ? '✅ IMAGEN' : '❌ No imagen'} - ${att.mimeType}`);
      });
    }
    
    // Resumen
    const hasAssignee = !!issue.fields.assignee;
    const hasEvidencia = comments.some(c => c.body.toLowerCase().includes('evidencia'));
    const hasImages = attachments.some(a => a.mimeType.startsWith('image/'));
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   ¿Assignee? ${hasAssignee ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   ¿Evidencia (comentario)? ${hasEvidencia ? '✅ SÍ' : '❌ NO'}`);
    console.log(`   ¿Imágenes? ${hasImages ? '✅ SÍ' : '❌ NO'}`);
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

// Debug los tickets problemáticos
(async () => {
  await debugTicket('SPHC-6835');
  await debugTicket('SPTO-6355');
  await debugTicket('RPMX-30130');
})();
