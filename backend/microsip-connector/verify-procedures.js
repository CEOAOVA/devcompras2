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

async function main() {
    Firebird.attach(options, (err, db) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        const today = new Date().toISOString().split('T')[0];
        console.log(`Querying SOL_REPORTE_EXIST for date: ${today}`);

        const sql = `SELECT FIRST 5 * FROM SOL_REPORTE_EXIST('${today}')`;

        db.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                db.detach();
                process.exit(1);
            }

            console.log('--- RESULT ---');
            result.forEach(r => {
                console.log(r);
            });

            db.detach();
        });
    });
}

main();
