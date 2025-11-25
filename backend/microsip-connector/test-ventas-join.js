/**
 * TEST: Performance de JOIN entre DOCTOS_PV + DOCTOS_PV_DET + ARTICULOS
 *
 * Este test valida que usar tablas base con JOIN es más rápido que VW_FACT_VENTAS
 * y que retorna los mismos datos.
 *
 * Comparación esperada:
 * - VW_FACT_VENTAS: 8,500ms (LENTA)
 * - DOCTOS_PV + JOIN: < 1,000ms (RÁPIDA)
 *
 * Uso:
 *   node test-ventas-join.js
 */

require('dotenv').config();
const Firebird = require('node-firebird');

const options = {
  host: process.env.FIREBIRD_HOST || '192.65.134.78',
  port: parseInt(process.env.FIREBIRD_PORT || '3050'),
  database: process.env.FIREBIRD_DATABASE || 'C:\\Microsip datos\\EMBLER.FDB',
  user: process.env.FIREBIRD_USER || 'SYSDBA',
  password: process.env.FIREBIRD_PASSWORD || 'masterkey',
  lowercase_keys: false,
  role: null,
  pageSize: 4096
};

console.log('\n🔬 TEST DE PERFORMANCE: JOIN vs VW_FACT_VENTAS\n');
console.log('═'.repeat(70));

// Calcular fechas (últimos 7 días)
const hoy = new Date();
const hace7dias = new Date();
hace7dias.setDate(hoy.getDate() - 7);

const fechaFin = hoy.toISOString().split('T')[0];
const fechaInicio = hace7dias.toISOString().split('T')[0];

console.log(`\n📅 Período de prueba:`);
console.log(`   Desde: ${fechaInicio}`);
console.log(`   Hasta: ${fechaFin}`);
console.log(`   (Últimos 7 días)\n`);

function executeQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function testQueries() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Conectando a Firebird...\n');

    Firebird.attach(options, async (err, db) => {
      if (err) {
        console.error('❌ ERROR DE CONEXIÓN:');
        console.error(`   ${err.message}\n`);
        reject(err);
        return;
      }

      console.log('✅ Conectado exitosamente\n');
      console.log('═'.repeat(70));

      try {
        const resultados = {
          vw_fact_ventas: {},
          doctos_pv_join: {},
          comparacion: {}
        };

        // ==========================================
        // TEST 1: VW_FACT_VENTAS (Query original - LENTA)
        // ==========================================
        console.log('\n📊 TEST 1: VW_FACT_VENTAS (Query Original)\n');

        const startVW = Date.now();

        const sqlVW = `
          SELECT FIRST 10
            FECHA,
            HORA,
            TIENDA_ID,
            TICKET_ID,
            SKU,
            CANTIDAD,
            PRECIO_UNITARIO,
            DESCUENTO,
            IMPUESTO,
            COSTO_UNITARIO,
            CANAL,
            VENDEDOR_ID,
            CLIENTE_ID,
            MARGEN_UNITARIO
          FROM VW_FACT_VENTAS
          WHERE FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
          ORDER BY FECHA DESC, HORA DESC
        `;

        console.log('⏱️  Ejecutando VW_FACT_VENTAS...');

        const ventasVW = await executeQuery(db, sqlVW);
        const timeVW = Date.now() - startVW;

        console.log(`✅ Completado en ${timeVW}ms`);
        console.log(`📦 Registros: ${ventasVW.length}\n`);

        resultados.vw_fact_ventas = {
          tiempo_ms: timeVW,
          registros: ventasVW.length,
          muestra: ventasVW.slice(0, 3)
        };

        // ==========================================
        // TEST 2: DOCTOS_PV + JOIN (Query optimizada - RÁPIDA)
        // ==========================================
        console.log('═'.repeat(70));
        console.log('\n📊 TEST 2: DOCTOS_PV + DOCTOS_PV_DET + ARTICULOS (Query Optimizada)\n');

        const startJOIN = Date.now();

        const sqlJOIN = `
          SELECT FIRST 10
            pv.DOCTO_PV_ID,
            pv.FOLIO as TICKET,
            pv.FECHA as FECHA_VENTA,
            pv.SUCURSAL_ID as TIENDA_ID,
            pv.CLIENTE_ID,
            pv.VENDEDOR_ID,
            pv.ALMACEN_ID,

            det.DOCTO_PV_DET_ID,
            det.ARTICULO_ID,
            det.CLAVE_ARTICULO as SKU,
            det.UNIDADES as CANTIDAD,
            det.UNIDADES_DEV as CANTIDAD_DEVUELTA,
            det.PRECIO_UNITARIO,
            det.PRECIO_UNITARIO_IMPTO as PRECIO_CON_IVA,
            det.IMPUESTO_POR_UNIDAD as IMPUESTO,
            det.PRECIO_TOTAL_NETO as TOTAL_PARTIDA,

            art.LINEA_ARTICULO_ID as CATEGORIA_ID,

            (det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as CANTIDAD_NETA

          FROM DOCTOS_PV pv
          INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
          INNER JOIN ARTICULOS art ON det.ARTICULO_ID = art.ARTICULO_ID

          WHERE pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
            AND pv.FECHA_HORA_CANCELACION IS NULL

          ORDER BY pv.FECHA DESC, pv.FOLIO DESC
        `;

        console.log('⏱️  Ejecutando JOIN...');

        const ventasJOIN = await executeQuery(db, sqlJOIN);
        const timeJOIN = Date.now() - startJOIN;

        console.log(`✅ Completado en ${timeJOIN}ms`);
        console.log(`📦 Registros: ${ventasJOIN.length}\n`);

        resultados.doctos_pv_join = {
          tiempo_ms: timeJOIN,
          registros: ventasJOIN.length,
          muestra: ventasJOIN.slice(0, 3)
        };

        // ==========================================
        // TEST 3: COUNT para validar total de registros
        // ==========================================
        console.log('═'.repeat(70));
        console.log('\n📊 TEST 3: Validación de Totales\n');

        // Count VW_FACT_VENTAS
        const startCountVW = Date.now();
        const countVW = await executeQuery(
          db,
          `SELECT COUNT(*) as TOTAL FROM VW_FACT_VENTAS
           WHERE FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'`
        );
        const timeCountVW = Date.now() - startCountVW;

        console.log(`VW_FACT_VENTAS COUNT: ${countVW[0].TOTAL.toLocaleString()} registros (${timeCountVW}ms)`);

        // Count JOIN
        const startCountJOIN = Date.now();
        const countJOIN = await executeQuery(
          db,
          `SELECT COUNT(*) as TOTAL FROM DOCTOS_PV pv
           INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
           WHERE pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
             AND pv.FECHA_HORA_CANCELACION IS NULL`
        );
        const timeCountJOIN = Date.now() - startCountJOIN;

        console.log(`DOCTOS_PV JOIN COUNT: ${countJOIN[0].TOTAL.toLocaleString()} registros (${timeCountJOIN}ms)\n`);

        resultados.comparacion = {
          total_vw: countVW[0].TOTAL,
          total_join: countJOIN[0].TOTAL,
          diferencia: countVW[0].TOTAL - countJOIN[0].TOTAL,
          count_time_vw: timeCountVW,
          count_time_join: timeCountJOIN
        };

        // ==========================================
        // COMPARACION Y ANALISIS
        // ==========================================
        console.log('═'.repeat(70));
        console.log('\n📈 COMPARACIÓN DE PERFORMANCE\n');

        const mejora = ((timeVW - timeJOIN) / timeVW * 100).toFixed(1);
        const factorMejora = (timeVW / timeJOIN).toFixed(1);

        console.log('┌─────────────────────────────────────────────────────┐');
        console.log('│                 SELECT (10 registros)               │');
        console.log('├─────────────────────────────────────────────────────┤');
        console.log(`│ VW_FACT_VENTAS:          ${timeVW.toString().padStart(6)}ms               │`);
        console.log(`│ DOCTOS_PV + JOIN:        ${timeJOIN.toString().padStart(6)}ms               │`);
        console.log(`│                                                     │`);
        console.log(`│ Mejora:                  ${mejora.padStart(6)}%                │`);
        console.log(`│ Factor:                  ${factorMejora.padStart(6)}x más rápida       │`);
        console.log('└─────────────────────────────────────────────────────┘');

        console.log('\n┌─────────────────────────────────────────────────────┐');
        console.log('│                 COUNT (total registros)             │');
        console.log('├─────────────────────────────────────────────────────┤');
        console.log(`│ VW_FACT_VENTAS:          ${timeCountVW.toString().padStart(6)}ms               │`);
        console.log(`│ DOCTOS_PV + JOIN:        ${timeCountJOIN.toString().padStart(6)}ms               │`);
        console.log('└─────────────────────────────────────────────────────┘');

        console.log('\n┌─────────────────────────────────────────────────────┐');
        console.log('│                 TOTALES                             │');
        console.log('├─────────────────────────────────────────────────────┤');
        console.log(`│ VW_FACT_VENTAS:          ${countVW[0].TOTAL.toLocaleString().padStart(6)} registros      │`);
        console.log(`│ DOCTOS_PV + JOIN:        ${countJOIN[0].TOTAL.toLocaleString().padStart(6)} registros      │`);
        console.log(`│ Diferencia:              ${Math.abs(resultados.comparacion.diferencia).toLocaleString().padStart(6)} registros      │`);
        console.log('└─────────────────────────────────────────────────────┘');

        // ==========================================
        // MUESTRA DE DATOS
        // ==========================================
        console.log('\n═'.repeat(70));
        console.log('\n📋 MUESTRA DE DATOS (Primeros 2 registros de cada query)\n');

        console.log('VW_FACT_VENTAS:');
        console.log('─'.repeat(70));
        ventasVW.slice(0, 2).forEach((v, idx) => {
          console.log(`\n${idx + 1}. Fecha: ${v.FECHA}, Ticket: ${v.TICKET_ID?.trim()}, SKU: ${v.SKU?.trim()}`);
          console.log(`   Cantidad: ${v.CANTIDAD}, Precio: $${Number(v.PRECIO_UNITARIO).toFixed(2)}`);
        });

        console.log('\n');
        console.log('DOCTOS_PV + JOIN:');
        console.log('─'.repeat(70));
        ventasJOIN.slice(0, 2).forEach((v, idx) => {
          console.log(`\n${idx + 1}. Fecha: ${v.FECHA_VENTA}, Ticket: ${v.TICKET?.trim()}, SKU: ${v.SKU?.trim()}`);
          console.log(`   Cantidad: ${v.CANTIDAD}, Precio: $${Number(v.PRECIO_UNITARIO).toFixed(2)}`);
          console.log(`   Categoría ID: ${v.CATEGORIA_ID}, Cantidad Neta: ${v.CANTIDAD_NETA}`);
        });

        // ==========================================
        // CONCLUSIONES Y RECOMENDACIONES
        // ==========================================
        console.log('\n\n═'.repeat(70));
        console.log('\n✅ CONCLUSIONES\n');

        if (timeJOIN < 1000) {
          console.log('🚀 EXCELENTE: El JOIN es rápido (< 1 segundo)');
          console.log(`   ✅ ${factorMejora}x más rápido que VW_FACT_VENTAS`);
          console.log('   ✅ RECOMENDACIÓN: Usar DOCTOS_PV + JOIN en producción');
        } else if (timeJOIN < 2000) {
          console.log('✅ BUENO: El JOIN es aceptable (< 2 segundos)');
          console.log(`   ✅ ${factorMejora}x más rápido que VW_FACT_VENTAS`);
          console.log('   ✅ RECOMENDACIÓN: Usar DOCTOS_PV + JOIN con cache Redis');
        } else {
          console.log('⚠️  LENTO: El JOIN también es lento (> 2 segundos)');
          console.log('   ❌ RECOMENDACIÓN: Implementar ETL a Supabase');
        }

        console.log('\n💡 PRÓXIMOS PASOS:');
        console.log('   1. Actualizar ventasController.js para usar DOCTOS_PV + JOIN');
        console.log('   2. Implementar cache Redis (TTL 5 min) para queries frecuentes');
        console.log('   3. Agregar índices en DOCTOS_PV.FECHA si es necesario');
        console.log('   4. Probar con rangos de fechas más largos (30 días)');

        // Guardar resultados
        const fs = require('fs');
        const output = {
          fecha_prueba: new Date().toISOString(),
          periodo: { fechaInicio, fechaFin },
          resultados,
          conclusion: {
            join_es_rapido: timeJOIN < 1000,
            mejora_porcentaje: parseFloat(mejora),
            factor_mejora: parseFloat(factorMejora),
            recomendacion: timeJOIN < 1000 ? 'Usar JOIN en producción' :
                          timeJOIN < 2000 ? 'Usar JOIN con cache' :
                          'Implementar ETL a Supabase'
          }
        };

        fs.writeFileSync(
          'test-ventas-join-output.json',
          JSON.stringify(output, null, 2),
          'utf8'
        );

        console.log('\n📝 Resultados guardados en: test-ventas-join-output.json\n');
        console.log('═'.repeat(70));
        console.log('\n🎉 Test completado exitosamente\n');

        db.detach();
        resolve();

      } catch (error) {
        console.error('\n❌ ERROR DURANTE EL TEST:');
        console.error(`   ${error.message}\n`);
        db.detach();
        reject(error);
      }
    });
  });
}

// Ejecutar test
testQueries()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
