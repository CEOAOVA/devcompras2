require('dotenv').config();
const Firebird = require('node-firebird');

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

async function getTableInfo(db, tableName) {
    return new Promise((resolve, reject) => {
        const sqlFields = `
      SELECT RDB$FIELD_NAME 
      FROM RDB$RELATION_FIELDS 
      WHERE RDB$RELATION_NAME = '${tableName}'
      ORDER BY RDB$FIELD_POSITION
    `;

        db.query(sqlFields, (err, fields) => {
            if (err) return reject(err);
            resolve(fields.map(f => f.RDB$FIELD_NAME.trim()));
        });
    });
}

Firebird.attach(options, async function (err, db) {
    if (err) throw err;

    try {
        const almacenes = await getTableInfo(db, 'ALMACENES');
        console.log('ALMACENES Columns:', almacenes.join(', '));

        const comprom = await getTableInfo(db, 'COMPROM_ARTICULOS');
        console.log('COMPROM_ARTICULOS Columns:', comprom.join(', '));
    } catch (error) {
        console.error(error);
    } finally {
        db.detach();
    }
});
