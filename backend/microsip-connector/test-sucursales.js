require('dotenv').config();
const firebird = require('./src/firebird');

async function testSucursales() {
    try {
        console.log('Testing SUCURSALES table structure...\n');

        const sql = `
      SELECT FIRST 1 *
      FROM SUCURSALES
    `;

        const result = await firebird.queryAsync(sql);
        console.log('Columns:', Object.keys(result[0]));
        console.log('\nSample row:', JSON.stringify(result[0], null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testSucursales();
