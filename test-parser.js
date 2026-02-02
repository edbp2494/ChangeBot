const { WebClient } = require('@slack/web-api');
const moment = require('moment');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const BOT_USER_ID = 'U0973LJ4LP7';

const processedMessages = new Set();

/**
 * Parsear mensaje de CHANGELOG (versión simplificada para testing)
 */
function parseChangelogMessage(text) {
  console.log(`🔍 Parseando: "${text.substring(0, 100)}..."`);
  
  let component = 'unknown-component';
  let version = 'v1.0.0';
  
  // Buscar línea que contenga CHANGELOG
  const lines = text.split('\n');
  const changelogLine = lines.find(line => /changelog/i.test(line));
  
  if (changelogLine) {
    console.log(`📝 Línea CHANGELOG: "${changelogLine}"`);
    
    // Extraer versión (v1.89.0, 1.89.0, etc.)
    const versionMatch = changelogLine.match(/v?(\d+\.\d+(?:\.\d+)?)/i);
    if (versionMatch) {
      version = versionMatch[1];
      if (!version.startsWith('v')) {
        version = 'v' + version;
      }
      console.log(`🔢 Versión: ${version}`);
    }
    
    // Extraer componente después de CHANGELOG
    const afterChangelog = changelogLine.replace(/\*?changelog\*?/i, '').trim();
    const words = afterChangelog.split(/[\s\+]+/).filter(w => w.length > 0);
    
    for (const word of words) {
      if (!/v?\d+\.\d+/.test(word) && word.length > 2 && !/workes/i.test(word)) {
        component = word.replace(/[^\w-]/g, '');
        console.log(`🎯 Componente: ${component}`);
        break;
      }
    }
  }
  
  // Extraer tickets
  const ticketPattern = /[A-Z]+-\d+/g;
  const tickets = [...new Set(text.match(ticketPattern) || [])];
  
  console.log(`📊 RESULTADO FINAL: ${component} ${version}, tickets: ${tickets.join(', ')}`);
  
  return { component, version, tickets };
}

async function testParser() {
  console.log('🧪 TEST: Parseando mensaje de ejemplo...');
  
  const testMessage = `*CHANGELOG* support-chats  + Workesv1.89.0
SPHC-6835
SPTO-6355
https://rappidev.atlassian.net/browse/RPMX-30130
cc: @ChangeBot`;

  const result = parseChangelogMessage(testMessage);
  
  console.log('\n✅ RESULTADO:');
  console.log(`Componente: ${result.component}`);
  console.log(`Versión: ${result.version}`);
  console.log(`Tickets: ${result.tickets.join(', ')}`);
  
  // Generar respuesta de ejemplo (sin Jira)
  const mainTicket = result.tickets[0];
  const responseText = `[${mainTicket}] Título del ticket - Ready to Release\n\nSe da approved por parte de QA para CHANGELOG ${result.component} \`${result.version}\``;
  
  console.log('\n📝 RESPUESTA GENERADA:');
  console.log(responseText);
}

// Ejecutar test
if (require.main === module) {
  testParser();
}

module.exports = { parseChangelogMessage };