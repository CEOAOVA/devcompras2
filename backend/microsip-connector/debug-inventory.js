require('dotenv').config();
const etl = require('./src/services/etlService');

async function run() {
  try {
    console.log('Starting inventory sync debug...');
    const result = await etl.syncInventarioActual();
    console.log('Result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
