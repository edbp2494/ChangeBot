const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testInternalUser() {
  console.log('🧪 Probando comunicación con usuario interno...\n');

  const userId = process.env.INTERNAL_USER_ID; // D023DK4CJ73
  console.log(`📱 User ID: ${userId}\n`);

  try {
    // 1. Enviar mensaje directo de prueba
    console.log('📤 Enviando mensaje de prueba...');
    const response = await slack.chat.postMessage({
      channel: userId,
      text: '🤖 Hola! Soy el bot de validación de CHANGELOGs.\n\nEste es un mensaje de prueba para verificar que puedo enviarte notificaciones.',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🤖 *Bot de Validación CHANGELOG* - Mensaje de Prueba'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ La comunicación está funcionando correctamente.\n\nAhora puedes enviarme un CHANGELOG de prueba con el formato:\n\n`CHANGELOG [ComponenteTest] [v1.0.0] [@qa-soporte] - TEST-123`'
          }
        }
      ]
    });

    if (response.ok) {
      console.log('✅ Mensaje enviado exitosamente!');
      console.log(`📨 Timestamp: ${response.ts}`);
    } else {
      console.log('❌ Error enviando mensaje:', response);
    }

    // 2. Verificar historial de mensajes
    console.log('\n📜 Verificando historial de mensajes...');
    const history = await slack.conversations.history({
      channel: userId,
      limit: 5
    });

    if (history.messages && history.messages.length > 0) {
      console.log(`📋 Encontré ${history.messages.length} mensajes recientes:`);
      
      history.messages.forEach((msg, index) => {
        const timestamp = new Date(msg.ts * 1000).toLocaleString();
        const isBot = msg.bot_id ? ' [BOT]' : '';
        const text = msg.text?.substring(0, 100) || '[Sin texto]';
        
        console.log(`  ${index + 1}. ${timestamp}${isBot}: ${text}...`);
      });
    } else {
      console.log('📭 No hay mensajes recientes');
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.data && error.data.error) {
      console.log(`❌ Error de Slack: ${error.data.error}`);
      
      if (error.data.error === 'cannot_dm_bot') {
        console.log('⚠️  Los bots no pueden enviarse mensajes entre sí');
      } else if (error.data.error === 'user_not_found') {
        console.log('⚠️  Usuario no encontrado. Verifica el ID del usuario.');
      } else if (error.data.error === 'channel_not_found') {
        console.log('⚠️  No se puede acceder al canal/usuario. Verifica permisos.');
      }
    }
  }
}

// Función para simular recepción de CHANGELOG
async function simulateChangelogReceived() {
  console.log('\n🎭 Simulando recepción de CHANGELOG...');
  
  const testChangelog = {
    component: 'ComponenteTest',
    version: 'v1.0.0',
    tickets: ['TEST-123'],
    user: process.env.INTERNAL_USER_ID,
    timestamp: new Date().toISOString(),
    hasMentions: true
  };

  console.log('📝 CHANGELOG simulado:');
  console.log(`   Componente: ${testChangelog.component}`);
  console.log(`   Versión: ${testChangelog.version}`);
  console.log(`   Tickets: ${testChangelog.tickets.join(', ')}`);
  console.log(`   Usuario: ${testChangelog.user}`);
  console.log(`   Menciones: ${testChangelog.hasMentions ? 'Sí' : 'No'}`);

  return testChangelog;
}

// Ejecutar pruebas
console.log('🚀 Iniciando pruebas de usuario interno...\n');

testInternalUser()
  .then(() => simulateChangelogReceived())
  .then(() => {
    console.log('\n✅ Pruebas completadas!');
    console.log('\n📋 Próximos pasos:');
    console.log('1. Responde al mensaje del bot en tu DM');
    console.log('2. Envía un CHANGELOG de prueba: CHANGELOG [ComponenteTest] [v1.0.0] [@qa-soporte] - TEST-123');
    console.log('3. Ejecuta: node changelog-validator.js para validar');
  })
  .catch(error => {
    console.error('❌ Error en las pruebas:', error);
  });