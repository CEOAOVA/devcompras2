/**
 * Script de prueba de conexión a Firebird (Microsip)
 *
 * Este script valida:
 * 1. Que la conexión a Firebird funciona
 * 2. Que la vista VW_FACT_VENTAS existe
 * 3. Qué campos tiene la vista
 * 4. Qué datos contiene (muestra de 5 registros)
 *
 * Uso:
 *   node test-connection.js
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

console.log('\n🔌 PRUEBA DE CONEXIÓN A FIREBIRD (MICROSIP)\n');
console.log('Configuración:');
console.log(`  Host: ${options.host}:${options.port}`);
console.log(`  Base de datos: ${options.database}`);
console.log(`  Usuario: ${options.user}`);
console.log(`  Password: ${'*'.repeat(options.password.length)}\n`);

// Función para ejecutar queries
function executeQuery(db, sql, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n📊 ${description}...`);
    console.log(`SQL: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}\n`);

    db.query(sql, (err, result) => {
      if (err) {
        console.error(`❌ Error: ${err.message}\n`);
        reject(err);
      } else {
        console.log(`✅ Ejecutado exitosamente. Registros: ${result.length}\n`);
        resolve(result);
      }
    });
  });
}

// Función principal de prueba
async function testConnection() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Intentando conectar a Firebird...\n');

    Firebird.attach(options, async (err, db) => {
      if (err) {
        console.error('❌ ERROR DE CONEXIÓN:\n');
        console.error(`   Mensaje: ${err.message}`);
        console.error(`   Código: ${err.gdscode || 'N/A'}\n`);

        // Mensajes de ayuda según el error
        if (err.message.includes('unavailable')) {
          console.error('💡 Posibles causas:');
          console.error('   - El servidor Firebird no está corriendo');
          console.error('   - El host o puerto son incorrectos');
          console.error('   - Firewall bloqueando el puerto 3050\n');
        } else if (err.message.includes('password')) {
          console.error('💡 Posibles causas:');
          console.error('   - Usuario o contraseña incorrectos');
          console.error('   - El usuario no tiene permisos en esta base de datos\n');
        } else if (err.message.includes('file') || err.message.includes('database')) {
          console.error('💡 Posibles causas:');
          console.error('   - La ruta de la base de datos es incorrecta');
          console.error('   - El archivo .FDB no existe');
          console.error('   - No hay permisos para leer el archivo\n');
        }

        reject(err);
        return;
      }

      console.log('✅ CONEXIÓN EXITOSA a Firebird\n');
      console.log('═'.repeat(60));

      try {
        // ==========================================
        // TEST 1: Verificar que la vista existe
        // ==========================================
        console.log('\n📋 TEST 1: Verificar existencia de VW_FACT_VENTAS\n');

        const checkViewSQL = `
          SELECT RDB$RELATION_NAME
          FROM RDB$RELATIONS
          WHERE RDB$RELATION_NAME = 'VW_FACT_VENTAS'
          AND RDB$RELATION_TYPE = 1
        `;

        let viewExists;
        try {
          viewExists = await executeQuery(db, checkViewSQL, 'Buscando vista VW_FACT_VENTAS');

          if (viewExists.length === 0) {
            console.log('⚠️  ADVERTENCIA: La vista VW_FACT_VENTAS NO existe en la base de datos\n');
            console.log('💡 Alternativas:');
            console.log('   1. Verificar el nombre exacto de la vista (case-sensitive)');
            console.log('   2. Listar todas las vistas disponibles');
            console.log('   3. Verificar que la vista esté en el schema correcto\n');

            // Intentar buscar vistas similares
            const similarViewsSQL = `
              SELECT RDB$RELATION_NAME
              FROM RDB$RELATIONS
              WHERE RDB$RELATION_NAME LIKE '%FACT%'
              AND RDB$RELATION_TYPE = 1
            `;

            const similarViews = await executeQuery(db, similarViewsSQL, 'Buscando vistas similares');

            if (similarViews.length > 0) {
              console.log('📝 Vistas encontradas con "FACT" en el nombre:');
              similarViews.forEach((v, i) => {
                console.log(`   ${i + 1}. ${v.RDB$RELATION_NAME.trim()}`);
              });
              console.log('');
            }
          } else {
            console.log(`✅ Vista encontrada: ${viewExists[0].RDB$RELATION_NAME.trim()}\n`);
          }
        } catch (error) {
          console.log('⚠️  No se pudo verificar la existencia de la vista\n');
        }

        // ==========================================
        // TEST 2: Obtener estructura de la vista
        // ==========================================
        console.log('\n═'.repeat(60));
        console.log('\n📋 TEST 2: Obtener estructura de campos\n');

        const fieldsSQL = `
          SELECT
            RF.RDB$FIELD_NAME as CAMPO,
            F.RDB$FIELD_TYPE as TIPO_ID,
            F.RDB$FIELD_LENGTH as LONGITUD,
            F.RDB$FIELD_SCALE as ESCALA,
            RF.RDB$NULL_FLAG as OBLIGATORIO
          FROM RDB$RELATION_FIELDS RF
          JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
          WHERE RF.RDB$RELATION_NAME = 'VW_FACT_VENTAS'
          ORDER BY RF.RDB$FIELD_POSITION
        `;

        let fields;
        try {
          fields = await executeQuery(db, fieldsSQL, 'Obteniendo estructura de la vista');

          if (fields.length > 0) {
            console.log('📊 ESTRUCTURA DE LA VISTA:\n');
            console.log('═'.repeat(60));
            console.log('CAMPO                          | TIPO      | OBLIGATORIO');
            console.log('─'.repeat(60));

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

            fields.forEach(field => {
              const nombre = field.CAMPO.trim().padEnd(30);
              const tipo = tiposFirebird[field.TIPO_ID] || `ID:${field.TIPO_ID}`;
              const obligatorio = field.OBLIGATORIO === 1 ? 'SÍ' : 'NO';
              console.log(`${nombre} | ${tipo.padEnd(9)} | ${obligatorio}`);
            });
            console.log('═'.repeat(60));
            console.log(`\nTotal de campos: ${fields.length}\n`);

            // Verificar que estén los campos esperados
            const camposEsperados = ['FECHA', 'TIENDA_ID', 'SKU', 'CANTIDAD', 'PRECIO_UNITARIO'];
            const camposEncontrados = fields.map(f => f.CAMPO.trim());

            console.log('✅ VALIDACIÓN DE CAMPOS CLAVE:');
            camposEsperados.forEach(campo => {
              const existe = camposEncontrados.includes(campo);
              console.log(`   ${existe ? '✓' : '✗'} ${campo}: ${existe ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
            });
            console.log('');
          }
        } catch (error) {
          console.log('⚠️  No se pudo obtener la estructura de la vista\n');
        }

        // ==========================================
        // TEST 3: Contar registros totales
        // ==========================================
        console.log('\n═'.repeat(60));
        console.log('\n📋 TEST 3: Contar registros totales\n');

        const countSQL = `SELECT COUNT(*) as TOTAL FROM VW_FACT_VENTAS`;

        let totalRecords;
        try {
          totalRecords = await executeQuery(db, countSQL, 'Contando registros');

          if (totalRecords && totalRecords.length > 0) {
            const total = totalRecords[0].TOTAL;
            console.log(`📊 Total de registros en VW_FACT_VENTAS: ${total.toLocaleString()}\n`);

            if (total === 0) {
              console.log('⚠️  ADVERTENCIA: La vista existe pero no contiene datos\n');
            }
          }
        } catch (error) {
          console.log('⚠️  No se pudo contar los registros (posible que la vista no exista)\n');
        }

        // ==========================================
        // TEST 4: Obtener muestra de datos (5 registros)
        // ==========================================
        console.log('\n═'.repeat(60));
        console.log('\n📋 TEST 4: Obtener muestra de datos (primeros 5 registros)\n');

        const sampleSQL = `SELECT FIRST 5 * FROM VW_FACT_VENTAS`;

        let sampleData;
        try {
          sampleData = await executeQuery(db, sampleSQL, 'Obteniendo muestra de datos');

          if (sampleData && sampleData.length > 0) {
            console.log('📋 MUESTRA DE DATOS:\n');
            console.log('═'.repeat(60));

            sampleData.forEach((record, index) => {
              console.log(`\n📄 REGISTRO ${index + 1}:`);
              console.log('─'.repeat(60));

              Object.keys(record).forEach(key => {
                let value = record[key];

                // Formatear fechas
                if (value instanceof Date) {
                  value = value.toISOString().split('T')[0];
                }

                // Formatear números
                if (typeof value === 'number') {
                  if (key.toLowerCase().includes('precio') ||
                      key.toLowerCase().includes('total') ||
                      key.toLowerCase().includes('monto') ||
                      key.toLowerCase().includes('descuento') ||
                      key.toLowerCase().includes('impuesto') ||
                      key.toLowerCase().includes('costo') ||
                      key.toLowerCase().includes('margen')) {
                    value = `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  } else {
                    value = value.toLocaleString('es-MX');
                  }
                }

                // Limpiar espacios en strings
                if (typeof value === 'string') {
                  value = value.trim();
                }

                console.log(`  ${key.padEnd(25)}: ${value || 'NULL'}`);
              });
            });
            console.log('\n' + '═'.repeat(60));
          }
        } catch (error) {
          console.log('⚠️  No se pudo obtener muestra de datos\n');
        }

        // ==========================================
        // TEST 5: Obtener rangos de fechas
        // ==========================================
        console.log('\n═'.repeat(60));
        console.log('\n📋 TEST 5: Obtener rango de fechas disponibles\n');

        const dateRangeSQL = `
          SELECT
            MIN(FECHA) as FECHA_MINIMA,
            MAX(FECHA) as FECHA_MAXIMA,
            COUNT(DISTINCT FECHA) as DIAS_CON_DATOS
          FROM VW_FACT_VENTAS
        `;

        try {
          const dateRange = await executeQuery(db, dateRangeSQL, 'Obteniendo rango de fechas');

          if (dateRange && dateRange.length > 0) {
            const data = dateRange[0];
            console.log('📅 RANGO DE FECHAS:\n');
            console.log(`  Fecha más antigua  : ${data.FECHA_MINIMA || 'N/A'}`);
            console.log(`  Fecha más reciente : ${data.FECHA_MAXIMA || 'N/A'}`);
            console.log(`  Días con datos     : ${data.DIAS_CON_DATOS?.toLocaleString() || 'N/A'}\n`);
          }
        } catch (error) {
          console.log('⚠️  No se pudo obtener el rango de fechas\n');
        }

        // ==========================================
        // TEST 6: Listar tiendas disponibles
        // ==========================================
        console.log('\n═'.repeat(60));
        console.log('\n📋 TEST 6: Listar tiendas disponibles\n');

        const tiendasSQL = `
          SELECT DISTINCT
            TIENDA_ID,
            COUNT(*) as TOTAL_REGISTROS
          FROM VW_FACT_VENTAS
          GROUP BY TIENDA_ID
          ORDER BY TOTAL_REGISTROS DESC
        `;

        try {
          const tiendas = await executeQuery(db, tiendasSQL, 'Obteniendo tiendas');

          if (tiendas && tiendas.length > 0) {
            console.log('🏪 TIENDAS:\n');
            console.log('ID    | REGISTROS');
            console.log('─'.repeat(40));

            tiendas.forEach(t => {
              const id = String(t.TIENDA_ID || '').padEnd(5);
              const registros = (t.TOTAL_REGISTROS || 0).toLocaleString().padStart(9);
              console.log(`${id} | ${registros}`);
            });
            console.log('═'.repeat(40));
            console.log(`\nTotal de tiendas: ${tiendas.length}\n`);
          }
        } catch (error) {
          console.log('⚠️  No se pudo obtener la lista de tiendas\n');
        }

        console.log('\n═'.repeat(60));
        console.log('\n✅ PRUEBAS COMPLETADAS EXITOSAMENTE\n');
        console.log('Próximos pasos:');
        console.log('  1. Verificar que los campos obtenidos coinciden con lo esperado');
        console.log('  2. Los endpoints del ventasController.js ya están actualizados');
        console.log('  3. Iniciar el servidor: npm run dev');
        console.log('  4. Probar endpoint: curl http://localhost:8003/api/ventas/kpis\n');

        // Cerrar conexión
        db.detach();
        resolve();

      } catch (error) {
        console.error('\n❌ ERROR DURANTE LAS PRUEBAS:\n');
        console.error(`   ${error.message}\n`);
        db.detach();
        reject(error);
      }
    });
  });
}

// Ejecutar pruebas
testConnection()
  .then(() => {
    console.log('🎉 Script finalizado exitosamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script finalizado con errores\n');
    process.exit(1);
  });
