require('dotenv').config();
const firebird = require('../src/firebird');

console.log('🧪 Probando conexión a Firebird...\n');

firebird.testConnection((err, success) => {
  if (err) {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
  }

  if (success) {
    console.log('✅ Conexión exitosa a Firebird Microsip!');

    // Probar query simple
    firebird.query('SELECT FIRST 5 * FROM RDB$RELATIONS', (err, result) => {
      if (err) {
        console.error('❌ Error en query:', err);
      } else {
        console.log('\n📋 Primeras 5 tablas del sistema:');
        result.forEach((row, i) => {
          console.log(`  ${i + 1}. ${row.RDB$RELATION_NAME.trim()}`);
        });
      }
      process.exit(0);
    });
  }
});
