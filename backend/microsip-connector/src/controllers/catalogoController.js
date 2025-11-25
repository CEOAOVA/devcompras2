const firebird = require('../firebird');

/**
 * Listar productos del catálogo
 *
 * Performance: ~600ms con ARTICULOS base
 *
 * Query params:
 * - linea_articulo_id: Filtrar por categoría/línea
 * - search: Buscar por SKU o descripción
 * - activo: Filtrar por estatus (true/false)
 * - limit: Límite de registros (default: 100, max: 1000)
 * - offset: Offset para paginación (default: 0)
 */
async function listarProductos(req, res, next) {
  try {
    const {
      linea_articulo_id,
      search,
      activo,
      limit = 100,
      offset = 0
    } = req.query;

    const limitNum = Math.min(parseInt(limit) || 100, 1000);
    const offsetNum = parseInt(offset) || 0;

    let sql = `
      SELECT FIRST ${limitNum} SKIP ${offsetNum}
        art.ARTICULO_ID,
        art.CLAVE_ARTICULO as SKU,
        art.DESCRIPCION_1 as NOMBRE,
        art.DESCRIPCION_2 as DESCRIPCION,
        art.LINEA_ARTICULO_ID as CATEGORIA_ID,
        art.TIPO_ARTICULO,
        art.UNIDAD_VENTA,
        art.PESO,
        art.VOLUMEN,
        art.EXISTE as ACTIVO,
        art.CODIGO_BARRAS,
        art.COSTO_ULTIMA_COMPRA,
        art.COSTO_PROMEDIO,
        art.PRECIO_LISTA
      FROM ARTICULOS art
      WHERE 1=1
    `;

    if (linea_articulo_id) {
      sql += ` AND art.LINEA_ARTICULO_ID = '${linea_articulo_id}'`;
    }

    if (search) {
      const searchTerm = search.toUpperCase();
      sql += ` AND (
        UPPER(art.CLAVE_ARTICULO) LIKE '%${searchTerm}%' OR
        UPPER(art.DESCRIPCION_1) LIKE '%${searchTerm}%' OR
        UPPER(art.DESCRIPCION_2) LIKE '%${searchTerm}%'
      )`;
    }

    if (activo !== undefined) {
      const activoValue = activo === 'true' || activo === true ? 1 : 0;
      sql += ` AND art.EXISTE = ${activoValue}`;
    }

    sql += ' ORDER BY art.CLAVE_ARTICULO';

    console.log('📦 Consultando catálogo de productos:', {
      linea_articulo_id,
      search,
      activo,
      limit: limitNum,
      offset: offsetNum
    });

    const startTime = Date.now();
    const productos = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Query ejecutada en ${queryTime}ms, ${productos.length} productos`);

    res.json({
      success: true,
      data: productos.map(p => ({
        articulo_id: p.ARTICULO_ID,
        sku: p.SKU?.trim(),
        nombre: p.NOMBRE?.trim(),
        descripcion: p.DESCRIPCION?.trim(),
        categoria_id: p.CATEGORIA_ID,
        tipo: p.TIPO_ARTICULO?.trim(),
        unidad_venta: p.UNIDAD_VENTA?.trim(),
        peso: Number(p.PESO) || 0,
        volumen: Number(p.VOLUMEN) || 0,
        activo: p.ACTIVO === 1,
        codigo_barras: p.CODIGO_BARRAS?.trim(),
        costo_ultima_compra: Number(p.COSTO_ULTIMA_COMPRA) || 0,
        costo_promedio: Number(p.COSTO_PROMEDIO) || 0,
        precio_lista: Number(p.PRECIO_LISTA) || 0
      })),
      count: productos.length,
      limit: limitNum,
      offset: offsetNum,
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al listar productos:', error);
    next(error);
  }
}

/**
 * Obtener detalle de un producto por SKU o ID
 *
 * Performance: ~100ms lookup directo
 */
async function obtenerProducto(req, res, next) {
  try {
    const { sku, id } = req.query;

    if (!sku && !id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro sku o id'
      });
    }

    let sql = `
      SELECT
        art.ARTICULO_ID,
        art.CLAVE_ARTICULO as SKU,
        art.DESCRIPCION_1 as NOMBRE,
        art.DESCRIPCION_2 as DESCRIPCION,
        art.LINEA_ARTICULO_ID as CATEGORIA_ID,
        art.TIPO_ARTICULO,
        art.UNIDAD_VENTA,
        art.PESO,
        art.VOLUMEN,
        art.EXISTE as ACTIVO,
        art.CODIGO_BARRAS,
        art.COSTO_ULTIMA_COMPRA,
        art.COSTO_PROMEDIO,
        art.PRECIO_LISTA,
        art.ULTIMO_COSTO,
        art.TIPO_ARTICULO_ID,
        art.FAMILIA_ARTICULOS_ID,
        art.GRUPO_ARTICULOS_ID
      FROM ARTICULOS art
      WHERE ${id ? `art.ARTICULO_ID = ${id}` : `art.CLAVE_ARTICULO = '${sku}'`}
    `;

    console.log('🔍 Consultando producto:', { sku, id });

    const startTime = Date.now();
    const productos = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    if (productos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    const p = productos[0];

    console.log(`✅ Producto encontrado en ${queryTime}ms`);

    res.json({
      success: true,
      data: {
        articulo_id: p.ARTICULO_ID,
        sku: p.SKU?.trim(),
        nombre: p.NOMBRE?.trim(),
        descripcion: p.DESCRIPCION?.trim(),
        categoria_id: p.CATEGORIA_ID,
        tipo: p.TIPO_ARTICULO?.trim(),
        tipo_id: p.TIPO_ARTICULO_ID,
        familia_id: p.FAMILIA_ARTICULOS_ID,
        grupo_id: p.GRUPO_ARTICULOS_ID,
        unidad_venta: p.UNIDAD_VENTA?.trim(),
        peso: Number(p.PESO) || 0,
        volumen: Number(p.VOLUMEN) || 0,
        activo: p.ACTIVO === 1,
        codigo_barras: p.CODIGO_BARRAS?.trim(),
        costo_ultima_compra: Number(p.COSTO_ULTIMA_COMPRA) || 0,
        costo_promedio: Number(p.COSTO_PROMEDIO) || 0,
        precio_lista: Number(p.PRECIO_LISTA) || 0,
        ultimo_costo: Number(p.ULTIMO_COSTO) || 0
      },
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    next(error);
  }
}

/**
 * Listar categorías/líneas de productos
 *
 * Performance: ~200ms con LINEAS_ARTICULOS
 */
async function listarCategorias(req, res, next) {
  try {
    const sql = `
      SELECT
        lin.LINEA_ARTICULO_ID as CATEGORIA_ID,
        lin.NOMBRE as NOMBRE_CATEGORIA,
        lin.DESCRIPCION,
        COUNT(art.ARTICULO_ID) as TOTAL_PRODUCTOS
      FROM LINEAS_ARTICULOS lin
      LEFT JOIN ARTICULOS art ON lin.LINEA_ARTICULO_ID = art.LINEA_ARTICULO_ID
      GROUP BY lin.LINEA_ARTICULO_ID, lin.NOMBRE, lin.DESCRIPCION
      ORDER BY lin.NOMBRE
    `;

    console.log('📁 Consultando categorías de productos');

    const startTime = Date.now();
    const categorias = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Query ejecutada en ${queryTime}ms, ${categorias.length} categorías`);

    res.json({
      success: true,
      data: categorias.map(c => ({
        categoria_id: c.CATEGORIA_ID,
        nombre: c.NOMBRE_CATEGORIA?.trim(),
        descripcion: c.DESCRIPCION?.trim(),
        total_productos: Number(c.TOTAL_PRODUCTOS) || 0
      })),
      count: categorias.length,
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al listar categorías:', error);
    next(error);
  }
}

/**
 * Obtener precios de un producto por lista de precios
 *
 * Performance: ~150ms con PRECIOS_ARTICULOS
 */
async function obtenerPrecios(req, res, next) {
  try {
    const { sku, articulo_id } = req.query;

    if (!sku && !articulo_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro sku o articulo_id'
      });
    }

    let sql = `
      SELECT
        p.ARTICULO_ID,
        p.LISTA_PRECIOS_ID,
        p.PRECIO,
        p.UNIDAD,
        p.TIPO_CAMBIO,
        lp.NOMBRE as NOMBRE_LISTA
      FROM PRECIOS_ARTICULOS p
      INNER JOIN LISTAS_PRECIOS lp ON p.LISTA_PRECIOS_ID = lp.LISTA_PRECIOS_ID
    `;

    if (articulo_id) {
      sql += ` WHERE p.ARTICULO_ID = ${articulo_id}`;
    } else {
      sql += ` INNER JOIN ARTICULOS art ON p.ARTICULO_ID = art.ARTICULO_ID
               WHERE art.CLAVE_ARTICULO = '${sku}'`;
    }

    sql += ' ORDER BY p.LISTA_PRECIOS_ID';

    console.log('💰 Consultando precios:', { sku, articulo_id });

    const startTime = Date.now();
    const precios = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Query ejecutada en ${queryTime}ms, ${precios.length} listas de precios`);

    res.json({
      success: true,
      data: precios.map(p => ({
        articulo_id: p.ARTICULO_ID,
        lista_precios_id: p.LISTA_PRECIOS_ID,
        nombre_lista: p.NOMBRE_LISTA?.trim(),
        precio: Number(p.PRECIO),
        unidad: p.UNIDAD?.trim(),
        tipo_cambio: Number(p.TIPO_CAMBIO) || 1
      })),
      count: precios.length,
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener precios:', error);
    next(error);
  }
}

/**
 * Obtener historial de ventas de un producto (últimos 90 días)
 *
 * Performance: ~700ms con DOCTOS_PV + JOIN
 */
async function obtenerHistorialVentas(req, res, next) {
  try {
    const { sku, articulo_id, dias = 90 } = req.query;

    if (!sku && !articulo_id) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el parámetro sku o articulo_id'
      });
    }

    const diasNum = Math.min(parseInt(dias) || 90, 365);
    const fechaInicio = new Date(Date.now() - diasNum * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaFin = new Date().toISOString().split('T')[0];

    let whereClause = articulo_id
      ? `det.ARTICULO_ID = ${articulo_id}`
      : `det.CLAVE_ARTICULO = '${sku}'`;

    const sql = `
      SELECT
        pv.FECHA,
        pv.FOLIO as TICKET_ID,
        pv.SUCURSAL_ID as TIENDA_ID,
        det.UNIDADES as CANTIDAD,
        det.UNIDADES_DEV as CANTIDAD_DEVUELTA,
        det.PRECIO_UNITARIO,
        det.PRECIO_TOTAL_NETO as TOTAL,
        (det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as CANTIDAD_NETA
      FROM DOCTOS_PV pv
      INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
      WHERE ${whereClause}
        AND pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        AND pv.FECHA_HORA_CANCELACION IS NULL
      ORDER BY pv.FECHA DESC
    `;

    console.log('📊 Consultando historial de ventas:', { sku, articulo_id, dias: diasNum });

    const startTime = Date.now();
    const historial = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    // Calcular estadísticas
    const totalVendido = historial.reduce((sum, v) => sum + Number(v.CANTIDAD_NETA), 0);
    const totalIngresos = historial.reduce((sum, v) => sum + Number(v.TOTAL), 0);

    console.log(`✅ Query ejecutada en ${queryTime}ms, ${historial.length} transacciones`);

    res.json({
      success: true,
      data: {
        transacciones: historial.map(h => ({
          fecha: h.FECHA,
          ticket_id: h.TICKET_ID?.trim(),
          tienda_id: h.TIENDA_ID,
          cantidad: Number(h.CANTIDAD),
          cantidad_devuelta: Number(h.CANTIDAD_DEVUELTA) || 0,
          cantidad_neta: Number(h.CANTIDAD_NETA),
          precio_unitario: Number(h.PRECIO_UNITARIO),
          total: Number(h.TOTAL)
        })),
        estadisticas: {
          total_transacciones: historial.length,
          total_vendido: totalVendido,
          total_ingresos: totalIngresos,
          precio_promedio: historial.length > 0 ? totalIngresos / totalVendido : 0,
          periodo_dias: diasNum
        }
      },
      count: historial.length,
      periodo: {
        fechaInicio,
        fechaFin
      },
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener historial de ventas:', error);
    next(error);
  }
}

module.exports = {
  listarProductos,
  obtenerProducto,
  listarCategorias,
  obtenerPrecios,
  obtenerHistorialVentas
};
