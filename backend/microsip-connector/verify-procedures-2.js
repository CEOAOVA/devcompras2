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

        // 1. Check ALMACENES
        db.query('SELECT ALMACEN_ID, NOMBRE FROM ALMACENES', (err, warehouses) => {
            if (err) console.error(err);
            else {
                console.log('--- ALMACENES ---');
                warehouses.forEach(w => console.log(`${w.ALMACEN_ID}: ${w.NOMBRE}`));
            }

            // 2. Check SOL_EXIS_VALOR_INV count
            const today = new Date().toISOString().split('T')[0];
            console.log(`\nQuerying SOL_EXIS_VALOR_INV for ${today} with NULLs...`);

            // Params: V_ALMACEN_ID, V_GRUPO_LINEA_ID, V_LINEA_ARTICULO_ID, V_ARTICULO_ID, V_FECHA
            const sql = `SELECT COUNT(*) as CNT FROM SOL_EXIS_VALOR_INV(NULL, NULL, NULL, NULL, '${today}')`;

            db.query(sql, (err, res) => {
                if (err) console.error(err);
                else console.log(`Total records in SOL_EXIS_VALOR_INV: ${res[0].CNT}`);

                db.detach();
            });
        });
    });
}

main();
