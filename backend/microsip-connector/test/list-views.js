require('dotenv').config();
const firebird = require('../src/firebird');

console.log('👁️  Listando TODAS las vistas de Microsip...\n');

const sql = `
  SELECT
    RDB$RELATION_NAME as VIEW_NAME
  FROM RDB$RELATIONS
  WHERE RDB$SYSTEM_FLAG = 0
  AND RDB$VIEW_BLR IS NOT NULL
  ORDER BY RDB$RELATION_NAME
`;

firebird.query(sql, (err, result) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  console.log(`✅ Encontradas ${result.length} vistas de usuario:\n`);

  // Agrupar por prefijo
  const ventas = [];
  const articulos = [];
  const clientes = [];
  const otras = [];

  result.forEach((row) => {
    const viewName = row.VIEW_NAME.trim();

    if (viewName.toLowerCase().includes('venta') || viewName.toLowerCase().includes('vw_ventas')) {
      ventas.push(viewName);
    } else if (viewName.toLowerCase().includes('articulo') || viewName.toLowerCase().includes('producto')) {
      articulos.push(viewName);
    } else if (viewName.toLowerCase().includes('cliente')) {
      clientes.push(viewName);
    } else {
      otras.push(viewName);
    }
  });

  if (ventas.length > 0) {
    console.log('📊 VISTAS DE VENTAS:');
    ventas.forEach((v, i) => console.log(`   ${(i + 1).toString().padStart(3)}. ${v}`));
    console.log('');
  }

  if (articulos.length > 0) {
    console.log('📦 VISTAS DE ARTÍCULOS/PRODUCTOS:');
    articulos.forEach((v, i) => console.log(`   ${(i + 1).toString().padStart(3)}. ${v}`));
    console.log('');
  }

  if (clientes.length > 0) {
    console.log('👥 VISTAS DE CLIENTES:');
    clientes.forEach((v, i) => console.log(`   ${(i + 1).toString().padStart(3)}. ${v}`));
    console.log('');
  }

  if (otras.length > 0) {
    console.log('📋 OTRAS VISTAS:');
    otras.forEach((v, i) => console.log(`   ${(i + 1).toString().padStart(3)}. ${v}`));
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`\n💡 Total: ${result.length} vistas`);
  console.log(`   Ventas: ${ventas.length}`);
  console.log(`   Artículos: ${articulos.length}`);
  console.log(`   Clientes: ${clientes.length}`);
  console.log(`   Otras: ${otras.length}`);

  console.log(`\n🔍 Para explorar una vista:`);
  console.log(`   node test/explore-view.js NOMBRE_VISTA [limite]`);
  console.log(`\n   Ejemplo:`);
  console.log(`   node test/explore-view.js Vw_ventas_2025 5`);

  process.exit(0);
});
