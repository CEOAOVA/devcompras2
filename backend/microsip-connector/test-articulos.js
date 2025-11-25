require('dotenv').config();
const firebird = require('./src/firebird');

async function testArticulos() {
    try {
        console.log('Testing ARTICULOS table structure...\n');

        const sql = `
      SELECT FIRST 1 *
      FROM ARTICULOS
    `;

        const result = await firebird.queryAsync(sql);
        console.log('Available columns:');
        Object.keys(result[0]).forEach(col => console.log('-', col));
        console.log('\nSample data:', JSON.stringify(result[0], null, 2).substring(0, 500));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testArticulos();
