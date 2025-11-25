require('dotenv').config();
const etl = require('./src/services/etlService');
const fs = require('fs');

async function debug() {
    try {
        console.log('Debugging syncCategorias...');
        await etl.syncCategorias();
        console.log('Success!');
        fs.writeFileSync('debug-output.txt', 'Success!');
    } catch (error) {
        console.error('Error:', error);
        const errorLog = `Error Message: ${error.message}\nStack: ${error.stack}\nDetails: ${JSON.stringify(error, null, 2)}`;
        fs.writeFileSync('debug-output.txt', errorLog);
    }
}

debug();
