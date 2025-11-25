/**
 * Script RÁPIDO para listar vistas y tablas (sin contar registros)
 *
 * Uso:
 *   node list-all-tables-fast.js
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

console.log('\n🔍 BÚSQUEDA RÁPIDA DE TABLAS Y VISTAS - MICROSIP\n');
console.log(`Host: ${options.host}:${options.port}\n`);

// Mapeo de tipos Firebird
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

async function getSample(db, tableName) {
  const sql = `SELECT FIRST 2 * FROM ${tableName}`;
  try {
    return await executeQuery(db, sql);
  } catch {
    return [];
  }
}

async function main() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Conectando...\n');

    Firebird.attach(options, async (err, db) => {
      if (err) {
        console.error('❌ ERROR:', err.message);
        reject(err);
        return;
      }

      console.log('✅ CONECTADO\n');
      console.log('═'.repeat(80));

      try {
        // BUSCAR VISTAS
        console.log('\n📋 VISTAS:\n');

        const viewsSQL = `
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

        const views = await executeQuery(db, viewsSQL);
        console.log(`Encontradas: ${views.length} vistas\n`);

        for (let i = 0; i < views.length; i++) {
          const viewName = views[i].NOMBRE.trim();
          console.log('─'.repeat(80));
          console.log(`\n📊 VISTA ${i + 1}/${views.length}: ${viewName}\n`);

          // Campos
          const fields = await getFields(db, viewName);
          if (fields.length > 0) {
            console.log(`📋 Campos (${fields.length}):`);
            fields.forEach(f => {
              const nombre = f.CAMPO.trim().padEnd(30);
              const tipo = tiposFirebird[f.TIPO_ID] || `ID:${f.TIPO_ID}`;
              console.log(`  ${nombre} | ${tipo}`);
            });
          }

          // Muestra
          console.log('\n📄 MUESTRA (2 registros):');
          const sample = await getSample(db, viewName);

          if (sample.length > 0) {
            sample.forEach((rec, idx) => {
              console.log(`\n  📌 Registro ${idx + 1}:`);
              Object.keys(rec).forEach(key => {
                let value = rec[key];
                if (value instanceof Date) value = value.toISOString().split('T')[0];
                if (typeof value === 'string') value = value.trim();
                if (typeof value === 'number') value = value.toLocaleString('es-MX');
                console.log(`    ${key.padEnd(25)}: ${value || 'NULL'}`);
              });
            });
          } else {
            console.log('  (Sin datos)');
          }

          console.log('\n');
        }

        // BUSCAR TABLAS
        console.log('\n═'.repeat(80));
        console.log('\n📋 TABLAS:\n');

        const tablesSQL = `
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

        const tables = await executeQuery(db, tablesSQL);
        console.log(`Encontradas: ${tables.length} tablas\n`);

        for (let i = 0; i < tables.length; i++) {
          const tableName = tables[i].NOMBRE.trim();
          console.log('─'.repeat(80));
          console.log(`\n🗂️  TABLA ${i + 1}/${tables.length}: ${tableName}\n`);

          // Campos
          const fields = await getFields(db, tableName);
          if (fields.length > 0) {
            console.log(`📋 Campos (${fields.length}):`);
            fields.forEach(f => {
              const nombre = f.CAMPO.trim().padEnd(30);
              const tipo = tiposFirebird[f.TIPO_ID] || `ID:${f.TIPO_ID}`;
              console.log(`  ${nombre} | ${tipo}`);
            });
          }

          // Muestra
          console.log('\n📄 MUESTRA (2 registros):');
          const sample = await getSample(db, tableName);

          if (sample.length > 0) {
            sample.forEach((rec, idx) => {
              console.log(`\n  📌 Registro ${idx + 1}:`);
              Object.keys(rec).forEach(key => {
                let value = rec[key];
                if (value instanceof Date) value = value.toISOString().split('T')[0];
                if (typeof value === 'string') value = value.trim();
                if (typeof value === 'number') value = value.toLocaleString('es-MX');
                console.log(`    ${key.padEnd(25)}: ${value || 'NULL'}`);
              });
            });
          } else {
            console.log('  (Sin datos)');
          }

          console.log('\n');
        }

        // RESUMEN
        console.log('\n═'.repeat(80));
        console.log('\n📊 RESUMEN:\n');
        console.log(`✅ Total vistas: ${views.length}`);
        console.log(`✅ Total tablas: ${tables.length}\n`);

        if (views.length > 0) {
          console.log('📋 Vistas encontradas:');
          views.forEach((v, i) => console.log(`  ${i + 1}. ${v.NOMBRE.trim()}`));
        }

        if (tables.length > 0) {
          console.log('\n🗂️  Tablas encontradas:');
          tables.forEach((t, i) => console.log(`  ${i + 1}. ${t.NOMBRE.trim()}`));
        }

        console.log('\n═'.repeat(80));
        console.log('\n✅ BÚSQUEDA COMPLETADA\n');

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
