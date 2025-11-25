const firebird = require('../firebird');

async function listar(req, res, next) {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const sql = `
      SELECT FIRST ${parseInt(limit)} SKIP ${parseInt(offset)}
        ID, NOMBRE, RFC, EMAIL, TELEFONO
      FROM CLIENTES
      ORDER BY NOMBRE
    `;

    const clientes = await firebird.queryAsync(sql);

    res.json({
      data: clientes,
      count: clientes.length
    });
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const { id } = req.params;

    const sql = 'SELECT * FROM CLIENTES WHERE ID = ?';
    const clientes = await firebird.queryAsync(sql, [id]);

    if (clientes.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    res.json(clientes[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, obtener };
