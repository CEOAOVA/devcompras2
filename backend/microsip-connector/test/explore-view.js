require('dotenv').config();
const firebird = require('../src/firebird');

// Vista a explorar (cambiar según necesidad)
const VIEW_NAME = process.argv[2] || 'Vw_ventas_2025';
const LIMIT = process.argv[3] || 5;

console.log(`\n👁️  Explorando vista: ${VIEW_NAME}\n`);
console.log('='.repeat(80));

// Paso 1: Obtener estructura de la vista (columnas)
const sqlColumns = `
  SELECT
    RF.RDB$FIELD_NAME AS COLUMN_NAME,
    F.RDB$FIELD_TYPE AS FIELD_TYPE,
    F.RDB$FIELD_LENGTH AS FIELD_LENGTH
  FROM RDB$RELATION_FIELDS RF
  JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
  WHERE RF.RDB$RELATION_NAME = '${VIEW_NAME.toUpperCase()}'
  ORDER BY RF.RDB$FIELD_POSITION
`;

firebird.query(sqlColumns, (err, columns) => {
  if (err) {
    console.error('❌ Error obteniendo estructura:', err.message);
    console.log('\n💡 Verifica que la vista exista. Ejecuta:');
    console.log('   node test/list-views.js');
    process.exit(1);
  }

  if (columns.length === 0) {
    console.error(`❌ Vista "${VIEW_NAME}" no encontrada o está vacía`);
    console.log('\n💡 Verifica el nombre. Ejecuta:');
    console.log('   node test/list-views.js');
    process.exit(1);
  }

  console.log(`\n📋 Estructura de ${VIEW_NAME}:`);
  console.log(`   Total de columnas: ${columns.length}\n`);

  const columnNames = [];
  columns.forEach((col, i) => {
    const name = col.COLUMN_NAME.trim();
    columnNames.push(name);

    // Mapeo de tipos de Firebird
    let type = 'UNKNOWN';
    switch(col.FIELD_TYPE) {
      case 7: type = 'SMALLINT'; break;
      case 8: type = 'INTEGER'; break;
      case 10: type = 'FLOAT'; break;
      case 12: type = 'DATE'; break;
      case 13: type = 'TIME'; break;
      case 14: type = 'CHAR'; break;
      case 16: type = 'BIGINT'; break;
      case 27: type = 'DOUBLE'; break;
      case 35: type = 'TIMESTAMP'; break;
      case 37: type = 'VARCHAR'; break;
      case 261: type = 'BLOB'; break;
      default: type = `TYPE_${col.FIELD_TYPE}`;
    }

    console.log(`   ${(i + 1).toString().padStart(3)}. ${name.padEnd(30)} ${type}`);
  });

  // Paso 2: Obtener datos de ejemplo
  console.log(`\n${'='.repeat(80)}`);
  console.log(`\n📊 Primeros ${LIMIT} registros:\n`);

  const sqlData = `SELECT FIRST ${LIMIT} * FROM ${VIEW_NAME}`;

  firebird.query(sqlData, (err, rows) => {
    if (err) {
      console.error('❌ Error obteniendo datos:', err.message);
      process.exit(1);
    }

    if (rows.length === 0) {
      console.log('⚠️  La vista está vacía (sin registros)');
      process.exit(0);
    }

    rows.forEach((row, index) => {
      console.log(`\n--- Registro ${index + 1} ---`);

      Object.keys(row).forEach(key => {
        let value = row[key];

        // Formatear valor según tipo
        if (value === null) {
          value = 'NULL';
        } else if (typeof value === 'string') {
          value = value.trim();
          if (value.length > 50) {
            value = value.substring(0, 50) + '...';
          }
          value = `"${value}"`;
        } else if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        } else if (typeof value === 'number') {
          value = value.toString();
        }

        console.log(`  ${key.padEnd(30)}: ${value}`);
      });
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log(`\n✅ Exploración completada`);
    console.log(`   Vista: ${VIEW_NAME}`);
    console.log(`   Columnas: ${columns.length}`);
    console.log(`   Registros mostrados: ${rows.length}`);

    console.log(`\n💡 SQL equivalente:`);
    console.log(`   SELECT * FROM ${VIEW_NAME}`);
    console.log(`   WHERE ... -- tus filtros`);
    console.log(`   ORDER BY ... -- tu orden`);
    console.log(`   FIRST 100 -- límite`);

    console.log(`\n💡 Para explorar otra vista:`);
    console.log(`   node test/explore-view.js NOMBRE_VISTA [limite]`);

    process.exit(0);
  });
});
