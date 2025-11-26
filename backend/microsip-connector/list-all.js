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

    const sql = "SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_TYPE = 0 AND RDB$SYSTEM_FLAG = 0 ORDER BY RDB$RELATION_NAME";

    db.query(sql, function (err, result) {
        if (err) throw err;
        result.forEach(row => console.log(row.RDB$RELATION_NAME.trim()));
        db.detach();
    });
});
