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
    SELECT FIRST 10
      ALMACEN_ID,
      ARTICULO_ID,
      SUM(EXISTENCIA) as TOTAL_EXISTENCIA,
      SUM(VALOR_TOTAL) as TOTAL_VALOR
    FROM CAPAS_COSTOS
    GROUP BY ALMACEN_ID, ARTICULO_ID
    HAVING SUM(EXISTENCIA) > 0
  `;

    db.query(sql, function (err, result) {
        if (err) throw err;
        console.log('Inventory Sample from CAPAS_COSTOS:', result);
        db.detach();
    });
});
