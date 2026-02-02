const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

async function findUserGroup() {
  console.log('🔍 Buscando grupos de usuarios en Slack...\n');
  
  try {
    // Obtener lista de user groups
    const result = await slack.usergroups.list();
    
    console.log(`📋 Encontrados ${result.usergroups.length} grupos:\n`);
    
    for (const group of result.usergroups) {
      console.log(`📌 Nombre: ${group.name}`);
      console.log(`   ID: ${group.id}`);
      console.log(`   Handle: @${group.handle}`);
      console.log(`   Miembros: ${group.user_count}`);
      console.log(`   Descripción: ${group.description || 'N/A'}`);
      console.log(`   Formato mención: <!subteam^${group.id}|@${group.handle}>\n`);
    }
    
    // Buscar específicamente el grupo qa-support
    console.log('🎯 Buscando específicamente "qa-support"...\n');
    const qaSupport = result.usergroups.find(g => 
      g.handle === 'qa-support' || 
      g.name === 'qa-support' ||
      g.name.toLowerCase().includes('qa')
    );
    
    if (qaSupport) {
      console.log('✅ ENCONTRADO:');
      console.log(`   Nombre: ${qaSupport.name}`);
      console.log(`   ID: ${qaSupport.id}`);
      console.log(`   Handle: @${qaSupport.handle}`);
      console.log(`   ID de miembros: ${qaSupport.users.join(', ')}`);
      console.log(`\n📝 Para mencionar en Slack, usa:\n   <!subteam^${qaSupport.id}|@${qaSupport.handle}>`);
    } else {
      console.log('❌ No se encontró grupo qa-support');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.data) {
      console.error(`   Detalle: ${JSON.stringify(error.data)}`);
    }
  }
}

findUserGroup();
