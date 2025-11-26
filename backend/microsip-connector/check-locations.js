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

    db.query("SELECT ALMACEN_ID, NOMBRE FROM ALMACENES", function (err, almacenes) {
        if (err) throw err;
        console.log('ALMACENES:', almacenes);

        db.query("SELECT SUCURSAL_ID, NOMBRE FROM SUCURSALES", function (err, sucursales) {
            if (err) throw err;
            console.log('SUCURSALES:', sucursales);
            db.detach();
        });
    });
});
