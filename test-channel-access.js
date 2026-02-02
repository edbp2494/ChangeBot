const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testChannelAccess() {
  console.log('🧪 Probando acceso al canal #qa-soporte...\n');

  const channelId = process.env.SLACK_CHANNEL_ID; // CESPBAQKA
  console.log(`📺 Channel ID: ${channelId}\n`);

  try {
    // 1. Obtener información del canal
    console.log('📋 Obteniendo información del canal...');
    const channelInfo = await slack.conversations.info({
      channel: channelId
    });

    if (channelInfo.ok) {
      console.log('✅ Canal encontrado:');
      console.log(`   Nombre: #${channelInfo.channel.name}`);
      console.log(`   Miembros: ${channelInfo.channel.num_members}`);
      console.log(`   Es privado: ${channelInfo.channel.is_private ? 'Sí' : 'No'}`);
    }

    // 2. Verificar si puedo leer mensajes
    console.log('\n📜 Verificando acceso a mensajes...');
    const history = await slack.conversations.history({
      channel: channelId,
      limit: 3
    });

    if (history.ok && history.messages) {
      console.log(`✅ Puedo leer mensajes! Encontré ${history.messages.length} mensajes recientes:`);
      
      history.messages.forEach((msg, index) => {
        const timestamp = new Date(msg.ts * 1000).toLocaleString();
        const isBot = msg.bot_id ? ' [BOT]' : '';
        const text = msg.text?.substring(0, 80) || '[Sin texto]';
        
        console.log(`  ${index + 1}. ${timestamp}${isBot}: ${text}...`);
        
        // Buscar CHANGELOGs
        if (msg.text && msg.text.includes('CHANGELOG')) {
          console.log('    🎯 ¡Este parece ser un CHANGELOG!');
        }
      });
    }

    // 3. Probar si puedo enviar mensajes
    console.log('\n📤 Probando envío de mensaje de prueba...');
    const testMessage = await slack.chat.postMessage({
      channel: channelId,
      text: '🤖 Test de bot - Verificando funcionalidad de validación de CHANGELOGs',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🤖 *Bot de Validación CHANGELOG* - Test de Conectividad'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '✅ La conexión está funcionando.\n⏰ Validaciones automáticas activas en horarios: 10-11h, 15-16h, 19-20h'
          }
        }
      ]
    });

    if (testMessage.ok) {
      console.log('✅ ¡Mensaje enviado exitosamente!');
      console.log(`📨 Timestamp: ${testMessage.ts}`);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.data && error.data.error) {
      console.log(`❌ Error de Slack: ${error.data.error}`);
      
      switch (error.data.error) {
        case 'channel_not_found':
          console.log('⚠️  Canal no encontrado. Verifica el Channel ID.');
          break;
        case 'not_in_channel':
          console.log('⚠️  El bot no está en el canal. Invítalo al canal.');
          break;
        case 'missing_scope':
          console.log('⚠️  Faltan permisos en el bot token.');
          break;
        case 'invalid_auth':
          console.log('⚠️  Token inválido.');
          break;
      }
    }
  }
}

async function testBotInfo() {
  console.log('\n🤖 Verificando información del bot...');
  
  try {
    const authTest = await slack.auth.test();
    
    if (authTest.ok) {
      console.log('✅ Bot autenticado correctamente:');
      console.log(`   Bot ID: ${authTest.user_id}`);
      console.log(`   Bot Name: ${authTest.user}`);
      console.log(`   Team: ${authTest.team}`);
      console.log(`   Scopes: ${authTest.response_metadata?.scopes?.join(', ') || 'No disponible'}`);
    }
  } catch (error) {
    console.log('❌ Error verificando bot:', error.message);
  }
}

// Ejecutar todas las pruebas
console.log('🚀 Iniciando pruebas del canal...\n');

Promise.all([
  testBotInfo(),
  testChannelAccess()
])
.then(() => {
  console.log('\n🎉 Pruebas completadas!');
  console.log('\n📋 Si todo funcionó correctamente:');
  console.log('1. El bot puede leer y escribir en #qa-soporte');
  console.log('2. Puedes enviar un CHANGELOG de prueba al canal');
  console.log('3. El validador automático lo procesará en las próximas ventanas');
})
.catch(error => {
  console.error('❌ Error en las pruebas:', error);
});