#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar caché después de la línea del setInterval que limpia
const cacheCode = `
// ✅ CACHE de usuarios de Slack para evitar rate limiting
const slackUserCache = new Map(); // {email -> userId}
const slackUserListCache = {
  timestamp: 0,
  data: null,
  ttl: 60 * 60 * 1000 // 1 hora
};

// Limpiar caché de usuarios cada hora
setInterval(() => {
  slackUserCache.clear();
  slackUserListCache.timestamp = 0;
  console.log('🧹 Cache de usuarios limpiado');
}, 60 * 60 * 1000);`;

// Encontrar la línea donde termina el primer setInterval
const lines = content.split('\n');
let insertIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('}, 10 * 60 * 1000);')) {
    insertIdx = i + 1;
    break;
  }
}

if (insertIdx !== -1) {
  lines.splice(insertIdx, 0, cacheCode);
  content = lines.join('\n');
  console.log('✅ Caché agregado');
}

// 2. Agregar función getCachedUsersList antes de findSlackUserByEmail
const getCachedFunction = `
/**
 * Obtener lista de usuarios con caché (máximo 1 llamada por hora)
 */
async function getCachedUsersList() {
  const now = Date.now();
  
  // Si tenemos datos en caché y no han expirado, usarlos
  if (slackUserListCache.data && (now - slackUserListCache.timestamp) < slackUserListCache.ttl) {
    return slackUserListCache.data;
  }
  
  try {
    console.log('⏳ Actualizando caché de usuarios de Slack...');
    const result = await slack.users.list();
    slackUserListCache.data = result.members;
    slackUserListCache.timestamp = now;
    console.log(\`✅ \${result.members.length} usuarios cacheados\`);
    return result.members;
  } catch (error) {
    console.log(\`⚠️ Error cargando usuarios: \${error.message}\`);
    return slackUserListCache.data || [];
  }
}
`;

// Encontrar dónde comienza findSlackUserByEmail
const findFunctionStart = content.indexOf('/**\n * Buscar user ID de Slack');
if (findFunctionStart !== -1) {
  content = content.slice(0, findFunctionStart) + getCachedFunction + content.slice(findFunctionStart);
  console.log('✅ Función getCachedUsersList agregada');
}

// 3. Reemplazar el contenido de findSlackUserByEmail
const newFindFunction = `/**
 * Buscar user ID de Slack por email o username (CON CACHÉ)
 */
async function findSlackUserByEmail(email) {
  try {
    if (!email) return null;
    
    // 1️⃣ Verificar si ya está en caché
    if (slackUserCache.has(email)) {
      const cached = slackUserCache.get(email);
      if (cached) console.log(\`   ✅ Usuario del caché: \${cached}\`);
      return cached;
    }
    
    // 2️⃣ Intentar lookup por email (método más confiable)
    try {
      const result = await slack.users.lookupByEmail({ email });
      slackUserCache.set(email, result.user.id);
      console.log(\`   ✅ Usuario encontrado por email: \${result.user.id}\`);
      return result.user.id;
    } catch (emailError) {
      // Email lookup falló, intentar búsqueda por username
      const username = email.split('@')[0]; // e.g., "eduardo.baptista"
      console.log(\`   🔍 Buscando por username: \${username}\`);
      
      // Usar lista cacheada de usuarios
      const users = await getCachedUsersList();
      
      for (const user of users) {
        // Buscar coincidencias en el campo "name" (username)
        if (user.name === username) {
          slackUserCache.set(email, user.id);
          console.log(\`   ✅ Usuario encontrado por nombre: \${user.id} (\${user.name})\`);
          return user.id;
        }
        
        // Fallback: buscar en real_name
        if (user.real_name && user.real_name.toLowerCase().includes(username.replace('.', ' '))) {
          slackUserCache.set(email, user.id);
          console.log(\`   ✅ Usuario encontrado por real_name: \${user.id} (\${user.real_name})\`);
          return user.id;
        }
      }
      
      // No encontrado, guardar null en caché para no reintentar pronto
      slackUserCache.set(email, null);
      console.log(\`   ℹ️ No se encontró usuario en Slack para \${email}\`);
      return null;
    }
  } catch (error) {
    console.log(\`   ⚠️ Error buscando usuario: \${error.message}\`);
    return null;
  }
}`;

// Encontrar la función original y reemplazarla
const pattern = /\/\*\*\s+\* Buscar user ID de Slack.*?\n\}\s+(?=\n\/\*\*|\n\s*\/\*\*|\n\s*async\s+function\s+isBotMentioned)/s;
content = content.replace(pattern, newFindFunction + '\n\n');

// Escribir el archivo
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Archivo index.js optimizado correctamente');
console.log('\n📋 Cambios realizados:');
console.log('   1. Agregado caché de usuarios de Slack');
console.log('   2. Agregada función getCachedUsersList()');
console.log('   3. Optimizada función findSlackUserByEmail()');
console.log('\n🚀 El bot usará caché para evitar rate limiting');
