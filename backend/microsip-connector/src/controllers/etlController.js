const etl = require('../services/etlService');

/**
 * Controlador de endpoints ETL para sincronización Microsip → Supabase
 *
 * Endpoints:
 * POST /api/etl/sync/full        - Sincronización completa
 * POST /api/etl/sync/categorias  - Solo categorías
 * POST /api/etl/sync/productos   - Solo productos
 * POST /api/etl/sync/tiendas     - Solo tiendas
 * POST /api/etl/sync/ventas      - Ventas por rango de fechas
 * POST /api/etl/sync/inventario  - Inventario actual
 */

/**
 * POST /api/etl/sync/full
 *
 * Body (opcional):
 * {
 *   "dias_ventas": 90  // Días de ventas a sincronizar (default: 90)
 * }
 */
async function syncFull(req, res, next) {
  try {
    const { dias_ventas = 90 } = req.body;

    console.log(`🚀 [API] Iniciando sincronización completa (ventas: ${dias_ventas} días)`);

    const result = await etl.syncFull(dias_ventas);

    res.json({
      success: true,
      message: 'Sincronización completa finalizada',
      data: result.results
    });
  } catch (error) {
    console.error('❌ [API] Error en sincronización completa:', error);
    next(error);
  }
}

/**
 * POST /api/etl/sync/categorias
 */
async function syncCategorias(req, res, next) {
  try {
    console.log('🔄 [API] Sincronizando categorías');

    const result = await etl.syncCategorias();

    res.json({
      success: true,
      message: 'Categorías sincronizadas',
      data: result
    });
  } catch (error) {
    console.error('❌ [API] Error al sincronizar categorías:', error);
    next(error);
  }
}

/**
 * POST /api/etl/sync/productos
 */
async function syncProductos(req, res, next) {
  try {
    console.log('🔄 [API] Sincronizando productos');

    const result = await etl.syncProductos();

    res.json({
      success: true,
      message: 'Productos sincronizados',
      data: result
    });
  } catch (error) {
    console.error('❌ [API] Error al sincronizar productos:', error);
    next(error);
  }
}

/**
 * POST /api/etl/sync/tiendas
 */
async function syncTiendas(req, res, next) {
  try {
    console.log('🔄 [API] Sincronizando tiendas');

    const result = await etl.syncTiendas();

    res.json({
      success: true,
      message: 'Tiendas sincronizadas',
      data: result
    });
  } catch (error) {
    console.error('❌ [API] Error al sincronizar tiendas:', error);
    next(error);
  }
}

/**
 * POST /api/etl/sync/ventas
 *
 * Body:
 * {
 *   "fecha_inicio": "YYYY-MM-DD",  // Obligatorio
 *   "fecha_fin": "YYYY-MM-DD"      // Obligatorio
 * }
 */
async function syncVentas(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin } = req.body;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        error: 'Los parámetros fecha_inicio y fecha_fin son obligatorios'
      });
    }

    console.log(`🔄 [API] Sincronizando ventas desde ${fecha_inicio} hasta ${fecha_fin}`);

    const result = await etl.syncVentas(fecha_inicio, fecha_fin);

    res.json({
      success: true,
      message: 'Ventas sincronizadas',
      data: result
    });
  } catch (error) {
    console.error('❌ [API] Error al sincronizar ventas:', error);
    next(error);
  }
}

/**
 * POST /api/etl/sync/inventario
 */
async function syncInventario(req, res, next) {
  try {
    console.log('🔄 [API] Sincronizando inventario actual');

    const result = await etl.syncInventarioActual();

    res.json({
      success: true,
      message: 'Inventario sincronizado',
      data: result
    });
  } catch (error) {
    console.error('❌ [API] Error al sincronizar inventario:', error);
    next(error);
  }
}

module.exports = {
  syncFull,
  syncCategorias,
  syncProductos,
  syncTiendas,
  syncVentas,
  syncInventario
};
