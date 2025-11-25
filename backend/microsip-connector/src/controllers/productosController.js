const firebird = require('../firebird');

/**
 * Listar productos
 */
async function listar(req, res, next) {
  try {
    const { limit = 100, offset = 0, search = '' } = req.query;

    let sql = `
      SELECT FIRST ${parseInt(limit)} SKIP ${parseInt(offset)}
        CODIGO, NOMBRE, PRECIO, STOCK
      FROM PRODUCTOS
    `;

    if (search) {
      sql += ` WHERE NOMBRE CONTAINING '${search}' OR CODIGO CONTAINING '${search}'`;
    }

    sql += ' ORDER BY CODIGO';

    const productos = await firebird.queryAsync(sql);

    res.json({
      data: productos,
      count: productos.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener producto por código
 */
async function obtener(req, res, next) {
  try {
    const { codigo } = req.params;

    const sql = `
      SELECT CODIGO, NOMBRE, PRECIO, STOCK, DESCRIPCION
      FROM PRODUCTOS
      WHERE CODIGO = ?
    `;

    const productos = await firebird.queryAsync(sql, [codigo]);

    if (productos.length === 0) {
      return res.status(404).json({
        error: 'Producto no encontrado'
      });
    }

    res.json(productos[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  obtener
};
