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

Firebird.attach(options, function (err, db) {
    if (err) throw err;

    const sql = `
    SELECT R.RDB$RELATION_NAME
    FROM RDB$RELATIONS R
    WHERE EXISTS (
      SELECT 1 FROM RDB$RELATION_FIELDS F1 
      WHERE F1.RDB$RELATION_NAME = R.RDB$RELATION_NAME AND F1.RDB$FIELD_NAME = 'ARTICULO_ID'
    )
    AND EXISTS (
      SELECT 1 FROM RDB$RELATION_FIELDS F2
      WHERE F2.RDB$RELATION_NAME = R.RDB$RELATION_NAME AND F2.RDB$FIELD_NAME = 'ALMACEN_ID'
    )
    ORDER BY R.RDB$RELATION_NAME
  `;

    db.query(sql, function (err, result) {
        if (err) throw err;
        result.forEach(row => console.log(row.RDB$RELATION_NAME.trim()));
        db.detach();
    });
});
