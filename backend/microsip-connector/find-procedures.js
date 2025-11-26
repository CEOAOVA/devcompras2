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

        const sql = `
      SELECT RDB$PROCEDURE_NAME as NAME
      FROM RDB$PROCEDURES
      ORDER BY RDB$PROCEDURE_NAME
    `;

        db.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                db.detach();
                process.exit(1);
            }

            const procs = result.map(r => r.NAME.trim());

            console.log('--- MATCHING "EXIST" ---');
            procs.filter(t => t.includes('EXIST')).forEach(t => console.log(t));

            console.log('\n--- MATCHING "INV" ---');
            procs.filter(t => t.includes('INV')).forEach(t => console.log(t));

            console.log('\n--- MATCHING "STOCK" ---');
            procs.filter(t => t.includes('STOCK')).forEach(t => console.log(t));

            db.detach();
        });
    });
}

main();
