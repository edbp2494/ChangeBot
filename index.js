require('dotenv').config();
const { App } = require('@slack/bolt');
const axios = require('axios');

// Inicializa Slack
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

// Extraer tickets y changelog
const extractTickets = text => {
  const ticketRegex = /([A-Z]{4}-\d{4})/g;
  return text.match(ticketRegex) || [];
};
const extractChangelog = text => {
  const match = text.match(/CHANGELOG\s+([^\n\r]+)/i);
  return match ? match[1].trim() : '';
};

// Eventos cuando mencionan al bot
app.event('app_mention', async ({ event, say }) => {
  try {
    const text = event.text;
    if (!/CHANGELOG/i.test(text)) return;

    const changelog = extractChangelog(text);
    const tickets = extractTickets(text);
    if (!changelog || tickets.length === 0) {
      await say({ text: 'No encontré changelog o tickets en el mensaje.', thread_ts: event.ts });
      return;
    }

    const results = [];
    for (const key of tickets) {
      const res = await axios.get(`https://${process.env.JIRA_DOMAIN}/rest/api/3/issue/${key}`, {
        auth: {
          username: process.env.JIRA_EMAIL,
          password: process.env.JIRA_API_TOKEN
        }
      });
      const issue = res.data;
      const titulo = issue.fields.summary;
      const estado = issue.fields.status.name;
      const modMatch = titulo.match(/\[([^\]]+)\]/);
      const modulo = modMatch ? modMatch[1] : 'SIN-MÓDULO';

      const comments = issue.fields.comment.comments;
      const lastWithEvidence = comments.reverse().find(c =>
        /(evidencia|screenshot|adjunto|img|ver imagen)/i.test(c.body));
      const autor = lastWithEvidence ? lastWithEvidence.author.displayName : 'sin evidencias';

      results.push(`${key} [${modulo}] ${titulo} - ${estado} (Con evidencias de @${autor})`);
    }

    const reply = results.join('\n') + `

Se da aprobación de QA para despliegue de CHANGELOG ${changelog}`;
    await say({ text: reply, thread_ts: event.ts });
  } catch (err) {
    console.error(err);
    await say({ text: 'Ocurrió un error al procesar', thread_ts: event.ts });
  }
});

// Inicia servidor
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log(`⚡ ChangeBot corriendo en puerto ${port}`);
})();
