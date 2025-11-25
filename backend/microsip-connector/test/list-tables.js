require('dotenv').config();
const firebird = require('../src/firebird');

console.log('📋 Listando TODAS las tablas de Microsip...\n');

const sql = `
  SELECT
    RDB$RELATION_NAME as TABLE_NAME
  FROM RDB$RELATIONS
  WHERE RDB$SYSTEM_FLAG = 0
  AND RDB$VIEW_BLR IS NULL
  ORDER BY RDB$RELATION_NAME
`;

firebird.query(sql, (err, result) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  console.log(`✅ Encontradas ${result.length} tablas de usuario:\n`);

  result.forEach((row, i) => {
    const tableName = row.TABLE_NAME.trim();
    console.log(`${(i + 1).toString().padStart(3)}. ${tableName}`);
  });

  console.log(`\n💡 Busca tablas como:`);
  console.log(`   - Productos, Articulos, Items`);
  console.log(`   - Clientes, Customers`);
  console.log(`   - Ventas, Sales, Facturas`);
  console.log(`   - Inventario, Stock`);

  process.exit(0);
});
