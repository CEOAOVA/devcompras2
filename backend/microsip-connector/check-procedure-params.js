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

async function getParams(db, procName) {
    const sql = `
    SELECT RDB$PARAMETER_NAME as PARAM, RDB$PARAMETER_TYPE as TYPE
    FROM RDB$PROCEDURE_PARAMETERS
    WHERE RDB$PROCEDURE_NAME = '${procName}'
    ORDER BY RDB$PARAMETER_NUMBER
  `;
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) resolve([]);
            else resolve(result.map(r => `${r.PARAM.trim()} (${r.TYPE === 0 ? 'IN' : 'OUT'})`));
        });
    });
}

async function main() {
    Firebird.attach(options, async (err, db) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        console.log('--- SOL_EXIS_VALOR_INV ---');
        const p1 = await getParams(db, 'SOL_EXIS_VALOR_INV');
        console.log(p1.join(', '));

        console.log('\n--- SOL_REPORTE_EXIST ---');
        const p2 = await getParams(db, 'SOL_REPORTE_EXIST');
        console.log(p2.join(', '));

        db.detach();
    });
}

main();
