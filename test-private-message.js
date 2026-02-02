const moment = require('moment');
const { validateMessage } = require('./services/messageValidator');
const { logger } = require('./utils/logger');

/**
 * Script de prueba que simula un mensaje privado de CHANGELOG
 */
async function testPrivateMessage() {
  console.log('\n🧪 PRUEBA - Simulando mensaje privado de CHANGELOG');
  console.log('='.repeat(60));
  
  // Simular mensaje de CHANGELOG
  const testMessage = `CHANGELOG [mi-componente] [v1.0.0]
[RST-1867] Nueva funcionalidad implementada
[RST-1868] Corrección de bug crítico
@qa-support @eduardo.baptista

Cambios importantes en esta versión.`;

  console.log('\n📝 MENSAJE SIMULADO:');
  console.log('-'.repeat(40));
  console.log(testMessage);
  console.log('-'.repeat(40));

  // Validar mensaje
  console.log('\n🔍 VALIDANDO MENSAJE...');
  const validation = validateMessage(testMessage);
  
  console.log('\n📊 RESULTADO DE VALIDACIÓN:');
  console.log(`✅ Formato válido: ${validation.isValid}`);
  
  if (validation.isValid) {
    console.log(`🏷️  Componente: ${validation.data.componentName}`);
    console.log(`📦 Versión: ${validation.data.version}`);
    console.log(`🎫 Tickets: ${validation.data.tickets.join(', ')}`);
  } else {
    console.log('❌ Errores encontrados:');
    validation.issues.forEach(issue => console.log(`   ${issue}`));
  }

  // Simular respuesta del bot
  console.log('\n🤖 RESPUESTA DEL BOT:');
  console.log('-'.repeat(40));
  
  if (validation.isValid) {
    console.log('🆕 CHANGELOG Detectado');
    console.log(`Componente: ${validation.data.componentName}`);
    console.log(`Versión: ${validation.data.version}`);
    console.log(`Tickets: ${validation.data.tickets.join(', ')}`);
    console.log(`Usuario: @eduardo.baptista`);
    console.log('\n⏱️ Detected hace 0 hora(s) | Validar dentro de 2 horas');
    console.log('\n📋 Recordatorio: Completa la validación en Jira (cerrar tickets + evidencia)');
  } else {
    console.log('❌ El mensaje no cumple con el formato requerido');
    validation.issues.forEach(issue => console.log(`   ${issue}`));
    
    console.log('\n📋 Formato correcto:');
    console.log('```');
    console.log('CHANGELOG [nombre-componente] [versión]');
    console.log('[TICKET-XXX] Descripción');
    console.log('@qa-support @usuario');
    console.log('```');
  }

  console.log('-'.repeat(40));
  
  // Mostrar información de ventanas
  console.log('\n⏰ VENTANAS DE VALIDACIÓN:');
  console.log('• 10:00 - 11:00 (Mañana)');
  console.log('• 15:00 - 16:00 (Tarde)');
  console.log('• 19:00 - 20:00 (Noche)');
  
  const currentHour = moment().hour();
  const inWindow = (currentHour >= 10 && currentHour < 11) || 
                   (currentHour >= 15 && currentHour < 16) || 
                   (currentHour >= 19 && currentHour < 20);
  
  console.log(`\n🕒 Hora actual: ${moment().format('HH:mm')}`);
  console.log(`📍 Ventana activa: ${inWindow ? '✅ SÍ' : '❌ NO'}`);
  
  if (!inWindow) {
    const nextWindow = getNextWindow();
    console.log(`⏭️  Próxima ventana: ${nextWindow}`);
  }

  console.log('\n✅ PRUEBA COMPLETADA');
  console.log('='.repeat(60));
}

function getNextWindow() {
  const now = moment();
  const today = now.clone().startOf('day');
  
  const windows = [
    today.clone().hour(10),
    today.clone().hour(15), 
    today.clone().hour(19)
  ];
  
  for (const window of windows) {
    if (now.isBefore(window)) {
      return window.format('HH:mm');
    }
  }
  
  // Si todas las ventanas de hoy pasaron, próxima es mañana a las 10:00
  return today.add(1, 'day').hour(10).format('DD/MM HH:mm');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testPrivateMessage().then(() => {
    console.log('\n🎯 MENSAJE PARA EDUARDO:');
    console.log('¡Perfecto! Una vez que configures tu SLACK_BOT_TOKEN en .env');
    console.log('el bot funcionará exactamente así pero automáticamente.');
    console.log('\nNo necesitas hacer NADA todos los días. Solo configurar una vez.');
    process.exit(0);
  }).catch(error => {
    console.error('Error en prueba:', error);
    process.exit(1);
  });
}

module.exports = { testPrivateMessage };