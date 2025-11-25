#!/usr/bin/env node

/**
 * CLI para ejecutar sincronizaciones ETL: Microsip → Supabase
 *
 * Uso:
 *   node sync-etl.js full                    # Sincronización completa
 *   node sync-etl.js categorias              # Solo categorías
 *   node sync-etl.js productos               # Solo productos
 *   node sync-etl.js tiendas                 # Solo tiendas
 *   node sync-etl.js tiendas                 # Solo tiendas
 *   node sync-etl.js precios                 # Solo precios
 *   node sync-etl.js ventas 2025-01-01 2025-01-31  # Ventas por rango
 *   node sync-etl.js movimientos 2025-01-01 2025-01-31 # Movimientos por rango
 *   node sync-etl.js inventario              # Inventario actual
 */

require('dotenv').config();
const etl = require('./src/services/etlService');

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv[4];

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  ETL: MICROSIP → SUPABASE                              ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    switch (command) {
      case 'full':
        const diasVentas = parseInt(arg1) || 90;
        console.log(`📋 Sincronización completa (ventas últimos ${diasVentas} días)\n`);
        await etl.syncFull(diasVentas);
        break;

      case 'categorias':
        console.log('📋 Sincronizando categorías\n');
        await etl.syncCategorias();
        break;

      case 'productos':
        console.log('📋 Sincronizando productos\n');
        await etl.syncProductos();
        break;

      case 'tiendas':
        console.log('📋 Sincronizando tiendas\n');
        await etl.syncTiendas();
        break;

      case 'precios':
        console.log('📋 Sincronizando precios\n');
        await etl.syncPrecios();
        break;

      case 'ventas':
        if (!arg1 || !arg2) {
          console.error('❌ Error: Se requieren fechas de inicio y fin');
          console.log('   Uso: node sync-etl.js ventas YYYY-MM-DD YYYY-MM-DD');
          process.exit(1);
        }
        console.log(`📋 Sincronizando ventas desde ${arg1} hasta ${arg2}\n`);
        await etl.syncVentas(arg1, arg2);
        break;

      case 'movimientos':
        if (!arg1 || !arg2) {
          console.error('❌ Error: Se requieren fechas de inicio y fin');
          console.log('   Uso: node sync-etl.js movimientos YYYY-MM-DD YYYY-MM-DD');
          process.exit(1);
        }
        console.log(`📋 Sincronizando movimientos desde ${arg1} hasta ${arg2}\n`);
        await etl.syncInventarioMovimientos(arg1, arg2);
        break;

      case 'inventario':
        console.log('📋 Sincronizando inventario actual\n');
        await etl.syncInventarioActual();
        break;

      default:
        console.log('❌ Comando no reconocido\n');
        console.log('Comandos disponibles:');
        console.log('  full [dias]               - Sincronización completa (default: 90 días)');
        console.log('  categorias                - Sincronizar categorías');
        console.log('  productos                 - Sincronizar productos');
        console.log('  tiendas                   - Sincronizar tiendas');
        console.log('  precios                   - Sincronizar precios');
        console.log('  ventas FECHA_INI FECHA_FIN - Sincronizar ventas por rango');
        console.log('  movimientos FECHA_INI FECHA_FIN - Sincronizar movimientos por rango');
        console.log('  inventario                - Sincronizar inventario actual');
        console.log('\nEjemplos:');
        console.log('  node sync-etl.js full');
        console.log('  node sync-etl.js full 30');
        console.log('  node sync-etl.js ventas 2025-01-01 2025-01-31');
        console.log('  node sync-etl.js inventario\n');
        process.exit(1);
    }

    console.log('\n✅ Sincronización completada exitosamente\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error durante la sincronización:');
    console.error(`   ${error.message}\n`);
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
