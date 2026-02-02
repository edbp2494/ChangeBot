const { WebClient } = require('@slack/web-api');
require('dotenv').config();

console.log('🚀 Iniciando diagnóstico del bot...');

// Verificar configuración
console.log('📋 Verificando configuración:');
console.log(`   TOKEN: ${process.env.SLACK_BOT_TOKEN ? 'Configurado' : 'FALTA'}`);
console.log(`   CHANNEL: ${process.env.SLACK_CHANNEL_ID || 'FALTA'}`);

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_CHANNEL_ID) {
  console.error('❌ Falta configuración en .env');
  process.exit(1);
}

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function testBot() {
  try {
    // Test 1: Verificar autenticación
    console.log('\n🧪 Test 1: Autenticación...');
    const auth = await slack.auth.test();
    console.log(`✅ Bot conectado: ${auth.user} (ID: ${auth.user_id})`);
    
    // Test 2: Verificar acceso al canal
    console.log('\n🧪 Test 2: Acceso al canal...');
    const channelInfo = await slack.conversations.info({
      channel: process.env.SLACK_CHANNEL_ID
    });
    console.log(`✅ Canal accesible: #${channelInfo.channel.name}`);
    
    // Test 3: Obtener mensajes recientes
    console.log('\n🧪 Test 3: Mensajes recientes...');
    const messages = await slack.conversations.history({
      channel: process.env.SLACK_CHANNEL_ID,
      limit: 3
    });
    
    console.log(`✅ Mensajes obtenidos: ${messages.messages.length}`);
    
    messages.messages.forEach((msg, i) => {
      const text = msg.text?.substring(0, 50) || '[sin texto]';
      const hasBot = msg.text?.includes('ChangeBot') || msg.text?.includes('U0973LJ4LP7');
      console.log(`   ${i + 1}. ${text}... ${hasBot ? '🔔 CONTIENE BOT' : ''}`);
    });
    
    // Test 4: Enviar mensaje de prueba
    console.log('\n🧪 Test 4: Envío de mensaje...');
    const testMessage = await slack.chat.postMessage({
      channel: process.env.SLACK_CHANNEL_ID,
      text: '🤖 Test de diagnóstico - Bot funcionando correctamente'
    });
    console.log(`✅ Mensaje enviado: ${testMessage.ts}`);
    
    console.log('\n🎉 Todos los tests pasaron. El bot debería estar funcionando.');
    
  } catch (error) {
    console.error('\n❌ Error en diagnóstico:', error.message);
    if (error.data) {
      console.error(`   Código de error Slack: ${error.data.error}`);
    }
  }
}

testBot().catch(console.error);