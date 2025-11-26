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

async function getFields(db, tableName) {
    const sql = `
    SELECT RF.RDB$FIELD_NAME as CAMPO
    FROM RDB$RELATION_FIELDS RF
    WHERE RF.RDB$RELATION_NAME = '${tableName}'
    ORDER BY RF.RDB$FIELD_POSITION
  `;
    return new Promise((resolve, reject) => {
        db.query(sql, (err, result) => {
            if (err) resolve([]);
            else resolve(result.map(r => r.CAMPO.trim()));
        });
    });
}

async function main() {
    Firebird.attach(options, async (err, db) => {
        if (err) {
            console.error(err);
            process.exit(1);
        }

        // Check CONCEPTOS_IN columns
        console.log('--- CONCEPTOS_IN COLUMNS ---');
        const concCols = await getFields(db, 'CONCEPTOS_IN');
        console.log(concCols.join(', '));

        // Check DOCTOS_PV_DET columns
        console.log('--- DOCTOS_PV_DET COLUMNS ---');
        const cols = await getFields(db, 'DOCTOS_PV_DET');
        console.log(cols.join(', '));

        db.detach();
    });
}

main();
