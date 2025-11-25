/**
 * TEST RÁPIDO: Query a VW_FACT_VENTAS con filtro de fecha
 *
 * Este test verifica si consultar con filtro de fecha es rápido
 * y retorna datos en formato JSON válido
 *
 * Uso:
 *   node test-query-rapida.js
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

console.log('\n🚀 TEST DE QUERY RÁPIDA CON FILTRO DE FECHA\n');
console.log('═'.repeat(70));

// Calcular fechas
const hoy = new Date();
const hace7dias = new Date();
hace7dias.setDate(hoy.getDate() - 7);

const fechaFin = hoy.toISOString().split('T')[0];
const fechaInicio = hace7dias.toISOString().split('T')[0];

console.log(`\n📅 Rango de consulta:`);
console.log(`   Desde: ${fechaInicio}`);
console.log(`   Hasta: ${fechaFin}`);
console.log(`   (Últimos 7 días)\n`);

async function testQueryRapida() {
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
        // ==========================================
        // TEST 1: Count con filtro de fecha
        // ==========================================
        console.log('\n📊 TEST 1: COUNT con filtro de fecha (últimos 7 días)\n');

        const startCount = Date.now();

        const countSQL = `
          SELECT COUNT(*) as TOTAL
          FROM VW_FACT_VENTAS
          WHERE FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        `;

        console.log('⏱️  Iniciando COUNT...');

        const countResult = await new Promise((resolve, reject) => {
          db.query(countSQL, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        const countTime = Date.now() - startCount;
        const total = countResult[0].TOTAL;

        console.log(`✅ COUNT completado en ${countTime}ms`);
        console.log(`📈 Total de registros: ${total.toLocaleString()}\n`);

        if (countTime > 5000) {
          console.log('⚠️  ADVERTENCIA: COUNT tardó más de 5 segundos');
          console.log('   Recomendación: Evitar COUNT en queries de producción\n');
        } else {
          console.log('✅ Tiempo aceptable para COUNT\n');
        }

        // ==========================================
        // TEST 2: SELECT primeros 10 registros
        // ==========================================
        console.log('═'.repeat(70));
        console.log('\n📊 TEST 2: SELECT primeros 10 registros con filtro\n');

        const startSelect = Date.now();

        const selectSQL = `
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

        console.log('⏱️  Iniciando SELECT...');

        const ventas = await new Promise((resolve, reject) => {
          db.query(selectSQL, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        const selectTime = Date.now() - startSelect;

        console.log(`✅ SELECT completado en ${selectTime}ms`);
        console.log(`📦 Registros obtenidos: ${ventas.length}\n`);

        if (selectTime > 3000) {
          console.log('⚠️  ADVERTENCIA: SELECT tardó más de 3 segundos');
          console.log('   Recomendación: Optimizar índices o reducir rango\n');
        } else {
          console.log('✅ Tiempo excelente para SELECT\n');
        }

        // ==========================================
        // TEST 3: Convertir a JSON y validar
        // ==========================================
        console.log('═'.repeat(70));
        console.log('\n📊 TEST 3: Conversión a JSON y validación\n');

        const jsonData = ventas.map(venta => ({
          fecha: venta.FECHA instanceof Date
            ? venta.FECHA.toISOString().split('T')[0]
            : venta.FECHA,
          hora: venta.HORA || null,
          tiendaId: venta.TIENDA_ID ? venta.TIENDA_ID.trim() : null,
          ticketId: venta.TICKET_ID ? venta.TICKET_ID.trim() : null,
          sku: venta.SKU ? venta.SKU.trim() : null,
          cantidad: Number(venta.CANTIDAD) || 0,
          precioUnitario: Number(venta.PRECIO_UNITARIO) || 0,
          descuento: Number(venta.DESCUENTO) || 0,
          impuesto: Number(venta.IMPUESTO) || 0,
          costoUnitario: Number(venta.COSTO_UNITARIO) || 0,
          canal: venta.CANAL ? venta.CANAL.trim() : null,
          vendedorId: venta.VENDEDOR_ID ? venta.VENDEDOR_ID.trim() : null,
          clienteId: venta.CLIENTE_ID ? venta.CLIENTE_ID.trim() : null,
          margenUnitario: Number(venta.MARGEN_UNITARIO) || 0,
          // Campos calculados
          total: (Number(venta.PRECIO_UNITARIO) * Number(venta.CANTIDAD)) -
                 Number(venta.DESCUENTO) +
                 Number(venta.IMPUESTO),
          margenTotal: Number(venta.MARGEN_UNITARIO) * Number(venta.CANTIDAD)
        }));

        console.log('✅ Datos convertidos a JSON exitosamente');
        console.log(`📄 Tamaño JSON: ${JSON.stringify(jsonData).length} bytes\n`);

        // ==========================================
        // TEST 4: Mostrar muestra de datos
        // ==========================================
        console.log('═'.repeat(70));
        console.log('\n📊 TEST 4: Muestra de datos (primeros 3 registros)\n');

        jsonData.slice(0, 3).forEach((venta, idx) => {
          console.log(`\n📌 Registro ${idx + 1}:`);
          console.log(`   Fecha: ${venta.fecha}`);
          console.log(`   Tienda: ${venta.tiendaId}`);
          console.log(`   Ticket: ${venta.ticketId}`);
          console.log(`   SKU: ${venta.sku}`);
          console.log(`   Cantidad: ${venta.cantidad.toLocaleString()}`);
          console.log(`   Precio Unit: $${venta.precioUnitario.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
          console.log(`   Total: $${venta.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
          console.log(`   Margen: $${venta.margenTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
        });

        // ==========================================
        // TEST 5: Calcular KPIs
        // ==========================================
        console.log('\n═'.repeat(70));
        console.log('\n📊 TEST 5: KPIs calculados\n');

        const kpis = {
          totalTransacciones: jsonData.length,
          ingresosTotales: jsonData.reduce((sum, v) => sum + v.total, 0),
          margenTotal: jsonData.reduce((sum, v) => sum + v.margenTotal, 0),
          promedioVenta: jsonData.length > 0
            ? jsonData.reduce((sum, v) => sum + v.total, 0) / jsonData.length
            : 0,
          tiendasUnicas: new Set(jsonData.map(v => v.tiendaId)).size,
          skusUnicos: new Set(jsonData.map(v => v.sku)).size
        };

        console.log(`📈 KPIs (muestra de ${jsonData.length} registros):`);
        console.log(`   Total transacciones: ${kpis.totalTransacciones.toLocaleString()}`);
        console.log(`   Ingresos totales: $${kpis.ingresosTotales.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
        console.log(`   Margen total: $${kpis.margenTotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
        console.log(`   Promedio por venta: $${kpis.promedioVenta.toLocaleString('es-MX', {minimumFractionDigits: 2})}`);
        console.log(`   Tiendas únicas: ${kpis.tiendasUnicas}`);
        console.log(`   SKUs únicos: ${kpis.skusUnicos}`);

        // ==========================================
        // RESUMEN FINAL
        // ==========================================
        console.log('\n═'.repeat(70));
        console.log('\n✅ PRUEBA COMPLETADA EXITOSAMENTE\n');
        console.log('📊 RESUMEN DE PERFORMANCE:');
        console.log(`   COUNT(últimos 7 días): ${countTime}ms`);
        console.log(`   SELECT(10 registros): ${selectTime}ms`);
        console.log(`   Total registros disponibles: ${total.toLocaleString()}\n`);

        console.log('💡 RECOMENDACIONES:');
        if (countTime < 2000 && selectTime < 1000) {
          console.log('   ✅ Performance EXCELENTE con filtro de fecha');
          console.log('   ✅ Puedes usar VW_FACT_VENTAS con filtros de fecha obligatorios');
          console.log('   ✅ Evitar COUNT sin filtro, siempre usar rango de fechas');
        } else if (countTime < 5000 && selectTime < 3000) {
          console.log('   ⚠️  Performance ACEPTABLE con filtro de fecha');
          console.log('   ⚠️  Considera implementar cache Redis (TTL 5 min)');
          console.log('   ⚠️  Limitar rangos a máximo 30-90 días');
        } else {
          console.log('   ❌ Performance LENTA incluso con filtro');
          console.log('   ❌ Recomendación: Implementar ETL a Supabase');
          console.log('   ❌ O consultar tablas base directamente');
        }

        console.log(`\n📝 JSON de respuesta guardado en: test-query-output.json\n`);

        // Guardar JSON de salida
        const fs = require('fs');
        const output = {
          success: true,
          periodo: { fechaInicio, fechaFin },
          performance: {
            countMs: countTime,
            selectMs: selectTime,
            totalRegistros: total
          },
          kpis,
          muestra: jsonData.slice(0, 5)
        };

        fs.writeFileSync(
          'test-query-output.json',
          JSON.stringify(output, null, 2),
          'utf8'
        );

        console.log('═'.repeat(70));
        console.log('\n🎉 Test finalizado exitosamente\n');

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
testQueryRapida()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
