const Firebird = require('node-firebird');
const config = require('./config');

// Pool de conexiones simple
let pool = null;

/**
 * Obtener o crear pool de conexiones
 */
function getPool() {
  if (!pool) {
    pool = Firebird.pool(5, config.firebird);
  }
  return pool;
}

/**
 * Ejecutar query con callback
 */
function query(sql, params = [], callback) {
  const db = getPool();

  db.get((err, connection) => {
    if (err) {
      console.error('❌ Error obteniendo conexión:', err);
      return callback(err);
    }

    connection.query(sql, params, (err, result) => {
      connection.detach();

      if (err) {
        console.error('❌ Error ejecutando query:', err);
        return callback(err);
      }

      callback(null, result);
    });
  });
}

/**
 * Ejecutar query con Promise
 */
function queryAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

/**
 * Test de conexión
 */
function testConnection(callback) {
  Firebird.attach(config.firebird, (err, db) => {
    if (err) {
      return callback(err);
    }

    db.query('SELECT FIRST 1 * FROM RDB$DATABASE', (err, result) => {
      db.detach();
      callback(err, !err);
    });
  });
}

/**
 * Test de conexión async
 */
function testConnectionAsync() {
  return new Promise((resolve, reject) => {
    testConnection((err, success) => {
      if (err) return reject(err);
      resolve(success);
    });
  });
}

module.exports = {
  query,
  queryAsync,
  testConnection,
  testConnectionAsync,
  getPool
};
