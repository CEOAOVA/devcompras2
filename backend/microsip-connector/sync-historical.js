#!/usr/bin/env node

/**
 * CARGA HISTÓRICA: Microsip → Supabase
 *
 * Script helper para sincronizar años completos de datos históricos
 *
 * Uso:
 *   node sync-historical.js 2020      # Sincronizar todo el año 2020
 *   node sync-historical.js 2020 2024 # Sincronizar desde 2020 hasta 2024
 *   node sync-historical.js all       # Sincronizar todo (2020-presente)
 */

require('dotenv').config();
const etl = require('./src/services/etlService');

const arg1 = process.argv[2];
const arg2 = process.argv[3];

/**
 * Sincronizar un año completo
 */
async function syncYear(year) {
  const fechaInicio = `${year}-01-01`;
  const fechaFin = `${year}-12-31`;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📅 SINCRONIZANDO AÑO ${year}`);
  console.log(`   Desde: ${fechaInicio}`);
  console.log(`   Hasta: ${fechaFin}`);
  console.log(`${'═'.repeat(70)}\n`);

  const startTime = Date.now();

  try {
    const result = await etl.syncVentas(fechaInicio, fechaFin);
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`\n✅ Año ${year} completado en ${duration} segundos`);
    console.log(`   Registros: ${result.inserted} insertados, ${result.failed} errores\n`);

    return { year, success: true, ...result, duration };

  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`\n❌ Error en año ${year}:`);
    console.error(`   ${error.message}\n`);

    return { year, success: false, error: error.message, duration };
  }
}

/**
 * Sincronizar rango de años
 */
async function syncYearRange(startYear, endYear) {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  CARGA HISTÓRICA: MICROSIP → SUPABASE                  ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const results = [];

  // Primero sincronizar catálogo (una sola vez)
  console.log('📋 Sincronizando catálogo base...\n');

  try {
    console.log('🔄 Categorías...');
    await etl.syncCategorias();

    console.log('🔄 Tiendas...');
    await etl.syncTiendas();

    console.log('🔄 Productos...');
    await etl.syncProductos();

    console.log('🔄 Precios...');
    await etl.syncPrecios();

    console.log('\n✅ Catálogo sincronizado\n');
  } catch (error) {
    console.error('❌ Error al sincronizar catálogo:', error.message);
    console.error('   Continuando con ventas...\n');
  }

  // Sincronizar ventas y movimientos año por año
  for (let year = startYear; year <= endYear; year++) {
    // 1. Ventas
    const resultVentas = await syncYear(year);
    results.push(resultVentas);

    // 2. Movimientos de Inventario
    const fechaInicio = `${year}-01-01`;
    const fechaFin = `${year}-12-31`;

    console.log(`📦 Sincronizando movimientos de inventario ${year}...`);
    try {
      const resultMovs = await etl.syncInventarioMovimientos(fechaInicio, fechaFin);
      console.log(`   Movimientos: ${resultMovs.inserted} insertados\n`);
    } catch (error) {
      console.error(`❌ Error en movimientos ${year}: ${error.message}\n`);
    }
  }

  // Sincronizar año actual hasta hoy
  const currentYear = new Date().getFullYear();
  if (endYear >= currentYear) {
    const hoy = new Date().toISOString().split('T')[0];
    const fechaInicio = `${currentYear}-01-01`;

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📅 SINCRONIZANDO AÑO ${currentYear} (hasta hoy)`);
    console.log(`   Desde: ${fechaInicio}`);
    console.log(`   Hasta: ${hoy}`);
    console.log(`${'═'.repeat(70)}\n`);

    const startTime = Date.now();
    try {
      const result = await etl.syncVentas(fechaInicio, hoy);
      const duration = Math.round((Date.now() - startTime) / 1000);

      console.log(`\n✅ Año ${currentYear} completado en ${duration} segundos`);
      console.log(`   Ventas: ${result.inserted} insertados\n`);

      // Sincronizar movimientos del año actual
      console.log(`📦 Sincronizando movimientos de inventario ${currentYear}...`);
      const resultMovs = await etl.syncInventarioMovimientos(fechaInicio, hoy);
      console.log(`   Movimientos: ${resultMovs.inserted} insertados\n`);

      // Reemplazar resultado del año actual
      const currentYearIndex = results.findIndex(r => r.year === currentYear);
      if (currentYearIndex >= 0) {
        results[currentYearIndex] = { year: currentYear, success: true, ...result, duration };
      } else {
        results.push({ year: currentYear, success: true, ...result, duration });
      }
    } catch (error) {
      console.error(`\n❌ Error en año ${currentYear}:`, error.message);
    }
  }

  // Actualizar inventario al final
  console.log(`\n${'═'.repeat(70)}`);
  console.log('📦 ACTUALIZANDO INVENTARIO ACTUAL');
  console.log(`${'═'.repeat(70)}\n`);

  try {
    const inventarioResult = await etl.syncInventarioActual();
    console.log(`\n✅ Inventario actualizado: ${inventarioResult.inserted} registros\n`);
  } catch (error) {
    console.error(`\n❌ Error al actualizar inventario:`, error.message);
  }

  // Resumen final
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  RESUMEN DE CARGA HISTÓRICA                            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  let totalRegistros = 0;
  let totalDuracion = 0;
  let exitosos = 0;
  let fallidos = 0;

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const registros = r.inserted || 0;
    const duracion = r.duration || 0;

    console.log(`${status} Año ${r.year}: ${registros.toLocaleString()} registros (${duracion}s)`);

    if (r.success) {
      totalRegistros += registros;
      totalDuracion += duracion;
      exitosos++;
    } else {
      fallidos++;
    }
  });

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📊 Total registros sincronizados: ${totalRegistros.toLocaleString()}`);
  console.log(`⏱️  Tiempo total: ${Math.round(totalDuracion / 60)} minutos`);
  console.log(`✅ Años exitosos: ${exitosos}`);
  if (fallidos > 0) {
    console.log(`❌ Años con error: ${fallidos}`);
  }
  console.log(`\n${'═'.repeat(60)}\n`);

  // Guardar resumen en JSON
  const fs = require('fs');
  const path = require('path');
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const summary = {
    timestamp: new Date().toISOString(),
    yearRange: `${startYear}-${endYear}`,
    totalRecords: totalRegistros,
    totalDurationSeconds: totalDuracion,
    successfulYears: exitosos,
    failedYears: fallidos,
    results
  };

  const summaryFile = path.join(logDir, 'historical-sync-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  console.log(`📝 Resumen guardado en: logs/historical-sync-summary.json\n`);

  return results;
}

/**
 * Main
 */
async function main() {
  if (!arg1) {
    console.log('\n❌ Error: Se requiere al menos un argumento\n');
    console.log('Uso:');
    console.log('  node sync-historical.js 2020          # Sincronizar solo 2020');
    console.log('  node sync-historical.js 2020 2024     # Sincronizar 2020-2024');
    console.log('  node sync-historical.js all           # Sincronizar todo (2020-presente)\n');
    process.exit(1);
  }

  // Verificar credenciales
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('\n❌ ERROR: Credenciales de Supabase no configuradas');
    console.error('   Agrega SUPABASE_URL y SUPABASE_SERVICE_KEY al archivo .env\n');
    process.exit(1);
  }

  let startYear, endYear;

  if (arg1 === 'all') {
    startYear = 2020; // Ajustar según tus datos
    endYear = new Date().getFullYear();
  } else {
    startYear = parseInt(arg1);
    endYear = arg2 ? parseInt(arg2) : startYear;

    if (isNaN(startYear) || isNaN(endYear)) {
      console.error('\n❌ Error: Los años deben ser números válidos\n');
      process.exit(1);
    }
  }

  console.log(`\n📋 Configuración:`);
  console.log(`   Microsip: ${process.env.FIREBIRD_HOST}:${process.env.FIREBIRD_PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL}`);
  console.log(`   Rango: ${startYear} - ${endYear}\n`);

  try {
    await syncYearRange(startYear, endYear);
    console.log('🎉 Carga histórica completada exitosamente\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
