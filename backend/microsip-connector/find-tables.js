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
      SELECT RDB$RELATION_NAME as NAME
      FROM RDB$RELATIONS
      WHERE RDB$SYSTEM_FLAG = 0 
      AND RDB$RELATION_TYPE = 0
      ORDER BY RDB$RELATION_NAME
    `;

        db.query(sql, (err, result) => {
            if (err) {
                console.error(err);
                db.detach();
                process.exit(1);
            }

            const tables = result.map(r => r.NAME.trim());

            console.log('--- ALL TABLES ---');
            tables.forEach(t => console.log(t));

            console.log('\n--- MATCHING "PRECIO" ---');
            tables.filter(t => t.includes('PRECIO')).forEach(t => console.log(t));

            console.log('\n--- MATCHING "EXIST" ---');
            tables.filter(t => t.includes('EXIST')).forEach(t => console.log(t));

            console.log('\n--- MATCHING "ART" ---');
            tables.filter(t => t.includes('ART')).forEach(t => console.log(t));

            console.log('\n--- MATCHING "LISTA" ---');
            tables.filter(t => t.includes('LISTA')).forEach(t => console.log(t));

            db.detach();
        });
    });
}

main();
