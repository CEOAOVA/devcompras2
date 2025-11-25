const firebird = require('../firebird');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Servicio ETL: Microsip → Supabase
 *
 * Funciones:
 * - syncCategorias(): Sincroniza líneas/categorías de productos
 * - syncProductos(): Sincroniza catálogo de productos
 * - syncTiendas(): Sincroniza catálogo de sucursales
 * - syncVentas(fechaInicio, fechaFin): Sincroniza ventas en rango de fechas
 * - syncInventarioMovimientos(fechaInicio, fechaFin): Sincroniza movimientos de inventario
 * - syncInventarioActual(): Calcula snapshot de inventario actual
 * - syncFull(): Sincronización completa
 */

// ============================================
// UTILIDADES
// ============================================

/**
 * Crear log de sincronización
 */
async function createSyncLog(syncType, fechaInicio = null, fechaFin = null) {
  const { data, error } = await supabase
    .schema('devcompras')
    .from('etl_sync_log')
    .insert({
      sync_type: syncType,
      status: 'running',
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      started_at: new Date().toISOString(),
      records_processed: 0,
      records_inserted: 0,
      records_updated: 0
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Actualizar log de sincronización
 */
async function updateSyncLog(logId, updates) {
  const { error } = await supabase
    .schema('devcompras')
    .from('etl_sync_log')
    .update(updates)
    .eq('id', logId);

  if (error) throw error;
}

/**
 * Finalizar log de sincronización con éxito
 */
async function completeSyncLog(logId, stats) {
  const startedAt = new Date(await getSyncLogStartTime(logId));
  const completedAt = new Date();
  const durationSeconds = Math.floor((completedAt - startedAt) / 1000);

  await updateSyncLog(logId, {
    status: 'success',
    completed_at: completedAt.toISOString(),
    duration_seconds: durationSeconds,
    ...stats
  });
}

/**
 * Marcar log de sincronización como error
 */
async function failSyncLog(logId, error) {
  await updateSyncLog(logId, {
    status: 'error',
    completed_at: new Date().toISOString(),
    error_message: error.message,
    error_details: { stack: error.stack }
  });
}

/**
 * Obtener hora de inicio del log
 */
async function getSyncLogStartTime(logId) {
  const { data } = await supabase
    .schema('devcompras')
    .from('etl_sync_log')
    .select('started_at')
    .eq('id', logId)
    .single();

  return data?.started_at;
}

// ============================================
// SYNC: CATEGORÍAS (LINEAS_ARTICULOS)
// ============================================

async function syncCategorias() {
  const logId = await createSyncLog('categorias');

  try {
    console.log('🔄 [ETL] Sincronizando categorías desde Microsip...');

    const sql = `
      SELECT
        lin.LINEA_ARTICULO_ID as CATEGORIA_ID,
        lin.NOMBRE as NOMBRE_CATEGORIA,
        COUNT(art.ARTICULO_ID) as TOTAL_PRODUCTOS
      FROM LINEAS_ARTICULOS lin
      LEFT JOIN ARTICULOS art ON lin.LINEA_ARTICULO_ID = art.LINEA_ARTICULO_ID
      GROUP BY lin.LINEA_ARTICULO_ID, lin.NOMBRE
      ORDER BY lin.NOMBRE
    `;

    const categorias = await firebird.queryAsync(sql);
    console.log(`📊 Encontradas ${categorias.length} categorías en Microsip`);

    let inserted = 0;
    let updated = 0;

    for (const cat of categorias) {
      const record = {
        categoria_id: cat.CATEGORIA_ID,
        nombre: cat.NOMBRE_CATEGORIA?.trim() || '',
        descripcion: null,
        total_productos: Number(cat.TOTAL_PRODUCTOS) || 0,
        activo: true
      };

      // Upsert: INSERT o UPDATE si existe
      const { error } = await supabase
        .schema('devcompras')
        .from('lineas_articulos')
        .upsert(record, { onConflict: 'categoria_id' });

      if (error) {
        console.error(`❌ Error al insertar categoría ${cat.CATEGORIA_ID}:`, error.message);
      } else {
        // Determinar si fue insert o update (simplificado)
        inserted++;
      }
    }

    await completeSyncLog(logId, {
      records_processed: categorias.length,
      records_inserted: inserted,
      records_updated: updated
    });

    console.log(`✅ [ETL] Categorías sincronizadas: ${inserted} insertadas`);

    return { success: true, inserted, updated, total: categorias.length };

  } catch (error) {
    console.error('❌ [ETL] Error al sincronizar categorías:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// SYNC: PRODUCTOS (ARTICULOS)
// ============================================

async function syncProductos() {
  const logId = await createSyncLog('productos');

  try {
    console.log('🔄 [ETL] Sincronizando productos desde Microsip...');

    const sql = `
      SELECT
        art.ARTICULO_ID,
        art.ARTICULO_ID as SKU,
        art.NOMBRE as NOMBRE,
        art.NOMBRE as DESCRIPCION,
        art.LINEA_ARTICULO_ID as CATEGORIA_ID,
        art.ESTATUS,
        art.UNIDAD_VENTA,
        art.PESO_UNITARIO
      FROM ARTICULOS art
      ORDER BY art.ARTICULO_ID
    `;

    const productos = await firebird.queryAsync(sql);
    console.log(`📦 Encontrados ${productos.length} productos en Microsip`);

    let inserted = 0;
    let failed = 0;
    const batchSize = 100;

    // Procesar en lotes para mejor performance
    for (let i = 0; i < productos.length; i += batchSize) {
      const batch = productos.slice(i, i + batchSize);

      const records = batch.map(p => ({
        articulo_id: p.ARTICULO_ID,
        sku: String(p.SKU),
        nombre: p.NOMBRE?.trim() || '',
        descripcion: p.DESCRIPCION?.trim() || null,
        categoria_id: p.CATEGORIA_ID || null,
        tipo: null,
        tipo_id: null,
        familia_id: null,
        grupo_id: null,
        unidad_venta: p.UNIDAD_VENTA?.trim() || null,
        codigo_barras: null,
        peso: Number(p.PESO_UNITARIO) || 0,
        volumen: 0,
        activo: p.ESTATUS === 'A',
        costo_ultima_compra: 0,
        costo_promedio: 0,
        precio_lista: 0,
        ultimo_costo: 0
      }));

      const { error } = await supabase
        .schema('devcompras')
        .from('articulos')
        .upsert(records, { onConflict: 'articulo_id' });

      if (error) {
        console.error(`❌ Error en batch ${i}-${i + batchSize}:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }

      // Log progress cada 500 registros
      if ((i + batchSize) % 500 === 0) {
        console.log(`📊 Procesados ${i + batchSize} / ${productos.length} productos`);
      }
    }

    await completeSyncLog(logId, {
      records_processed: productos.length,
      records_inserted: inserted,
      records_failed: failed
    });

    console.log(`✅ [ETL] Productos sincronizados: ${inserted} OK, ${failed} errores`);

    return { success: true, inserted, failed, total: productos.length };

  } catch (error) {
    console.error('❌ [ETL] Error al sincronizar productos:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// SYNC: PRECIOS (PRECIOS_ARTICULOS)
// ============================================

async function syncPrecios() {
  const logId = await createSyncLog('precios');

  try {
    console.log('🔄 [ETL] Sincronizando precios desde Microsip...');

    const sql = `
      SELECT
        pa.ARTICULO_ID,
        pa.PRECIO_EMPRESA_ID as LISTA_PRECIOS_ID,
        lp.NOMBRE as NOMBRE_LISTA,
        pa.PRECIO,
        pa.MONEDA_ID,
        pa.MARGEN
      FROM PRECIOS_ART pa
      LEFT JOIN PRECIOS_EMPRESA lp ON pa.PRECIO_EMPRESA_ID = lp.PRECIO_EMPRESA_ID
      ORDER BY pa.ARTICULO_ID, pa.PRECIO_EMPRESA_ID
    `;

    const precios = await firebird.queryAsync(sql);
    console.log(`💰 Encontrados ${precios.length} precios en Microsip`);

    let inserted = 0;
    let failed = 0;
    const batchSize = 500;

    for (let i = 0; i < precios.length; i += batchSize) {
      const batch = precios.slice(i, i + batchSize);

      const records = batch.map(p => ({
        articulo_id: p.ARTICULO_ID,
        lista_precios_id: p.LISTA_PRECIOS_ID,
        nombre_lista: p.NOMBRE_LISTA?.trim() || 'General',
        precio: Number(p.PRECIO) || 0,
        unidad: null, // Microsip a veces no tiene unidad en precios
        tipo_cambio: 1 // Default
      }));

      const { error } = await supabase
        .schema('devcompras')
        .from('precios_articulos')
        .upsert(records, { onConflict: 'articulo_id,lista_precios_id' });

      if (error) {
        console.error(`❌ Error en batch ${i}-${i + batchSize}:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }

      if ((i + batchSize) % 1000 === 0) {
        console.log(`📊 Procesados ${i + batchSize} / ${precios.length} precios`);
      }
    }

    await completeSyncLog(logId, {
      records_processed: precios.length,
      records_inserted: inserted,
      records_failed: failed
    });

    console.log(`✅ [ETL] Precios sincronizados: ${inserted} OK, ${failed} errores`);

    return { success: true, inserted, failed, total: precios.length };

  } catch (error) {
    console.error('❌ [ETL] Error al sincronizar precios:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// SYNC: TIENDAS (SUCURSALES)
// ============================================

async function syncTiendas() {
  const logId = await createSyncLog('tiendas');

  try {
    console.log('🔄 [ETL] Sincronizando tiendas desde Microsip...');

    const sql = `
      SELECT
        SUCURSAL_ID,
        NOMBRE
      FROM SUCURSALES
      ORDER BY SUCURSAL_ID
    `;

    const tiendas = await firebird.queryAsync(sql);
    console.log(`🏪 Encontradas ${tiendas.length} tiendas en Microsip`);

    let inserted = 0;

    for (const t of tiendas) {
      const record = {
        sucursal_id: t.SUCURSAL_ID,
        nombre: t.NOMBRE?.trim() || null,
        direccion: null,
        ciudad: null,
        estado: null,
        activo: true
      };

      const { error } = await supabase
        .schema('devcompras')
        .from('sucursales')
        .upsert(record, { onConflict: 'sucursal_id' });

      if (error) {
        console.error(`❌ Error al insertar tienda ${t.SUCURSAL_ID}:`, error.message);
      } else {
        inserted++;
      }
    }

    await completeSyncLog(logId, {
      records_processed: tiendas.length,
      records_inserted: inserted
    });

    console.log(`✅ [ETL] Tiendas sincronizadas: ${inserted} insertadas`);

    return { success: true, inserted, total: tiendas.length };

  } catch (error) {
    console.error('❌ [ETL] Error al sincronizar tiendas:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// SYNC: VENTAS (DOCTOS_PV_DET)
// ============================================

async function syncVentas(fechaInicio, fechaFin) {
  const logId = await createSyncLog('ventas', fechaInicio, fechaFin);

  try {
    console.log(`🔄 [ETL] Sincronizando ventas desde ${fechaInicio} hasta ${fechaFin}...`);

    const sql = `
      SELECT
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

        (det.UNIDADES - COALESCE(det.UNIDADES_DEV, 0)) as CANTIDAD_NETA

      FROM DOCTOS_PV pv
      INNER JOIN DOCTOS_PV_DET det ON pv.DOCTO_PV_ID = det.DOCTO_PV_ID

      WHERE pv.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        AND pv.FECHA_HORA_CANCELACION IS NULL

      ORDER BY pv.FECHA DESC, pv.FOLIO DESC
    `;

    const startTime = Date.now();
    const ventas = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`📊 Encontradas ${ventas.length} partidas de venta en ${queryTime}ms`);

    let inserted = 0;
    let failed = 0;
    const batchSize = 500;

    for (let i = 0; i < ventas.length; i += batchSize) {
      const batch = ventas.slice(i, i + batchSize);

      const records = batch.map(v => {
        const fecha = new Date(v.FECHA);

        return {
          docto_pv_id: v.DOCTO_PV_ID,
          docto_pv_det_id: v.DOCTO_PV_DET_ID,

          fecha: v.FECHA,
          ano: fecha.getFullYear(),
          mes: fecha.getMonth() + 1,
          dia: fecha.getDate(),
          semana: getWeekNumber(fecha),

          tienda_id: v.TIENDA_ID,
          articulo_id: v.ARTICULO_ID,
          sku: v.SKU ? String(v.SKU).trim() : null,
          ticket_id: v.TICKET_ID ? String(v.TICKET_ID).trim() : null,
          cliente_id: v.CLIENTE_ID || null,
          vendedor_id: v.VENDEDOR_ID ? String(v.VENDEDOR_ID).trim() : null,
          almacen_id: v.ALMACEN_ID || null,

          cantidad: Number(v.CANTIDAD),
          cantidad_devuelta: Number(v.CANTIDAD_DEVUELTA) || 0,
          cantidad_neta: Number(v.CANTIDAD_NETA),

          precio_unitario: Number(v.PRECIO_UNITARIO),
          precio_con_iva: Number(v.PRECIO_CON_IVA),
          impuesto: Number(v.IMPUESTO),
          total_partida: Number(v.TOTAL_PARTIDA),

          // Campos opcionales (calcular después si es necesario)
          costo_unitario: 0,
          margen_unitario: 0,
          margen_total: 0
        };
      });

      const { error } = await supabase
        .schema('devcompras')
        .from('doctos_pv_det')
        .upsert(records, { onConflict: 'docto_pv_id,docto_pv_det_id' });

      if (error) {
        console.error(`❌ Error en batch ${i}-${i + batchSize}:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }

      // Log progress cada 1000 registros
      if ((i + batchSize) % 1000 === 0) {
        console.log(`📊 Procesados ${i + batchSize} / ${ventas.length} registros de venta`);
      }
    }

    await completeSyncLog(logId, {
      records_processed: ventas.length,
      records_inserted: inserted,
      records_failed: failed
    });

    console.log(`✅ [ETL] Ventas sincronizadas: ${inserted} OK, ${failed} errores`);

    return { success: true, inserted, failed, total: ventas.length };

  } catch (error) {
    console.error('❌ [ETL] Error al sincronizar ventas:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// SYNC: INVENTARIO MOVIMIENTOS (DOCTOS_IN_DET)
// ============================================

async function syncInventarioMovimientos(fechaInicio, fechaFin) {
  const logId = await createSyncLog('inventario_movimientos', fechaInicio, fechaFin);

  try {
    console.log(`🔄 [ETL] Sincronizando movimientos de inventario desde ${fechaInicio} hasta ${fechaFin}...`);

    const sql = `
      SELECT
        di.DOCTO_IN_ID,
        di.FOLIO,
        di.FECHA,
        di.SUCURSAL_ID as TIENDA_ID,
        di.ALMACEN_ID,
        di.CONCEPTO_IN_ID,
        c.NOMBRE as CONCEPTO_MOVIMIENTO,
        c.TIPO_MOVTO, -- 'E'ntrada, 'S'alida, etc.

        did.DOCTO_IN_DET_ID,
        did.ARTICULO_ID,
        did.CLAVE_ARTICULO as SKU,
        did.UNIDADES as CANTIDAD,
        did.COSTO_UNITARIO,
        did.COSTO_TOTAL

      FROM DOCTOS_IN di
      INNER JOIN DOCTOS_IN_DET did ON di.DOCTO_IN_ID = did.DOCTO_IN_ID
      LEFT JOIN CONCEPTOS_IN c ON di.CONCEPTO_IN_ID = c.CONCEPTO_IN_ID

      WHERE di.FECHA BETWEEN '${fechaInicio}' AND '${fechaFin}'
        AND di.CANCELADO = 'N'

      ORDER BY di.FECHA DESC, di.FOLIO DESC
    `;

    const startTime = Date.now();
    const movimientos = await firebird.queryAsync(sql);
    const queryTime = Date.now() - startTime;

    console.log(`📊 Encontrados ${movimientos.length} movimientos en ${queryTime}ms`);

    let inserted = 0;
    let failed = 0;
    const batchSize = 500;

    for (let i = 0; i < movimientos.length; i += batchSize) {
      const batch = movimientos.slice(i, i + batchSize);

      const records = batch.map(m => {
        const fecha = new Date(m.FECHA);
        let tipoMovimiento = 'OTRO';
        if (m.TIPO_MOVTO === 'E') tipoMovimiento = 'ENTRADA';
        if (m.TIPO_MOVTO === 'S') tipoMovimiento = 'SALIDA';
        if (m.TIPO_MOVTO === 'T') tipoMovimiento = 'TRASPASO';
        if (m.TIPO_MOVTO === 'A') tipoMovimiento = 'AJUSTE'; // Asumiendo 'A'

        return {
          docto_in_id: m.DOCTO_IN_ID,
          docto_in_det_id: m.DOCTO_IN_DET_ID,

          fecha: m.FECHA,
          ano: fecha.getFullYear(),
          mes: fecha.getMonth() + 1,

          tienda_id: m.TIENDA_ID,
          almacen_id: m.ALMACEN_ID,
          articulo_id: m.ARTICULO_ID,
          sku: m.SKU ? String(m.SKU).trim() : null,

          tipo_movimiento: tipoMovimiento,
          concepto_movimiento: m.CONCEPTO_MOVIMIENTO?.trim() || null,
          folio: m.FOLIO ? String(m.FOLIO).trim() : null,

          cantidad: Number(m.CANTIDAD),
          costo_unitario: Number(m.COSTO_UNITARIO) || 0,
          costo_total: Number(m.COSTO_TOTAL) || 0
        };
      });

      const { error } = await supabase
        .schema('devcompras')
        .from('doctos_in_det')
        .upsert(records, { onConflict: 'docto_in_id,docto_in_det_id' });

      if (error) {
        console.error(`❌ Error en batch ${i}-${i + batchSize}:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }

      if ((i + batchSize) % 1000 === 0) {
        console.log(`📊 Procesados ${i + batchSize} / ${movimientos.length} movimientos`);
      }
    }

    await completeSyncLog(logId, {
      records_processed: movimientos.length,
      records_inserted: inserted,
      records_failed: failed
    });

    console.log(`✅ [ETL] Movimientos sincronizados: ${inserted} OK, ${failed} errores`);

    return { success: true, inserted, failed, total: movimientos.length };

  } catch (error) {
    console.error('❌ [ETL] Error al sincronizar movimientos:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// SYNC: INVENTARIO ACTUAL (EXISTENCIAS)
// ============================================

async function syncInventarioActual() {
  const logId = await createSyncLog('inventario_actual');

  try {
    console.log('🔄 [ETL] Calculando inventario actual desde Microsip...');

    const sql = `
      SELECT
        ex.SUCURSAL_ID as TIENDA_ID,
        ex.ALMACEN_ID,
        ex.ARTICULO_ID,
        art.CLAVE_ARTICULO as SKU,
        ex.EXISTENCIA,
        ex.EXISTENCIA_COMPROMETIDA,
        (ex.EXISTENCIA - COALESCE(ex.EXISTENCIA_COMPROMETIDA, 0)) as EXISTENCIA_DISPONIBLE,
        art.COSTO_PROMEDIO,
        (ex.EXISTENCIA * art.COSTO_PROMEDIO) as VALOR_INVENTARIO
      FROM EXISTENCIAS ex
      INNER JOIN ARTICULOS art ON ex.ARTICULO_ID = art.ARTICULO_ID
      WHERE ex.EXISTENCIA > 0
      ORDER BY ex.SUCURSAL_ID, ex.ARTICULO_ID
    `;

    const existencias = await firebird.queryAsync(sql);
    console.log(`📦 Encontrados ${existencias.length} registros de inventario`);

    // Calcular ventas últimos 30 y 90 días por producto/tienda
    console.log('📊 Calculando métricas de rotación...');

    const fecha30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fecha90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const fechaHoy = new Date().toISOString().split('T')[0];

    // Obtener ventas agregadas desde Supabase (más rápido que Microsip)
    const { data: ventas30d } = await supabase
      .schema('devcompras')
      .from('doctos_pv_det')
      .select('tienda_id, articulo_id, cantidad_neta')
      .gte('fecha', fecha30d)
      .lte('fecha', fechaHoy);

    const { data: ventas90d } = await supabase
      .schema('devcompras')
      .from('doctos_pv_det')
      .select('tienda_id, articulo_id, cantidad_neta')
      .gte('fecha', fecha90d)
      .lte('fecha', fechaHoy);

    // Agregar ventas por tienda + producto
    const ventasMap30d = {};
    const ventasMap90d = {};

    if (ventas30d) {
      ventas30d.forEach(v => {
        const key = `${v.tienda_id}_${v.articulo_id}`;
        ventasMap30d[key] = (ventasMap30d[key] || 0) + Number(v.cantidad_neta);
      });
    }

    if (ventas90d) {
      ventas90d.forEach(v => {
        const key = `${v.tienda_id}_${v.articulo_id}`;
        ventasMap90d[key] = (ventasMap90d[key] || 0) + Number(v.cantidad_neta);
      });
    }

    let inserted = 0;
    let failed = 0;
    const batchSize = 500;

    for (let i = 0; i < existencias.length; i += batchSize) {
      const batch = existencias.slice(i, i + batchSize);

      const records = batch.map(ex => {
        const key = `${ex.TIENDA_ID}_${ex.ARTICULO_ID}`;
        const ventas30 = ventasMap30d[key] || 0;
        const ventas90 = ventasMap90d[key] || 0;
        const existencia = Number(ex.EXISTENCIA_DISPONIBLE) || 0;

        // Calcular días de inventario: (Existencia / Ventas diarias promedio)
        const ventasDiariasPromedio = ventas30 / 30;
        const diasInventario = ventasDiariasPromedio > 0 ? Math.round(existencia / ventasDiariasPromedio) : 999;

        // Calcular rotación anual: (Ventas 90 días * 4) / Existencia
        const ventasAnualesEstimadas = ventas90 * 4;
        const rotacionAnual = existencia > 0 ? Number((ventasAnualesEstimadas / existencia).toFixed(2)) : 0;

        return {
          tienda_id: ex.TIENDA_ID,
          almacen_id: ex.ALMACEN_ID,
          articulo_id: ex.ARTICULO_ID,
          sku: ex.SKU?.trim() || null,

          existencia: Number(ex.EXISTENCIA),
          existencia_comprometida: Number(ex.EXISTENCIA_COMPROMETIDA) || 0,
          existencia_disponible: existencia,
          costo_promedio: Number(ex.COSTO_PROMEDIO) || 0,
          valor_inventario: Number(ex.VALOR_INVENTARIO) || 0,

          ventas_ultimos_30dias: ventas30,
          ventas_ultimos_90dias: ventas90,
          dias_inventario: diasInventario,
          rotacion_anual: rotacionAnual,

          fecha_actualizacion: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .schema('devcompras')
        .from('existencias')
        .upsert(records, { onConflict: 'tienda_id,almacen_id,articulo_id' });

      if (error) {
        console.error(`❌ Error en batch ${i}-${i + batchSize}:`, error.message);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }

      if ((i + batchSize) % 1000 === 0) {
        console.log(`📊 Procesados ${i + batchSize} / ${existencias.length} registros de inventario`);
      }
    }

    await completeSyncLog(logId, {
      records_processed: existencias.length,
      records_inserted: inserted,
      records_failed: failed
    });

    console.log(`✅ [ETL] Inventario actual sincronizado: ${inserted} OK, ${failed} errores`);

    return { success: true, inserted, failed, total: existencias.length };

  } catch (error) {
    console.error('❌ [ETL] Error al sincronizar inventario actual:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// SYNC: FULL (Todo)
// ============================================

async function syncFull(diasVentas = 90) {
  const logId = await createSyncLog('full');

  try {
    console.log('\n🚀 [ETL] Iniciando sincronización COMPLETA Microsip → Supabase\n');

    const results = {
      categorias: null,
      tiendas: null,
      productos: null,
      precios: null,
      ventas: null,
      movimientos: null,
      inventario: null
    };

    // 1. Categorías
    console.log('\n═══════════════════════════════════════════════════════');
    results.categorias = await syncCategorias();

    // 2. Tiendas
    console.log('\n═══════════════════════════════════════════════════════');
    results.tiendas = await syncTiendas();

    // 3. Productos
    console.log('\n═══════════════════════════════════════════════════════');
    results.productos = await syncProductos();

    // 4. Precios
    console.log('\n═══════════════════════════════════════════════════════');
    results.precios = await syncPrecios();

    // 5. Ventas (últimos X días)
    console.log('\n═══════════════════════════════════════════════════════');
    const fechaFin = new Date().toISOString().split('T')[0];
    const fechaInicio = new Date(Date.now() - diasVentas * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    results.ventas = await syncVentas(fechaInicio, fechaFin);

    // 6. Movimientos de Inventario (mismo rango que ventas)
    console.log('\n═══════════════════════════════════════════════════════');
    results.movimientos = await syncInventarioMovimientos(fechaInicio, fechaFin);

    // 7. Inventario Actual
    console.log('\n═══════════════════════════════════════════════════════');
    results.inventario = await syncInventarioActual();

    // 8. Refrescar vistas materializadas
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔄 [ETL] Refrescando vistas materializadas...');
    await supabase.schema('devcompras').rpc('refresh_all_materialized_views');
    console.log('✅ [ETL] Vistas materializadas actualizadas');

    await completeSyncLog(logId, {
      records_processed: Object.values(results).reduce((sum, r) => sum + (r?.total || 0), 0),
      records_inserted: Object.values(results).reduce((sum, r) => sum + (r?.inserted || 0), 0)
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 [ETL] SINCRONIZACIÓN COMPLETA FINALIZADA');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 RESUMEN:');
    console.log(`   Categorías:    ${results.categorias.inserted} registros`);
    console.log(`   Tiendas:       ${results.tiendas.inserted} registros`);
    console.log(`   Productos:     ${results.productos.inserted} registros`);
    console.log(`   Precios:       ${results.precios.inserted} registros`);
    console.log(`   Ventas:        ${results.ventas.inserted} registros`);
    console.log(`   Movimientos:   ${results.movimientos.inserted} registros`);
    console.log(`   Inventario:    ${results.inventario.inserted} registros`);
    console.log('\n═══════════════════════════════════════════════════════\n');

    return { success: true, results };

  } catch (error) {
    console.error('❌ [ETL] Error en sincronización completa:', error);
    await failSyncLog(logId, error);
    throw error;
  }
}

// ============================================
// UTILIDAD: Calcular número de semana
// ============================================

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

module.exports = {
  syncCategorias,
  syncProductos,
  syncPrecios,
  syncTiendas,
  syncVentas,
  syncInventarioMovimientos,
  syncInventarioActual,
  syncFull
};
