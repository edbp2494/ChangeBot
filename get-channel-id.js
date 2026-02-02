const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Script para obtener el Channel ID del canal #qa-soporte
 */
async function getChannelId() {
  console.log('\n🔍 Buscando canal #qa-soporte...');
  console.log('='.repeat(50));

  try {
    // Listar todos los canales
    const result = await slack.conversations.list({
      types: 'public_channel,private_channel',
      limit: 100
    });

    console.log(`\n📋 Canales encontrados: ${result.channels.length}`);
    
    // Buscar el canal qa-soporte
    const qaChannel = result.channels.find(channel => 
      channel.name === 'qa-soporte' || 
      channel.name === 'qa-support' ||
      channel.name.includes('qa')
    );

    if (qaChannel) {
      console.log('\n✅ ¡Canal encontrado!');
      console.log(`📌 Nombre: #${qaChannel.name}`);
      console.log(`🆔 ID: ${qaChannel.id}`);
      console.log(`👥 Miembros: ${qaChannel.num_members || 'N/A'}`);
      
      console.log('\n📝 Para configurar el bot, copia esta línea en tu .env:');
      console.log(`SLACK_CHANNEL_ID=${qaChannel.id}`);
      
      return qaChannel.id;
    } else {
      console.log('\n⚠️ Canal #qa-soporte no encontrado');
      console.log('\n📋 Canales disponibles:');
      
      result.channels
        .filter(c => c.name.includes('qa') || c.name.includes('soporte') || c.name.includes('support'))
        .forEach(channel => {
          console.log(`   • #${channel.name} (${channel.id})`);
        });
      
      if (result.channels.length > 0) {
        console.log('\n💡 Algunos canales que podrían ser:');
        result.channels.slice(0, 10).forEach(channel => {
          console.log(`   • #${channel.name} (${channel.id})`);
        });
      }
    }

  } catch (error) {
    console.error('\n❌ Error obteniendo canales:', error.message);
    
    if (error.message.includes('not_authed')) {
      console.log('\n🔧 Solución: Verifica que el SLACK_BOT_TOKEN sea correcto');
    } else if (error.message.includes('missing_scope')) {
      console.log('\n🔧 Solución: El bot necesita el scope "channels:read"');
    }
  }

  console.log('\n='.repeat(50));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  getChannelId().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { getChannelId };