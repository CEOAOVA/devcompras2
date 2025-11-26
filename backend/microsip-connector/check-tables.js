const Firebird = require('node-firebird');
require('dotenv').config();

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

const tablesToCheck = [
    'DOCTOS_IN',
    'DOCTOS_IN_DET',
    'EXISTENCIAS',
    'EXIST_DEPOSITO',
    'PRECIOS_ART',
    'PRECIOS_EMPRESA',
    'ARTICULOS',
    'DOCTOS_PV',
    'DOCTOS_PV_DET'
];

function executeQuery(db, sql) {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

async function checkTable(db, tableName) {
    try {
        // Check if table exists
        const checkSql = `
      SELECT COUNT(*) as CNT 
      FROM RDB$RELATIONS 
      WHERE RDB$RELATION_NAME = '${tableName}'
    `;
        const existsResult = await executeQuery(db, checkSql);
        const exists = existsResult[0].CNT > 0;

        if (!exists) {
            return { name: tableName, exists: false, count: 0, error: 'Table not found' };
        }

        // Count records
        const countSql = `SELECT COUNT(*) as TOTAL FROM ${tableName}`;
        const countResult = await executeQuery(db, countSql);
        return { name: tableName, exists: true, count: countResult[0].TOTAL, error: null };

    } catch (error) {
        return { name: tableName, exists: true, count: 0, error: error.message };
    }
}

async function main() {
    console.log('Connecting to Firebird...');

    Firebird.attach(options, async (err, db) => {
        if (err) {
            console.error('Connection error:', err);
            process.exit(1);
        }

        console.log('Connected. Checking tables...\n');
        console.log('Table Name'.padEnd(20) + ' | ' + 'Exists'.padEnd(10) + ' | ' + 'Records'.padEnd(15) + ' | ' + 'Status');
        console.log('-'.repeat(70));

        for (const table of tablesToCheck) {
            const result = await checkTable(db, table);
            const existsStr = result.exists ? 'YES' : 'NO';
            const countStr = result.count.toLocaleString();
            const statusStr = result.error ? `Error: ${result.error}` : 'OK';

            console.log(
                result.name.padEnd(20) + ' | ' +
                existsStr.padEnd(10) + ' | ' +
                countStr.padEnd(15) + ' | ' +
                statusStr
            );
        }

        db.detach();
        process.exit(0);
    });
}

main();
