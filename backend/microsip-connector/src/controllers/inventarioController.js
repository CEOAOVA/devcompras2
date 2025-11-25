const firebird = require('../firebird');

async function listar(req, res, next) {
  try {
    const sql = `
      SELECT
        CODIGO,
        NOMBRE,
        STOCK,
        STOCK_MINIMO,
        STOCK_MAXIMO
      FROM PRODUCTOS
      WHERE STOCK > 0
      ORDER BY STOCK DESC
    `;

    const inventario = await firebird.queryAsync(sql);

    res.json({
      data: inventario,
      total_productos: inventario.length
    });
  } catch (error) {
    next(error);
  }
}

async function obtener(req, res, next) {
  try {
    const { codigo } = req.params;

    const sql = `
      SELECT * FROM PRODUCTOS WHERE CODIGO = ?
    `;

    const productos = await firebird.queryAsync(sql, [codigo]);

    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(productos[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = { listar, obtener };
