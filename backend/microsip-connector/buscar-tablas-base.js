/**
 * Script para buscar SOLO TABLAS BASE (no vistas) en Microsip
 *
 * Objetivo: Encontrar tablas más rápidas que VW_FACT_VENTAS
 * Busca: MOVIMIENTOS, PARTIDAS, DOCTOS, ARTICULOS, SUCURSALES
 *
 * Uso:
 *   node buscar-tablas-base.js
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

console.log('\n🔍 BÚSQUEDA DE TABLAS BASE - MICROSIP FIREBIRD\n');
console.log('═'.repeat(70));
console.log('Objetivo: Encontrar alternativas rápidas a VW_FACT_VENTAS');
console.log('═'.repeat(70));

const tiposFirebird = {
  7: 'SMALLINT', 8: 'INTEGER', 10: 'FLOAT', 12: 'DATE', 13: 'TIME',
  14: 'CHAR', 16: 'BIGINT', 27: 'DOUBLE', 35: 'TIMESTAMP', 37: 'VARCHAR', 261: 'BLOB'
};

function executeQuery(db, sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function getFields(db, tableName) {
  const sql = `
    SELECT
      RF.RDB$FIELD_NAME as CAMPO,
      F.RDB$FIELD_TYPE as TIPO_ID
    FROM RDB$RELATION_FIELDS RF
    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
    WHERE RF.RDB$RELATION_NAME = '${tableName}'
    ORDER BY RF.RDB$FIELD_POSITION
  `;
  try {
    return await executeQuery(db, sql);
  } catch {
    return [];
  }
}

async function testQuerySpeed(db, tableName) {
  // Calcular últimos 7 días
  const hoy = new Date();
  const hace7dias = new Date();
  hace7dias.setDate(hoy.getDate() - 7);

  const fechaFin = hoy.toISOString().split('T')[0];
  const fechaInicio = hace7dias.toISOString().split('T')[0];

  try {
    // Buscar campo de fecha (puede ser FECHA, FECHA_MOVIMIENTO, etc.)
    const fields = await getFields(db, tableName);
    const campoFecha = fields.find(f =>
      f.CAMPO.trim().includes('FECHA') ||
      f.TIPO_ID === 12 // DATE type
    );

    if (!campoFecha) {
      return { error: 'Sin campo FECHA' };
    }

    const nombreFecha = campoFecha.CAMPO.trim();

    // Test COUNT
    const startCount = Date.now();
    const countSQL = `SELECT COUNT(*) as TOTAL FROM ${tableName} WHERE ${nombreFecha} BETWEEN '${fechaInicio}' AND '${fechaFin}'`;

    const countResult = await executeQuery(db, countSQL);
    const countTime = Date.now() - startCount;

    // Test SELECT
    const startSelect = Date.now();
    const selectSQL = `SELECT FIRST 10 * FROM ${tableName} WHERE ${nombreFecha} BETWEEN '${fechaInicio}' AND '${fechaFin}'`;

    const selectResult = await executeQuery(db, selectSQL);
    const selectTime = Date.now() - startSelect;

    return {
      countMs: countTime,
      selectMs: selectTime,
      total: countResult[0].TOTAL,
      campoFecha: nombreFecha,
      muestra: selectResult.length
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function main() {
  return new Promise((resolve, reject) => {
    console.log('\n🔄 Conectando a Firebird...\n');

    Firebird.attach(options, async (err, db) => {
      if (err) {
        console.error('❌ ERROR:', err.message);
        reject(err);
        return;
      }

      console.log('✅ CONECTADO\n');
      console.log('═'.repeat(70));

      try {
        // ==========================================
        // BUSCAR TABLAS BASE (no vistas)
        // ==========================================
        console.log('\n📋 BUSCANDO TABLAS BASE (RDB$RELATION_TYPE = 0)\n');

        const searchSQL = `
          SELECT DISTINCT RDB$RELATION_NAME as NOMBRE
          FROM RDB$RELATIONS
          WHERE RDB$RELATION_TYPE = 0
          AND RDB$SYSTEM_FLAG = 0
          AND (
            RDB$RELATION_NAME LIKE '%MOVIMIENTO%' OR
            RDB$RELATION_NAME LIKE '%PARTIDA%' OR
            RDB$RELATION_NAME LIKE '%DOCTO%' OR
            RDB$RELATION_NAME LIKE '%VENTA%' OR
            RDB$RELATION_NAME LIKE '%FACT%' OR
            RDB$RELATION_NAME LIKE '%ARTICULO%' OR
            RDB$RELATION_NAME LIKE '%SUCURSAL%'
          )
          ORDER BY RDB$RELATION_NAME
        `;

        const tables = await executeQuery(db, searchSQL);
        console.log(`✅ Encontradas: ${tables.length} tablas\n`);

        const resultados = [];

        for (let i = 0; i < tables.length; i++) {
          const tableName = tables[i].NOMBRE.trim();
          console.log('─'.repeat(70));
          console.log(`\n📊 TABLA ${i + 1}/${tables.length}: ${tableName}\n`);

          // Obtener campos
          const fields = await getFields(db, tableName);
          console.log(`📋 Campos (${fields.length} total):`);

          const camposImportantes = [];
          fields.forEach(f => {
            const nombre = f.CAMPO.trim();
            const tipo = tiposFirebird[f.TIPO_ID] || `ID:${f.TIPO_ID}`;

            // Destacar campos importantes
            if (
              nombre.includes('FECHA') ||
              nombre.includes('MOVIMIENTO') ||
              nombre.includes('PARTIDA') ||
              nombre.includes('ARTICULO') ||
              nombre.includes('CANTIDAD') ||
              nombre.includes('PRECIO') ||
              nombre.includes('SUCURSAL') ||
              nombre.includes('TIENDA') ||
              nombre.includes('SKU') ||
              nombre.includes('FOLIO') ||
              nombre.includes('ID')
            ) {
              console.log(`  ⭐ ${nombre.padEnd(30)} | ${tipo}`);
              camposImportantes.push(nombre);
            }
          });

          if (camposImportantes.length === 0) {
            console.log('  (No se encontraron campos clave)');
          }

          // Test de velocidad
          console.log('\n⏱️  Probando velocidad...');
          const performance = await testQuerySpeed(db, tableName);

          if (performance.error) {
            console.log(`  ⚠️  ${performance.error}`);
          } else {
            console.log(`  ✅ COUNT (7 días): ${performance.countMs}ms`);
            console.log(`  ✅ SELECT (10 reg): ${performance.selectMs}ms`);
            console.log(`  📊 Total registros: ${performance.total.toLocaleString()}`);
            console.log(`  📅 Campo fecha: ${performance.campoFecha}`);

            // Evaluar performance
            if (performance.countMs < 1000 && performance.selectMs < 500) {
              console.log(`  🚀 EXCELENTE - Tabla muy rápida!`);
            } else if (performance.countMs < 3000 && performance.selectMs < 1500) {
              console.log(`  ✅ BUENA - Aceptable para producción`);
            } else {
              console.log(`  ⚠️  LENTA - Similar a VW_FACT_VENTAS`);
            }
          }

          resultados.push({
            nombre: tableName,
            campos: fields.length,
            camposImportantes,
            performance
          });

          console.log('');
        }

        // ==========================================
        // RESUMEN Y RECOMENDACIONES
        // ==========================================
        console.log('\n═'.repeat(70));
        console.log('\n📊 RESUMEN Y RECOMENDACIONES\n');

        // Filtrar tablas rápidas
        const tablasRapidas = resultados.filter(r =>
          !r.performance.error &&
          r.performance.countMs < 3000 &&
          r.performance.selectMs < 1500
        );

        const tablasLentas = resultados.filter(r =>
          !r.performance.error &&
          (r.performance.countMs >= 3000 || r.performance.selectMs >= 1500)
        );

        const tablasConError = resultados.filter(r => r.performance.error);

        if (tablasRapidas.length > 0) {
          console.log('🚀 TABLAS RÁPIDAS (Recomendadas):');
          tablasRapidas.forEach(t => {
            console.log(`\n  ✅ ${t.nombre}`);
            console.log(`     Performance: COUNT ${t.performance.countMs}ms, SELECT ${t.performance.selectMs}ms`);
            console.log(`     Campos clave: ${t.camposImportantes.join(', ')}`);
          });
          console.log('');
        }

        if (tablasLentas.length > 0) {
          console.log('\n⚠️  TABLAS LENTAS (No recomendadas):');
          tablasLentas.forEach(t => {
            console.log(`  - ${t.nombre} (COUNT: ${t.performance.countMs}ms)`);
          });
        }

        if (tablasConError.length > 0) {
          console.log('\n❌ TABLAS SIN CAMPO FECHA:');
          tablasConError.forEach(t => {
            console.log(`  - ${t.nombre}`);
          });
        }

        // Recomendación final
        console.log('\n' + '═'.repeat(70));
        console.log('\n💡 PRÓXIMOS PASOS:\n');

        if (tablasRapidas.length > 0) {
          console.log('✅ Encontramos tablas base rápidas!');
          console.log('1. Usar tablas rápidas con JOINs simples');
          console.log('2. Modificar ventasController.js para consultar tablas base');
          console.log('3. Implementar cache Redis (TTL 5 min)');
          console.log('4. NO necesitamos ETL a Supabase\n');
        } else {
          console.log('❌ Todas las tablas son lentas');
          console.log('1. IMPLEMENTAR ETL a Supabase (obligatorio)');
          console.log('2. Crear tabla cache: embler.fact_ventas_cache');
          console.log('3. Job de sincronización cada hora');
          console.log('4. API Gateway consulta Supabase\n');
        }

        // Guardar resultados
        const fs = require('fs');
        fs.writeFileSync(
          'buscar-tablas-output.json',
          JSON.stringify({ tablasRapidas, tablasLentas, tablasConError }, null, 2),
          'utf8'
        );

        console.log('📝 Resultados guardados en: buscar-tablas-output.json\n');
        console.log('═'.repeat(70));
        console.log('');

        db.detach();
        resolve();

      } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        db.detach();
        reject(error);
      }
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
