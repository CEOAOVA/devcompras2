/**
 * Script de validación de conexión al schema 'embler' en Supabase
 *
 * Este script verifica que:
 * 1. Las variables de entorno están correctamente configuradas
 * 2. Se puede conectar al proyecto de Supabase
 * 3. Se puede acceder al schema 'embler'
 * 4. Las tablas principales existen y son accesibles
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

async function testConnection() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 TEST DE CONEXIÓN AL SCHEMA EMBLER');
  console.log('='.repeat(70) + '\n');

  // 1. Validar variables de entorno
  log(colors.blue, '📋', 'Paso 1: Validando variables de entorno...');

  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SCHEMA'
  ];

  let envVarsValid = true;
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      log(colors.red, '❌', `Variable ${varName} no definida en .env`);
      envVarsValid = false;
    } else {
      const displayValue = varName.includes('KEY')
        ? process.env[varName].substring(0, 20) + '...'
        : process.env[varName];
      log(colors.green, '✅', `${varName} = ${displayValue}`);
    }
  }

  if (!envVarsValid) {
    log(colors.red, '❌', 'Faltan variables de entorno requeridas');
    process.exit(1);
  }

  // 2. Crear cliente de Supabase
  log(colors.blue, '\n📋', 'Paso 2: Creando cliente de Supabase...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const schema = process.env.SUPABASE_SCHEMA || 'public';

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: schema,
    },
  });

  log(colors.green, '✅', `Cliente creado para schema: ${schema}`);

  // 3. Test de conexión - Verificar tablas existentes
  log(colors.blue, '\n📋', 'Paso 3: Verificando tablas en schema embler...');

  const tablesToCheck = [
    'datasets',
    'insights',
    'chat_conversations',
    'chat_messages',
    'ml_models',
    'documents',
    'document_chunks',
    'audio_transcriptions',
    'sessions',
    'refresh_tokens',
    'users_security',
  ];

  let allTablesExist = true;

  for (const tableName of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        // Si el error es de permisos o tabla no existe
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          log(colors.red, '❌', `Tabla ${tableName} no existe o no es accesible`);
          allTablesExist = false;
        } else {
          log(colors.yellow, '⚠️', `Tabla ${tableName} existe pero hubo error: ${error.message}`);
        }
      } else {
        log(colors.green, '✅', `Tabla ${tableName} accesible (${count || 0} filas)`);
      }
    } catch (err) {
      log(colors.red, '❌', `Error al verificar tabla ${tableName}: ${err.message}`);
      allTablesExist = false;
    }
  }

  // 4. Test de funciones - Verificar funciones principales
  log(colors.blue, '\n📋', 'Paso 4: Verificando funciones en schema embler...');

  const functionsToCheck = [
    { name: 'match_documents_secure', description: 'Búsqueda vectorial segura' },
    { name: 'hybrid_search', description: 'Búsqueda híbrida (vectorial + texto)' },
    { name: 'is_account_locked', description: 'Verificar bloqueo de cuenta' },
    { name: 'record_failed_login', description: 'Registrar login fallido' },
  ];

  let allFunctionsExist = true;

  for (const func of functionsToCheck) {
    try {
      // Intentar ejecutar la función con parámetros vacíos/nulos para verificar que existe
      // (esperamos error de parámetros, no de función no existe)
      const { data, error } = await supabase.rpc(func.name);

      if (error) {
        // Si el error es "function does not exist", la función no existe
        if (error.message.includes('does not exist') || error.code === 'PGRST204') {
          log(colors.red, '❌', `Función ${func.name} no existe`);
          allFunctionsExist = false;
        } else {
          // Cualquier otro error significa que la función existe pero faltan parámetros
          log(colors.green, '✅', `Función ${func.name} existe (${func.description})`);
        }
      } else {
        log(colors.green, '✅', `Función ${func.name} existe y ejecutable`);
      }
    } catch (err) {
      log(colors.yellow, '⚠️', `No se pudo verificar función ${func.name}: ${err.message}`);
    }
  }

  // 5. Test de Storage Buckets
  log(colors.blue, '\n📋', 'Paso 5: Verificando Storage Buckets...');

  const bucketsToCheck = [
    'csv-uploads',
    'excel-files',
    'pdf-reports',
    'ml-models',
    'user-exports',
  ];

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      log(colors.red, '❌', `Error al listar buckets: ${error.message}`);
    } else {
      const bucketNames = buckets.map(b => b.name);

      for (const bucketName of bucketsToCheck) {
        if (bucketNames.includes(bucketName)) {
          log(colors.green, '✅', `Bucket ${bucketName} existe`);
        } else {
          log(colors.yellow, '⚠️', `Bucket ${bucketName} no encontrado`);
        }
      }
    }
  } catch (err) {
    log(colors.red, '❌', `Error al verificar buckets: ${err.message}`);
  }

  // 6. Resumen final
  console.log('\n' + '='.repeat(70));
  log(colors.cyan, '📊', 'RESUMEN DE VALIDACIÓN:');
  console.log('='.repeat(70));

  if (envVarsValid && allTablesExist && allFunctionsExist) {
    log(colors.green, '✅', 'TODAS LAS VALIDACIONES PASARON EXITOSAMENTE');
    log(colors.green, '✅', `Schema 'embler' está correctamente configurado y accesible`);
    console.log('');
    return 0;
  } else {
    log(colors.red, '❌', 'ALGUNAS VALIDACIONES FALLARON');
    if (!envVarsValid) {
      log(colors.red, '  ', 'Variables de entorno incompletas');
    }
    if (!allTablesExist) {
      log(colors.red, '  ', 'Algunas tablas no existen o no son accesibles');
    }
    if (!allFunctionsExist) {
      log(colors.red, '  ', 'Algunas funciones no existen');
    }
    console.log('');
    return 1;
  }
}

// Ejecutar test
testConnection()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    log(colors.red, '❌', `Error crítico: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
