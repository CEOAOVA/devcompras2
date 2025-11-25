require('dotenv').config();
const firebird = require('./src/firebird');

async function testLineasArticulos() {
    try {
        console.log('Testing LINEAS_ARTICULOS table...\n');

        // Simple query without DESCRIPCION
        const sql = `
      SELECT FIRST 5
        LINEA_ARTICULO_ID,
        NOMBRE
      FROM LINEAS_ARTICULOS
      ORDER BY NOMBRE
    `;

        const result = await firebird.queryAsync(sql);
        console.log('Success! Found', result.length, 'categorías');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testLineasArticulos();
