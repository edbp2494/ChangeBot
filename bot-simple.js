// Validador súper simple para debugging
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const CHANNEL = process.env.SLACK_CHANNEL_ID;

async function buscarMentions() {
  console.log('🔍 Buscando mentions...');
  console.log(`📺 Canal: ${CHANNEL}`);
  
  try {
    const result = await slack.conversations.history({
      channel: CHANNEL,
      oldest: Math.floor(Date.now() / 1000) - (10 * 60), // 10 minutos
      limit: 10
    });
    
    console.log(`📋 Mensajes encontrados: ${result.messages.length}`);
    
    for (const msg of result.messages) {
      if (msg.bot_id) {
        console.log(`🤖 Mensaje de bot omitido: ${msg.ts}`);
        continue;
      }
      
      if (!msg.text) {
        console.log(`📝 Mensaje sin texto: ${msg.ts}`);
        continue;
      }
      
      const texto = msg.text.toLowerCase();
      const textoOriginal = msg.text;
      
      console.log(`\n📝 Mensaje ${msg.ts}:`);
      console.log(`   Usuario: ${msg.user}`);
      console.log(`   Texto: "${textoOriginal}"`);
      console.log(`   Texto lowercase: "${texto}"`);
      
      // Verificaciones detalladas
      const checks = {
        'changebot': texto.includes('changebot'),
        '@changebot': texto.includes('@changebot'),
        'ChangeBot': textoOriginal.includes('ChangeBot'),
        '@ChangeBot': textoOriginal.includes('@ChangeBot'),
        'U0973LJ4LP7': textoOriginal.includes('U0973LJ4LP7'),
        '<@U0973LJ4LP7>': textoOriginal.includes('<@U0973LJ4LP7>')
      };
      
      console.log('   🔍 Verificaciones:');
      for (const [check, result] of Object.entries(checks)) {
        console.log(`      ${check}: ${result ? '✅' : '❌'}`);
      }
      
      const tieneBot = Object.values(checks).some(v => v);
      
      if (tieneBot) {
        console.log('   🔔 ¡MENTION DETECTADA! Respondiendo...');
        try {
          const response = await slack.chat.postMessage({
            channel: CHANNEL,
            thread_ts: msg.ts, // Responder en hilo del mensaje original
            text: `<@${msg.user}> ¡Bot funcionando! Detecté tu mention en mensaje ${msg.ts}`
          });
          console.log(`   ✅ Respuesta enviada en hilo: ${response.ts}`);
        } catch (error) {
          console.log(`   ❌ Error enviando respuesta en hilo: ${error.message}`);
          // Fallback: enviar en canal principal si falla el hilo
          try {
            await slack.chat.postMessage({
              channel: CHANNEL,
              text: `<@${msg.user}> ¡Bot funcionando! (respuesta en canal)`
            });
            console.log(`   ✅ Respuesta enviada en canal como fallback`);
          } catch (fallbackError) {
            console.log(`   ❌ Error en fallback: ${fallbackError.message}`);
          }
        }
      } else {
        console.log('   ⏭️ No hay mentions en este mensaje');
      }
    }
    
    console.log('\n🏁 Búsqueda completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error(`   Código: ${error.data.error}`);
    }
  }
}

buscarMentions();