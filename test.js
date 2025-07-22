require('dotenv').config();
const axios = require('axios');

const extractTickets = text => {
  const ticketRegex = /([A-Z]{4}-\d{4})/g;
  return text.match(ticketRegex) || [];
};

const extractChangelog = text => {
  const match = text.match(/CHANGELOG\s+([^\n\r]+)/i);
  return match ? match[1].trim() : '';
};

const estadoEmoji = estado => {
  const e = estado.toLowerCase();
  if (e.includes('ready to release')) return '✅';
  if (e.includes('done') || e.includes('finalizad')) return '🏁';
  if (e.includes('in progress')) return '🚧';
  if (e.includes('to do')) return '📋';
  return '❓';
};

const contieneEvidencia = comentario => {
  if (!comentario || !comentario.body) return false;

  const texto = JSON.stringify(comentario.body).toLowerCase();

  const palabrasClave = [
    '#evidencia',
    'funcionamiento esperado',
    'logs validados',
    'se observa',
    'adjunto',
    'screenshot',
    'comporta como se espera',
    'ejemplos válidos',
    'ver imagen',
    'evidencia',
    'curl ',
    'http',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif'
  ];

  return palabrasClave.some(p => texto.includes(p));
};

const simulateMessage = async () => {
  const mensaje = `
changeLog support-chats tag v1.72.0
[SPHC-5713] Update lib rules-engine-js v2.138.1
[SPHC-4926] Update required validation to optional as is calling itself
[SPHC-5753] Adjust refund and compensation policy URLs by country.
@ChangeBot
`;

  const changelog = extractChangelog(mensaje);
  const tickets = extractTickets(mensaje);

  console.log('\nChangelog detectado:', changelog);
  console.log('Tickets detectados:', tickets);

  if (!changelog || tickets.length === 0) {
    console.log('❌ No se encontraron changelog o tickets. Revisa el mensaje.');
    return;
  }

  const results = [];
  let aprobables = true;

  for (const key of tickets) {
    try {
      const res = await axios.get(`https://${process.env.JIRA_DOMAIN}/rest/api/3/issue/${key}?expand=renderedFields`, {
        auth: {
          username: process.env.JIRA_EMAIL,
          password: process.env.JIRA_API_TOKEN
        }
      });

      const issue = res.data;
      let titulo = issue.fields.summary;
      const estado = issue.fields.status.name;
      const emoji = estadoEmoji(estado);

      const modMatch = titulo.match(/\[([^\]]+)\]/);
      const modulo = modMatch ? modMatch[1] : 'SIN-MÓDULO';
      titulo = titulo.replace(`[${modulo}]`, '').trim();

      const comments = issue.fields.comment?.comments || [];
      const lastWithEvidence = [...comments].reverse().find(contieneEvidencia);
      const autor = lastWithEvidence?.author?.displayName;

      let evidenciaTexto = '';
      if (autor) {
        evidenciaTexto = `(Con evidencias de ${autor})`; // sin @
      } else {
        evidenciaTexto = '👀 (Falta evidencia)';
        aprobables = false;
      }

      const link = `https://${process.env.JIRA_DOMAIN}/browse/${key}`;
      results.push(`- ${emoji} [${key}](${link}) [${modulo}] ${titulo} - *${estado}* ${evidenciaTexto}`);
    } catch (error) {
      results.push(`- ${key} ❌ Error al consultar Jira`);
      aprobables = false;
      console.error(`Error con ${key}:`, error.response?.data || error.message);
    }
  }

  let final = '';
  const todasConsultadas = results.every(line => !line.includes('❌'));

  if (!todasConsultadas) {
    final = results.join('\n') + `\n\n❌ No se pudo validar todos los tickets. No es posible aprobar el CHANGELOG ${changelog}.`;
  } else if (!aprobables) {
    final = results.join('\n') + `\n\n⚠️ Algunos tickets no tienen evidencias. No es posible aprobar el CHANGELOG ${changelog}.`;
  } else {
    final = results.join('\n') + `\n\n✅ Se da aprobación de QA para despliegue de CHANGELOG ${changelog}`;
  }

  console.log('\n--- Respuesta simulada ---\n');
  console.log(final);
};

simulateMessage();


