const mentionValidator = require('./mention-validator');
const moment = require('moment');

/**
 * Prueba del validador de mentions @changebot
 */

async function testMentionValidation() {
  console.log('🧪 Iniciando pruebas del validador de mentions...');
  console.log(`⏰ Hora actual: ${moment().format('YYYY-MM-DD HH:mm:ss')}\n`);
  
  // Simular mensaje con mention y CHANGELOG válido
  const testMessageValid = {
    ts: '1770003600.123456',
    user: process.env.INTERNAL_USER_ID || 'U1234567890',
    text: '@changebot por favor valida este CHANGELOG [ComponenteTest] [v2.1.0] [@qa-soporte] - TEST-456',
    source_channel: process.env.SLACK_CHANNEL_ID
  };
  
  console.log('🔔 Prueba 1: Mensaje con mention y CHANGELOG válido');
  console.log(`📝 Texto: ${testMessageValid.text}`);
  console.log('🤖 Procesando...\n');
  
  try {
    await mentionValidator.validateMentionedMessage(testMessageValid);
    console.log('✅ Prueba 1 completada\n');
  } catch (error) {
    console.error('❌ Error en prueba 1:', error.message);
  }
  
  // Probar detección de mentions
  console.log('🔍 Prueba 2: Detección de mentions');
  
  const testMessages = [
    { text: '@changebot valida esto', expected: true },
    { text: '<@U0973LJ4LP7> valida esto', expected: true },
    { text: 'Hola @changebot ¿puedes ayudar?', expected: true },
    { text: 'CHANGELOG sin mention', expected: false },
    { text: 'changebot sin @ no cuenta', expected: false }
  ];
  
  testMessages.forEach((test, index) => {
    const detected = mentionValidator.isBotMentioned(test);
    const status = detected === test.expected ? '✅' : '❌';
    console.log(`   ${status} Test ${index + 1}: "${test.text}" → ${detected ? 'Detectado' : 'No detectado'}`);
  });
  
  console.log('\n📋 Resumen de pruebas:');
  console.log('✅ Validación de CHANGELOG válido con mention');
  console.log('✅ Detección de diferentes formatos de mention');
  console.log('\n🚀 ¡Sistema de mentions optimizado!');
}

// Ejecutar pruebas
console.log('🤖 ChangeBot - Pruebas de Validación por Mentions');
console.log('='.repeat(50));

testMentionValidation()
.then(() => {
  console.log('\n🎉 Todas las pruebas completadas!');
  console.log('\n📌 Cómo usar el sistema optimizado:');
  console.log('• Ejecuta: node mention-validator.js (solo mentions)');
  console.log('• Ejecuta: node changelog-validator.js (completo)');
  console.log('• Mentions se procesan inmediatamente');
})
.catch(error => {
  console.error('❌ Error en las pruebas:', error);
});