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

        const sql = `SELECT FIRST 10 NOMBRE, NATURALEZA, TIPO FROM CONCEPTOS_IN`;

        db.query(sql, (err, res) => {
            if (err) console.error(err);
            else {
                console.log('--- CONCEPTOS_IN VALUES ---');
                res.forEach(r => console.log(r));
            }

            db.detach();
        });
    });
}

main();
