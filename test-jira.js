const axios = require('axios');
require('dotenv').config();

async function testJiraConnection() {
  console.log('🔧 Probando conexión a Jira...');
  
  const baseURL = `https://${process.env.JIRA_DOMAIN}`;
  const auth = {
    username: process.env.JIRA_EMAIL,
    password: process.env.JIRA_API_TOKEN
  };
  
  console.log(`🌐 URL: ${baseURL}`);
  console.log(`👤 Email: ${auth.username}`);
  console.log(`🔑 Token: ${auth.password.substring(0, 20)}...`);
  
  try {
    // Test 1: Verificar autenticación
    console.log('\n1️⃣ Test de autenticación...');
    const authResponse = await axios.get(`${baseURL}/rest/api/2/myself`, { auth });
    console.log(`✅ Autenticado como: ${authResponse.data.displayName} (${authResponse.data.emailAddress})`);
    
    // Test 2: Probar tickets específicos
    const tickets = ['SPHC-6835', 'SPTO-6355', 'RPMX-30130'];
    
    for (const ticketId of tickets) {
      console.log(`\n2️⃣ Probando ticket: ${ticketId}`);
      
      try {
        const response = await axios.get(
          `${baseURL}/rest/api/2/issue/${ticketId}`,
          {
            auth,
            params: {
              fields: 'status,summary'
            }
          }
        );
        
        const issue = response.data;
        console.log(`✅ ${ticketId}: ${issue.fields.summary}`);
        console.log(`   Estado: ${issue.fields.status.name}`);
        
      } catch (ticketError) {
        console.error(`❌ ${ticketId}: ${ticketError.response?.status} - ${ticketError.message}`);
        if (ticketError.response?.data) {
          console.error(`   Error: ${JSON.stringify(ticketError.response.data.errorMessages)}`);
        }
      }
      
      // Pausa entre requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('❌ Error de conexión:', error.response?.status, error.message);
    if (error.response?.data) {
      console.error('   Detalle:', error.response.data);
    }
  }
}

testJiraConnection();