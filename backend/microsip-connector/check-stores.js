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

        // 1. Check SUCURSALES
        db.query('SELECT SUCURSAL_ID, NOMBRE FROM SUCURSALES', (err, stores) => {
            if (err) console.error(err);
            else {
                console.log('--- SUCURSALES ---');
                stores.forEach(s => console.log(`${s.SUCURSAL_ID}: ${s.NOMBRE}`));
            }

            // 2. Check SOL_REPORTE_EXIST count (approx)
            const today = new Date().toISOString().split('T')[0];
            console.log(`\nQuerying SOL_REPORTE_EXIST for ${today}...`);

            db.query(`SELECT COUNT(*) as CNT FROM SOL_REPORTE_EXIST('${today}')`, (err, res) => {
                if (err) console.error(err);
                else console.log(`Total records in SOL_REPORTE_EXIST: ${res[0].CNT}`);

                db.detach();
            });
        });
    });
}

main();
