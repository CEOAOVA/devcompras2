const firebird = require('../firebird');

/**
 * Listar ventas desde tablas base DOCTOS_PV + DOCTOS_PV_DET
 *
 * Performance: ~770ms (11x más rápido que VW_FACT_VENTAS)
 *
 * Query params:
 * - fecha_inicio: Fecha inicio (formato: YYYY-MM-DD) - OBLIGATORIO
 * - fecha_fin: Fecha fin (formato: YYYY-MM-DD) - OBLIGATORIO
 * - tienda: Filtrar por sucursal_id
 * - limit: Límite de registros (default: 100, max: 1000)
 * - offset: Offset para paginación (default: 0)
 */
async function listar(req, res, next) {
  try {
    const {
      fecha_inicio,
      fecha_fin,
      tienda,
      limit = 100,
      offset = 0
    } = req.query;

    // Validar fechas obligatorias
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        error: 'Los parámetros fecha_inicio y fecha_fin son obligatorios'
      });
    }

    const limitNum = Math.min(parseInt(limit) || 100, 1000);
    const offsetNum = parseInt(offset) || 0;

    // Query optimizada usando DOCTOS_PV + DOCTOS_PV_DET + ARTICULOS
    let sql = `
      SELECT FIRST ${limitNum} SKIP ${offsetNum}
        pv.DOCTO_PV_ID,
        pv.FOLIO as TICKET_ID,
        pv.FECHA,
        pv.SUCURSAL_ID as TIENDA_ID,
        pv.CLIENTE_ID,
        pv.VENDEDOR_ID,
        pv.ALMACEN_ID,

        det.DOCTO_PV_DET_ID,
        det.ARTICULO_ID,
        det.CLAVE_ARTICULO as SKU,
        det.UNIDADES as CANTIDAD,
        det.UNIDADES_DEV as CANTIDAD_DEVUELTA,
        det.PRECIO_UNITARIO,
        det.PRECIO_UNITARIO_IMPTO as PRECIO_CON_IVA,
        det.IMPUESTO_POR_UNIDAD as IMPUESTO,
        det.PRECIO_TOTAL_NETO as TOTAL_PARTIDA,

        art.LINEA_ARTICULO_ID as CATEGORIA_ID,

        (det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as CANTIDAD_NETA

      FROM DOCTOS_PV pv
      INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
      INNER JOIN ARTICULOS art ON det.ARTICULO_ID = art.ARTICULO_ID

      WHERE pv.FECHA BETWEEN '${fecha_inicio}' AND '${fecha_fin}'
        AND pv.FECHA_HORA_CANCELACION IS NULL
    `;

    if (tienda) {
      sql += ` AND pv.SUCURSAL_ID = '${tienda}'`;
    }

    sql += ' ORDER BY pv.FECHA DESC, pv.FOLIO DESC';

    console.log('📊 Consultando ventas (DOCTOS_PV):', { fecha_inicio, fecha_fin, tienda, limit: limitNum, offset: offsetNum });

    const startTime = Date.now();
    const ventas = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Query ejecutada en ${queryTime}ms, ${ventas.length} registros`);

    res.json({
      success: true,
      data: ventas.map(v => ({
        docto_pv_id: v.DOCTO_PV_ID,
        ticket_id: v.TICKET_ID?.trim(),
        fecha: v.FECHA,
        tienda_id: v.TIENDA_ID,
        cliente_id: v.CLIENTE_ID,
        vendedor_id: v.VENDEDOR_ID?.trim(),
        almacen_id: v.ALMACEN_ID,

        articulo_id: v.ARTICULO_ID,
        sku: v.SKU?.trim(),
        cantidad: Number(v.CANTIDAD),
        cantidad_devuelta: Number(v.CANTIDAD_DEVUELTA) || 0,
        cantidad_neta: Number(v.CANTIDAD_NETA),
        precio_unitario: Number(v.PRECIO_UNITARIO),
        precio_con_iva: Number(v.PRECIO_CON_IVA),
        impuesto: Number(v.IMPUESTO),
        total_partida: Number(v.TOTAL_PARTIDA),

        categoria_id: v.CATEGORIA_ID
      })),
      count: ventas.length,
      limit: limitNum,
      offset: offsetNum,
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al listar ventas:', error);
    next(error);
  }
}

/**
 * Obtener KPIs dashboard de ventas
 *
 * Performance: ~600ms con DOCTOS_PV + JOIN
 *
 * Retorna:
 * - Total de ventas (últimos 30 días)
 * - Número de transacciones (partidas)
 * - Número de tiendas activas
 * - Promedio de venta por partida
 */
async function obtenerKPIs(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    // Si no se proporcionan fechas, usar últimos 30 días
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    const fechaInicio = fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sql = `
      SELECT
        COUNT(*) as TOTAL_PARTIDAS,
        COUNT(DISTINCT pv.DOCTO_PV_ID) as TOTAL_TICKETS,
        SUM(det.PRECIO_TOTAL_NETO) as INGRESOS_TOTALES,
        COUNT(DISTINCT pv.SUCURSAL_ID) as TIENDAS_ACTIVAS,
        AVG(det.PRECIO_TOTAL_NETO) as PROMEDIO_VENTA_PARTIDA,
        SUM(det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as UNIDADES_NETAS
      FROM DOCTOS_PV pv
      INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
      WHERE pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        AND pv.FECHA_HORA_CANCELACION IS NULL
    `;

    console.log('📈 Consultando KPIs de ventas (DOCTOS_PV):', { fecha_inicio: fechaInicio, fecha_fin: fechaFin });

    const startTime = Date.now();
    const result = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;
    const kpis = result[0] || {};

    console.log(`✅ KPIs calculados en ${queryTime}ms`);

    res.json({
      success: true,
      data: {
        totalPartidas: Number(kpis.TOTAL_PARTIDAS) || 0,
        totalTickets: Number(kpis.TOTAL_TICKETS) || 0,
        ingresosTotales: Number(kpis.INGRESOS_TOTALES) || 0,
        tiendasActivas: Number(kpis.TIENDAS_ACTIVAS) || 0,
        promedioVentaPartida: Number(kpis.PROMEDIO_VENTA_PARTIDA) || 0,
        unidadesVendidas: Number(kpis.UNIDADES_NETAS) || 0,
        periodo: {
          fechaInicio: fechaInicio,
          fechaFin: fechaFin
        }
      },
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener KPIs:', error);
    next(error);
  }
}

/**
 * Obtener ventas por sucursal/tienda
 *
 * Performance: ~700ms con DOCTOS_PV + JOIN
 */
async function ventasPorSucursal(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    const fechaInicio = fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sql = `
      SELECT
        pv.SUCURSAL_ID as TIENDA_ID,
        COUNT(DISTINCT pv.DOCTO_PV_ID) as TOTAL_TICKETS,
        COUNT(*) as TOTAL_PARTIDAS,
        SUM(det.PRECIO_TOTAL_NETO) as TOTAL_VENTAS,
        AVG(det.PRECIO_TOTAL_NETO) as PROMEDIO_VENTA_PARTIDA,
        SUM(det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as UNIDADES_VENDIDAS
      FROM DOCTOS_PV pv
      INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
      WHERE pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        AND pv.FECHA_HORA_CANCELACION IS NULL
      GROUP BY pv.SUCURSAL_ID
      ORDER BY TOTAL_VENTAS DESC
    `;

    console.log('🏪 Consultando ventas por tienda (DOCTOS_PV):', { fecha_inicio: fechaInicio, fecha_fin: fechaFin });

    const startTime = Date.now();
    const ventas = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Ventas por sucursal calculadas en ${queryTime}ms, ${ventas.length} tiendas`);

    res.json({
      success: true,
      data: ventas.map(v => ({
        tienda_id: v.TIENDA_ID,
        total_tickets: Number(v.TOTAL_TICKETS),
        total_partidas: Number(v.TOTAL_PARTIDAS),
        total_ventas: Number(v.TOTAL_VENTAS),
        promedio_venta_partida: Number(v.PROMEDIO_VENTA_PARTIDA),
        unidades_vendidas: Number(v.UNIDADES_VENDIDAS)
      })),
      count: ventas.length,
      periodo: {
        fechaInicio: fechaInicio,
        fechaFin: fechaFin
      },
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener ventas por tienda:', error);
    next(error);
  }
}

/**
 * Obtener top productos más vendidos (por SKU)
 *
 * Performance: ~800ms con DOCTOS_PV + JOIN
 */
async function productosTop(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin, limit = 10 } = req.query;

    const limitNum = Math.min(parseInt(limit) || 10, 100);
    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    const fechaInicio = fecha_inicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sql = `
      SELECT FIRST ${limitNum}
        det.CLAVE_ARTICULO as SKU,
        det.ARTICULO_ID,
        SUM(det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as CANTIDAD_VENDIDA,
        SUM(det.PRECIO_TOTAL_NETO) as INGRESOS_TOTALES,
        COUNT(DISTINCT pv.DOCTO_PV_ID) as NUM_TICKETS,
        COUNT(*) as NUM_PARTIDAS,
        AVG(det.PRECIO_UNITARIO) as PRECIO_PROMEDIO,
        SUM(det.IMPUESTO_POR_UNIDAD * det.UNIDADES) as IMPUESTOS_TOTALES
      FROM DOCTOS_PV pv
      INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
      WHERE pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        AND pv.FECHA_HORA_CANCELACION IS NULL
      GROUP BY det.CLAVE_ARTICULO, det.ARTICULO_ID
      ORDER BY CANTIDAD_VENDIDA DESC
    `;

    console.log('🔝 Consultando productos top (DOCTOS_PV):', { fecha_inicio: fechaInicio, fecha_fin: fechaFin, limit: limitNum });

    const startTime = Date.now();
    const productos = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Query ejecutada en ${queryTime}ms, ${productos.length} productos`);

    res.json({
      success: true,
      data: productos.map(p => ({
        sku: p.SKU?.trim(),
        articulo_id: p.ARTICULO_ID,
        cantidad_vendida: Number(p.CANTIDAD_VENDIDA),
        ingresos_totales: Number(p.INGRESOS_TOTALES),
        num_tickets: Number(p.NUM_TICKETS),
        num_partidas: Number(p.NUM_PARTIDAS),
        precio_promedio: Number(p.PRECIO_PROMEDIO),
        impuestos_totales: Number(p.IMPUESTOS_TOTALES)
      })),
      count: productos.length,
      periodo: {
        fechaInicio: fechaInicio,
        fechaFin: fechaFin
      },
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener productos top:', error);
    next(error);
  }
}

/**
 * Obtener tendencias de ventas (agrupadas por día/semana/mes)
 *
 * Performance: ~900ms con DOCTOS_PV + JOIN
 */
async function tendencias(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin, agrupacion = 'dia' } = req.query;

    const fechaFin = fecha_fin || new Date().toISOString().split('T')[0];
    const fechaInicio = fecha_inicio || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let groupByClause;
    let selectClause;

    switch (agrupacion.toLowerCase()) {
      case 'mes':
        selectClause = `EXTRACT(YEAR FROM pv.FECHA) as ANO, EXTRACT(MONTH FROM pv.FECHA) as MES`;
        groupByClause = `EXTRACT(YEAR FROM pv.FECHA), EXTRACT(MONTH FROM pv.FECHA)`;
        break;
      case 'semana':
        selectClause = `EXTRACT(YEAR FROM pv.FECHA) as ANO, EXTRACT(WEEK FROM pv.FECHA) as SEMANA`;
        groupByClause = `EXTRACT(YEAR FROM pv.FECHA), EXTRACT(WEEK FROM pv.FECHA)`;
        break;
      default: // día
        selectClause = `pv.FECHA`;
        groupByClause = `pv.FECHA`;
    }

    const sql = `
      SELECT
        ${selectClause},
        COUNT(DISTINCT pv.DOCTO_PV_ID) as TOTAL_TICKETS,
        COUNT(*) as TOTAL_PARTIDAS,
        SUM(det.PRECIO_TOTAL_NETO) as TOTAL_VENTAS,
        AVG(det.PRECIO_TOTAL_NETO) as PROMEDIO_VENTA_PARTIDA,
        SUM(det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as UNIDADES_VENDIDAS,
        COUNT(DISTINCT pv.SUCURSAL_ID) as TIENDAS_ACTIVAS
      FROM DOCTOS_PV pv
      INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID
      WHERE pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        AND pv.FECHA_HORA_CANCELACION IS NULL
      GROUP BY ${groupByClause}
      ORDER BY ${groupByClause}
    `;

    console.log('📅 Consultando tendencias (DOCTOS_PV):', { fecha_inicio: fechaInicio, fecha_fin: fechaFin, agrupacion });

    const startTime = Date.now();
    const tendencias = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`✅ Query ejecutada en ${queryTime}ms, ${tendencias.length} períodos`);

    res.json({
      success: true,
      data: tendencias.map(t => {
        const base = {
          total_tickets: Number(t.TOTAL_TICKETS),
          total_partidas: Number(t.TOTAL_PARTIDAS),
          total_ventas: Number(t.TOTAL_VENTAS),
          promedio_venta_partida: Number(t.PROMEDIO_VENTA_PARTIDA),
          unidades_vendidas: Number(t.UNIDADES_VENDIDAS),
          tiendas_activas: Number(t.TIENDAS_ACTIVAS)
        };

        if (agrupacion.toLowerCase() === 'mes') {
          return { ano: t.ANO, mes: t.MES, ...base };
        } else if (agrupacion.toLowerCase() === 'semana') {
          return { ano: t.ANO, semana: t.SEMANA, ...base };
        } else {
          return { fecha: t.FECHA, ...base };
        }
      }),
      count: tendencias.length,
      agrupacion,
      periodo: {
        fechaInicio: fechaInicio,
        fechaFin: fechaFin
      },
      performance: {
        query_time_ms: queryTime
      }
    });
  } catch (error) {
    console.error('❌ Error al obtener tendencias:', error);
    next(error);
  }
}

module.exports = {
  listar,
  obtenerKPIs,
  ventasPorSucursal,
  productosTop,
  tendencias
};
