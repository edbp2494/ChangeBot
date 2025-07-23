require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');

// Inicializar app de Slack
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  appToken: process.env.SLACK_APP_TOKEN, // solo si usás socketMode
  port: process.env.PORT || 3000
});

// Regex helpers
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

// Evento: cuando te mencionan (@ChangeBot)
app.event('app_mention', async ({ event, client, say }) => {
  const mensaje = event.text;

  const changelog = extractChangelog(mensaje);
  const tickets = extractTickets(mensaje);

  if (!changelog || tickets.length === 0) {
    await say(`❌ No se encontró un changelog ni tickets válidos en el mensaje.`);
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
    }
  }

  const todasConsultadas = results.every(line => !line.includes('❌'));

  let final = '';
  if (!todasConsultadas) {
    final = results.join('\n') + `\n\n❌ No se pudo validar todos los tickets. No es posible aprobar el CHANGELOG ${changelog}.`;
  } else if (!aprobables) {
    final = results.join('\n') + `\n\n⚠️ Algunos tickets no tienen evidencias. No es posible aprobar el CHANGELOG ${changelog}.`;
  } else {
    final = results.join('\n') + `\n\n✅ Se da aprobación de QA para despliegue de CHANGELOG ${changelog}`;
  }

  await say(final);
});

app.message(async ({ message, say }) => {
  if (message.channel_type === 'im' && !message.bot_id) {
    const texto = message.text;
    const changelog = extractChangelog(texto);
    const tickets = extractTickets(texto);

    if (!changelog || tickets.length === 0) {
      await say(`❌ No se encontró un changelog ni tickets válidos en el mensaje.`);
      return;
    }

    // TODO: podés copiar la lógica de procesamiento de tickets aquí
    await say(`(Simulado) Detectado CHANGELOG "${changelog}" con tickets: ${tickets.join(', ')}`);
  }
});


// Iniciar app
(async () => {
  await app.start();
  console.log('✅ ChangeBot está corriendo y escuchando menciones...');
})();
