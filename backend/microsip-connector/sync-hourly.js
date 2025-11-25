#!/usr/bin/env node

/**
 * SINCRONIZACIÓN HORARIA: Microsip → Supabase
 *
 * Este script se ejecuta cada hora para mantener Supabase actualizado con:
 * - Ventas de la última hora
 * - Inventario actual (snapshot)
 *
 * Diseñado para ejecutarse automáticamente via Task Scheduler / Cron
 *
 * Uso:
 *   node sync-hourly.js
 */

require('dotenv').config();
const etl = require('./src/services/etlService');
const fs = require('fs');
const path = require('path');

// Configuración
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'sync-hourly.log');

/**
 * Escribir en log file
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  // Crear directorio de logs si no existe
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // Escribir a archivo
  fs.appendFileSync(LOG_FILE, logMessage);

  // También mostrar en consola
  console.log(logMessage.trim());
}

/**
 * Calcular rango de fechas para la última hora
 */
function getHourlyDateRange() {
  const ahora = new Date();
  const haceUnaHora = new Date(ahora.getTime() - 60 * 60 * 1000);

  // Si es la primera hora del día, sincronizar desde medianoche
  if (ahora.getHours() === 0) {
    const medianoche = new Date(ahora);
    medianoche.setHours(0, 0, 0, 0);
    return {
      fechaInicio: medianoche.toISOString().split('T')[0],
      fechaFin: ahora.toISOString().split('T')[0]
    };
  }

  // Formato: YYYY-MM-DD
  const fechaInicio = haceUnaHora.toISOString().split('T')[0];
  const fechaFin = ahora.toISOString().split('T')[0];

  return { fechaInicio, fechaFin };
}

/**
 * Sincronización horaria principal
 */
async function syncHourly() {
  const startTime = Date.now();

  log('═'.repeat(70));
  log('🚀 INICIO DE SINCRONIZACIÓN HORARIA');
  log('═'.repeat(70));

  try {
    // 1. Calcular rango de fechas
    const { fechaInicio, fechaFin } = getHourlyDateRange();
    log(`📅 Rango: ${fechaInicio} hasta ${fechaFin}`);

    // 2. Sincronizar ventas de la última hora
    log('\n📊 Sincronizando ventas...');
    const resultVentas = await etl.syncVentas(fechaInicio, fechaFin);
    log(`✅ Ventas: ${resultVentas.inserted} registros insertados`);

    // 3. Actualizar inventario actual
    log('\n📦 Actualizando inventario...');
    const resultInventario = await etl.syncInventarioActual();
    log(`✅ Inventario: ${resultInventario.inserted} registros actualizados`);

    // 4. Resumen
    const duration = Math.round((Date.now() - startTime) / 1000);
    log('\n═'.repeat(70));
    log('✅ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE');
    log(`⏱️  Duración: ${duration} segundos`);
    log(`📊 Total registros procesados: ${resultVentas.total + resultInventario.total}`);
    log('═'.repeat(70));

    // 5. Guardar resumen en JSON
    const summary = {
      timestamp: new Date().toISOString(),
      success: true,
      duration_seconds: duration,
      ventas: resultVentas,
      inventario: resultInventario
    };

    const summaryFile = path.join(LOG_DIR, 'last-sync.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

    process.exit(0);

  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'ERROR');
    log(error.stack, 'ERROR');

    // Guardar error en JSON
    const errorSummary = {
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      stack: error.stack
    };

    const summaryFile = path.join(LOG_DIR, 'last-sync.json');
    fs.writeFileSync(summaryFile, JSON.stringify(errorSummary, null, 2));

    process.exit(1);
  }
}

// Verificar conexiones antes de ejecutar
log('🔍 Verificando conexiones...');
log(`   Microsip: ${process.env.FIREBIRD_HOST}:${process.env.FIREBIRD_PORT}`);
log(`   Supabase: ${process.env.SUPABASE_URL ? 'Configurado ✓' : 'NO CONFIGURADO ✗'}`);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  log('❌ ERROR: Credenciales de Supabase no configuradas en .env', 'ERROR');
  log('   Agrega SUPABASE_URL y SUPABASE_SERVICE_KEY al archivo .env', 'ERROR');
  process.exit(1);
}

// Ejecutar sincronización
syncHourly();
