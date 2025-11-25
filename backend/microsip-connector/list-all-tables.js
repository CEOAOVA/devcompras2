/**
 * Script para listar TODAS las vistas y tablas relacionadas con ventas en Firebird (Microsip)
 *
 * Este script busca:
 * 1. Todas las vistas con nombres relacionados a ventas/movimientos
 * 2. Todas las tablas con nombres relacionados a ventas/movimientos
 * 3. La estructura completa de cada una (campos y tipos)
 * 4. Muestra de datos para identificar la correcta
 *
 * Uso:
 *   node list-all-tables.js
 */

require('dotenv').config();
const Firebird = require('node-firebird');

// Configuración de conexión desde .env
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

console.log('\n🔍 BÚSQUEDA COMPLETA DE TABLAS Y VISTAS - MICROSIP FIREBIRD\n');
console.log('Configuración:');
console.log(`  Host: ${options.host}:${options.port}`);
console.log(`  Base de datos: ${options.database}`);
console.log(`  Usuario: ${options.user}\n`);

// Función para ejecutar queries
function executeQuery(db, sql, description) {
  return new Promise((resolve, reject) => {
    if (description) {
      console.log(`\n📊 ${description}...`);
    }

    db.query(sql, (err, result) => {
      if (err) {
        console.error(`❌ Error: ${err.message}`);
        reject(err);
      } else {
        if (description) {
          console.log(`✅ Encontrados: ${result.length} registros`);
        }
        resolve(result);
      }
    });
  });
}

// Mapeo de tipos de datos Firebird
const tiposFirebird = {
  7: 'SMALLINT',
  8: 'INTEGER',
  10: 'FLOAT',
  12: 'DATE',
  13: 'TIME',
  14: 'CHAR',
  16: 'BIGINT',
  27: 'DOUBLE',
  35: 'TIMESTAMP',
  37: 'VARCHAR',
  261: 'BLOB'
};

// Función para obtener estructura de una tabla/vista
async function getTableStructure(db, tableName) {
  const sql = `
    SELECT
      RF.RDB$FIELD_NAME as CAMPO,
      F.RDB$FIELD_TYPE as TIPO_ID,
      F.RDB$FIELD_LENGTH as LONGITUD,
      F.RDB$FIELD_SCALE as ESCALA,
      RF.RDB$NULL_FLAG as OBLIGATORIO
    FROM RDB$RELATION_FIELDS RF
    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
    WHERE RF.RDB$RELATION_NAME = '${tableName}'
    ORDER BY RF.RDB$FIELD_POSITION
  `;

  try {
    const fields = await executeQuery(db, sql, null);
    return fields;
  } catch (error) {
    return [];
  }
}

// Función para obtener muestra de datos
async function getSampleData(db, tableName) {
  const sql = `SELECT FIRST 3 * FROM ${tableName}`;

  try {
    const data = await executeQuery(db, sql, null);
    return data;
  } catch (error) {
    return [];
  }
}

// Función para contar registros
async function countRecords(db, tableName) {
  const sql = `SELECT COUNT(*) as TOTAL FROM ${tableName}`;

  try {
    const result = await executeQuery(db, sql, null);
    return result[0].TOTAL;
  } catch (error) {
    return 0;
  }
}

// Función principal
async function listAllTables() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Conectando a Firebird...\n');

    Firebird.attach(options, async (err, db) => {
      if (err) {
        console.error('❌ ERROR DE CONEXIÓN:');
        console.error(`   ${err.message}\n`);
        reject(err);
        return;
      }

      console.log('✅ CONEXIÓN EXITOSA\n');
      console.log('═'.repeat(80));

      try {
        // ==========================================
        // BÚSQUEDA 1: Todas las VISTAS relacionadas
        // ==========================================
        console.log('\n📋 BÚSQUEDA 1: VISTAS relacionadas con ventas/movimientos\n');

        const searchViewsSQL = `
          SELECT DISTINCT RDB$RELATION_NAME as NOMBRE
          FROM RDB$RELATIONS
          WHERE RDB$RELATION_TYPE = 1
          AND (
            RDB$RELATION_NAME LIKE '%VENTA%' OR
            RDB$RELATION_NAME LIKE '%MOVIMIENTO%' OR
            RDB$RELATION_NAME LIKE '%PARTIDA%' OR
            RDB$RELATION_NAME LIKE '%DETALLE%' OR
            RDB$RELATION_NAME LIKE '%VENTAS%' OR
            RDB$RELATION_NAME LIKE '%FACT%' OR
            RDB$RELATION_NAME LIKE '%INV%' OR
            RDB$RELATION_NAME LIKE '%VW_%'
          )
          ORDER BY RDB$RELATION_NAME
        `;

        const views = await executeQuery(db, searchViewsSQL, 'Buscando vistas');

        if (views.length > 0) {
          console.log('\n🔍 VISTAS ENCONTRADAS:\n');

          for (let i = 0; i < views.length; i++) {
            const viewName = views[i].NOMBRE.trim();
            console.log('\n' + '─'.repeat(80));
            console.log(`\n📊 VISTA ${i + 1}/${views.length}: ${viewName}`);
            console.log('─'.repeat(80));

            // Obtener estructura
            const fields = await getTableStructure(db, viewName);

            if (fields.length > 0) {
              console.log(`\n📋 Campos (${fields.length} total):`);
              console.log('─'.repeat(80));

              fields.forEach(field => {
                const nombre = field.CAMPO.trim().padEnd(30);
                const tipo = tiposFirebird[field.TIPO_ID] || `ID:${field.TIPO_ID}`;
                const obligatorio = field.OBLIGATORIO === 1 ? 'SÍ' : 'NO';
                console.log(`  ${nombre} | ${tipo.padEnd(10)} | Obligatorio: ${obligatorio}`);
              });
            }

            // Contar registros
            const total = await countRecords(db, viewName);
            console.log(`\n📊 Total de registros: ${total.toLocaleString()}`);

            // Muestra de datos (solo si tiene registros)
            if (total > 0) {
              console.log('\n📄 MUESTRA DE DATOS (primeros 3 registros):');
              const sample = await getSampleData(db, viewName);

              if (sample.length > 0) {
                sample.forEach((record, idx) => {
                  console.log(`\n  📌 Registro ${idx + 1}:`);
                  Object.keys(record).forEach(key => {
                    let value = record[key];

                    if (value instanceof Date) {
                      value = value.toISOString().split('T')[0];
                    }

                    if (typeof value === 'string') {
                      value = value.trim();
                    }

                    if (typeof value === 'number') {
                      value = value.toLocaleString('es-MX');
                    }

                    console.log(`    ${key.padEnd(25)}: ${value || 'NULL'}`);
                  });
                });
              }
            }

            console.log('\n');
          }
        }

        // ==========================================
        // BÚSQUEDA 2: Todas las TABLAS relacionadas
        // ==========================================
        console.log('\n═'.repeat(80));
        console.log('\n📋 BÚSQUEDA 2: TABLAS relacionadas con ventas/movimientos\n');

        const searchTablesSQL = `
          SELECT DISTINCT RDB$RELATION_NAME as NOMBRE
          FROM RDB$RELATIONS
          WHERE RDB$RELATION_TYPE = 0
          AND RDB$SYSTEM_FLAG = 0
          AND (
            RDB$RELATION_NAME LIKE '%VENTA%' OR
            RDB$RELATION_NAME LIKE '%MOVIMIENTO%' OR
            RDB$RELATION_NAME LIKE '%PARTIDA%' OR
            RDB$RELATION_NAME LIKE '%DETALLE%' OR
            RDB$RELATION_NAME LIKE '%VENTAS%' OR
            RDB$RELATION_NAME LIKE '%FACT%' OR
            RDB$RELATION_NAME LIKE '%INV%'
          )
          ORDER BY RDB$RELATION_NAME
        `;

        const tables = await executeQuery(db, searchTablesSQL, 'Buscando tablas');

        if (tables.length > 0) {
          console.log('\n🗂️  TABLAS ENCONTRADAS:\n');

          for (let i = 0; i < tables.length; i++) {
            const tableName = tables[i].NOMBRE.trim();
            console.log('\n' + '─'.repeat(80));
            console.log(`\n📊 TABLA ${i + 1}/${tables.length}: ${tableName}`);
            console.log('─'.repeat(80));

            // Obtener estructura
            const fields = await getTableStructure(db, tableName);

            if (fields.length > 0) {
              console.log(`\n📋 Campos (${fields.length} total):`);
              console.log('─'.repeat(80));

              fields.forEach(field => {
                const nombre = field.CAMPO.trim().padEnd(30);
                const tipo = tiposFirebird[field.TIPO_ID] || `ID:${field.TIPO_ID}`;
                const obligatorio = field.OBLIGATORIO === 1 ? 'SÍ' : 'NO';
                console.log(`  ${nombre} | ${tipo.padEnd(10)} | Obligatorio: ${obligatorio}`);
              });
            }

            // Contar registros
            const total = await countRecords(db, tableName);
            console.log(`\n📊 Total de registros: ${total.toLocaleString()}`);

            // Muestra de datos (solo si tiene registros)
            if (total > 0) {
              console.log('\n📄 MUESTRA DE DATOS (primeros 3 registros):');
              const sample = await getSampleData(db, tableName);

              if (sample.length > 0) {
                sample.forEach((record, idx) => {
                  console.log(`\n  📌 Registro ${idx + 1}:`);
                  Object.keys(record).forEach(key => {
                    let value = record[key];

                    if (value instanceof Date) {
                      value = value.toISOString().split('T')[0];
                    }

                    if (typeof value === 'string') {
                      value = value.trim();
                    }

                    if (typeof value === 'number') {
                      value = value.toLocaleString('es-MX');
                    }

                    console.log(`    ${key.padEnd(25)}: ${value || 'NULL'}`);
                  });
                });
              }
            }

            console.log('\n');
          }
        }

        // ==========================================
        // RESUMEN FINAL
        // ==========================================
        console.log('\n═'.repeat(80));
        console.log('\n📊 RESUMEN FINAL\n');
        console.log(`✅ Total de vistas encontradas: ${views.length}`);
        console.log(`✅ Total de tablas encontradas: ${tables.length}\n`);

        if (views.length > 0) {
          console.log('📋 Lista de vistas:');
          views.forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.NOMBRE.trim()}`);
          });
        }

        if (tables.length > 0) {
          console.log('\n🗂️  Lista de tablas:');
          tables.forEach((t, i) => {
            console.log(`  ${i + 1}. ${t.NOMBRE.trim()}`);
          });
        }

        console.log('\n═'.repeat(80));
        console.log('\n✅ BÚSQUEDA COMPLETADA\n');
        console.log('💡 PRÓXIMOS PASOS:');
        console.log('  1. Revisar las estructuras de cada vista/tabla');
        console.log('  2. Identificar cuál contiene información detallada de productos');
        console.log('  3. Buscar campos como: PRODUCTO, ARTICULO, CANTIDAD, PRECIO');
        console.log('  4. Actualizar ventasController.js con la vista/tabla correcta\n');

        // Cerrar conexión
        db.detach();
        resolve();

      } catch (error) {
        console.error('\n❌ ERROR DURANTE LA BÚSQUEDA:');
        console.error(`   ${error.message}\n`);
        db.detach();
        reject(error);
      }
    });
  });
}

// Ejecutar búsqueda
listAllTables()
  .then(() => {
    console.log('🎉 Script finalizado exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script finalizado con errores\n');
    process.exit(1);
  });
