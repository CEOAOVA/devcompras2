-- ============================================
-- SCHEMA SUPABASE - EMBLER ANALYTICS
-- ============================================
-- Objetivo: Extraer datos de Microsip y almacenarlos en Supabase
-- para análisis rápido de ventas, inventario y catálogo
-- ============================================

-- Crear esquema dedicado para evitar conflictos con public
CREATE SCHEMA IF NOT EXISTS devcompras;

-- Drop existing tables in devcompras if they exist (for clean setup)
DROP TABLE IF EXISTS devcompras.DOCTOS_PV_DET CASCADE;
DROP TABLE IF EXISTS devcompras.DOCTOS_IN_DET CASCADE;
DROP TABLE IF EXISTS devcompras.EXISTENCIAS CASCADE;
DROP TABLE IF EXISTS devcompras.ARTICULOS CASCADE;
DROP TABLE IF EXISTS devcompras.LINEAS_ARTICULOS CASCADE;
DROP TABLE IF EXISTS devcompras.SUCURSALES CASCADE;
DROP TABLE IF EXISTS devcompras.PRECIOS_ARTICULOS CASCADE;
DROP TABLE IF EXISTS devcompras.etl_sync_log CASCADE;

-- ============================================
-- 1. CATÁLOGO: CATEGORÍAS (LINEAS_ARTICULOS)
-- ============================================
CREATE TABLE devcompras.LINEAS_ARTICULOS (
  categoria_id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  total_productos INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lineas_nombre ON devcompras.LINEAS_ARTICULOS(nombre);

COMMENT ON TABLE devcompras.LINEAS_ARTICULOS IS 'Líneas/categorías de productos desde LINEAS_ARTICULOS';

-- ============================================
-- 2. CATÁLOGO: PRODUCTOS (ARTICULOS)
-- ============================================
CREATE TABLE devcompras.ARTICULOS (
  articulo_id INTEGER PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  categoria_id VARCHAR(10) REFERENCES devcompras.LINEAS_ARTICULOS(categoria_id),
  tipo VARCHAR(50),
  tipo_id INTEGER,
  familia_id INTEGER,
  grupo_id INTEGER,
  unidad_venta VARCHAR(10),
  codigo_barras VARCHAR(50),
  peso DECIMAL(10, 4) DEFAULT 0,
  volumen DECIMAL(10, 4) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  costo_ultima_compra DECIMAL(12, 2) DEFAULT 0,
  costo_promedio DECIMAL(12, 2) DEFAULT 0,
  precio_lista DECIMAL(12, 2) DEFAULT 0,
  ultimo_costo DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_articulos_sku ON devcompras.ARTICULOS(sku);
CREATE INDEX idx_articulos_categoria ON devcompras.ARTICULOS(categoria_id);
CREATE INDEX idx_articulos_activo ON devcompras.ARTICULOS(activo);
CREATE INDEX idx_articulos_nombre ON devcompras.ARTICULOS USING gin(to_tsvector('spanish', nombre));

COMMENT ON TABLE devcompras.ARTICULOS IS 'Catálogo de productos desde ARTICULOS';

-- ============================================
-- 3. CATÁLOGO: PRECIOS POR LISTA (PRECIOS_ARTICULOS)
-- ============================================
CREATE TABLE devcompras.PRECIOS_ARTICULOS (
  id SERIAL PRIMARY KEY,
  articulo_id INTEGER REFERENCES devcompras.ARTICULOS(articulo_id) ON DELETE CASCADE,
  lista_precios_id INTEGER NOT NULL,
  nombre_lista VARCHAR(100),
  precio DECIMAL(12, 2) NOT NULL,
  unidad VARCHAR(10),
  tipo_cambio DECIMAL(10, 4) DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(articulo_id, lista_precios_id)
);

CREATE INDEX idx_precios_articulo ON devcompras.PRECIOS_ARTICULOS(articulo_id);
CREATE INDEX idx_precios_lista ON devcompras.PRECIOS_ARTICULOS(lista_precios_id);

COMMENT ON TABLE devcompras.PRECIOS_ARTICULOS IS 'Precios por lista desde PRECIOS_ARTICULOS';

-- ============================================
-- 4. MAESTRO: TIENDAS/SUCURSALES (SUCURSALES)
-- ============================================
CREATE TABLE devcompras.SUCURSALES (
  sucursal_id VARCHAR(10) PRIMARY KEY,
  nombre VARCHAR(100),
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(50),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sucursales_activo ON devcompras.SUCURSALES(activo);

COMMENT ON TABLE devcompras.SUCURSALES IS 'Catálogo de sucursales/tiendas desde SUCURSALES';

-- ============================================
-- 5. FACT TABLE: VENTAS (DOCTOS_PV_DET)
-- ============================================
CREATE TABLE devcompras.DOCTOS_PV_DET (
  id BIGSERIAL PRIMARY KEY,

  -- IDs de Microsip
  docto_pv_id INTEGER NOT NULL,
  docto_pv_det_id INTEGER NOT NULL,

  -- Dimensiones de tiempo
  fecha DATE NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  dia INTEGER NOT NULL,
  semana INTEGER NOT NULL,

  -- Dimensiones de negocio
  tienda_id VARCHAR(10) REFERENCES devcompras.SUCURSALES(sucursal_id),
  articulo_id INTEGER REFERENCES devcompras.ARTICULOS(articulo_id),
  sku VARCHAR(50),
  ticket_id VARCHAR(50),
  cliente_id INTEGER,
  vendedor_id VARCHAR(20),
  almacen_id INTEGER,

  -- Métricas de cantidad
  cantidad DECIMAL(12, 4) NOT NULL,
  cantidad_devuelta DECIMAL(12, 4) DEFAULT 0,
  cantidad_neta DECIMAL(12, 4) NOT NULL,

  -- Métricas de precio
  precio_unitario DECIMAL(12, 2) NOT NULL,
  precio_con_iva DECIMAL(12, 2) NOT NULL,
  impuesto DECIMAL(12, 2) DEFAULT 0,
  total_partida DECIMAL(12, 2) NOT NULL,

  -- Métricas calculadas (para análisis de rentabilidad)
  costo_unitario DECIMAL(12, 2) DEFAULT 0,
  margen_unitario DECIMAL(12, 2) DEFAULT 0,
  margen_total DECIMAL(12, 2) DEFAULT 0,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint único para evitar duplicados
  UNIQUE(docto_pv_id, docto_pv_det_id)
);

-- Índices para optimizar consultas
CREATE INDEX idx_ventas_fecha ON devcompras.DOCTOS_PV_DET(fecha DESC);
CREATE INDEX idx_ventas_ano_mes ON devcompras.DOCTOS_PV_DET(ano, mes);
CREATE INDEX idx_ventas_tienda ON devcompras.DOCTOS_PV_DET(tienda_id);
CREATE INDEX idx_ventas_articulo ON devcompras.DOCTOS_PV_DET(articulo_id);
CREATE INDEX idx_ventas_sku ON devcompras.DOCTOS_PV_DET(sku);
CREATE INDEX idx_ventas_ticket ON devcompras.DOCTOS_PV_DET(ticket_id);
CREATE INDEX idx_ventas_fecha_tienda ON devcompras.DOCTOS_PV_DET(fecha, tienda_id);
CREATE INDEX idx_ventas_fecha_articulo ON devcompras.DOCTOS_PV_DET(fecha, articulo_id);

COMMENT ON TABLE devcompras.DOCTOS_PV_DET IS 'Fact table de ventas desde DOCTOS_PV + DOCTOS_PV_DET';

-- ============================================
-- 6. INVENTARIO: MOVIMIENTOS (DOCTOS_IN_DET)
-- ============================================
CREATE TABLE devcompras.DOCTOS_IN_DET (
  id BIGSERIAL PRIMARY KEY,

  -- IDs de Microsip
  docto_in_id INTEGER NOT NULL,
  docto_in_det_id INTEGER NOT NULL,

  -- Dimensiones de tiempo
  fecha DATE NOT NULL,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,

  -- Dimensiones de negocio
  tienda_id VARCHAR(10) REFERENCES devcompras.SUCURSALES(sucursal_id),
  almacen_id INTEGER,
  articulo_id INTEGER REFERENCES devcompras.ARTICULOS(articulo_id),
  sku VARCHAR(50),

  -- Tipo de movimiento
  tipo_movimiento VARCHAR(50), -- Entrada, Salida, Ajuste, Transferencia
  concepto_movimiento VARCHAR(100),
  folio VARCHAR(50),

  -- Métricas
  cantidad DECIMAL(12, 4) NOT NULL,
  costo_unitario DECIMAL(12, 2) DEFAULT 0,
  costo_total DECIMAL(12, 2) DEFAULT 0,

  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint único
  UNIQUE(docto_in_id, docto_in_det_id)
);

-- Índices
CREATE INDEX idx_inv_mov_fecha ON devcompras.DOCTOS_IN_DET(fecha DESC);
CREATE INDEX idx_inv_mov_tienda ON devcompras.DOCTOS_IN_DET(tienda_id);
CREATE INDEX idx_inv_mov_articulo ON devcompras.DOCTOS_IN_DET(articulo_id);
CREATE INDEX idx_inv_mov_sku ON devcompras.DOCTOS_IN_DET(sku);
CREATE INDEX idx_inv_mov_tipo ON devcompras.DOCTOS_IN_DET(tipo_movimiento);

COMMENT ON TABLE devcompras.DOCTOS_IN_DET IS 'Movimientos de inventario desde DOCTOS_IN + DOCTOS_IN_DET';

-- ============================================
-- 7. INVENTARIO: EXISTENCIAS ACTUALES (EXISTENCIAS)
-- ============================================
CREATE TABLE devcompras.EXISTENCIAS (
  id BIGSERIAL PRIMARY KEY,

  -- Dimensiones
  tienda_id VARCHAR(10) REFERENCES devcompras.SUCURSALES(sucursal_id),
  almacen_id INTEGER,
  articulo_id INTEGER REFERENCES devcompras.ARTICULOS(articulo_id),
  sku VARCHAR(50),

  -- Métricas de inventario
  existencia DECIMAL(12, 4) DEFAULT 0,
  existencia_comprometida DECIMAL(12, 4) DEFAULT 0,
  existencia_disponible DECIMAL(12, 4) DEFAULT 0,
  costo_promedio DECIMAL(12, 2) DEFAULT 0,
  valor_inventario DECIMAL(12, 2) DEFAULT 0,

  -- Métricas de rotación (calculadas)
  ventas_ultimos_30dias DECIMAL(12, 4) DEFAULT 0,
  ventas_ultimos_90dias DECIMAL(12, 4) DEFAULT 0,
  dias_inventario INTEGER DEFAULT 0,
  rotacion_anual DECIMAL(10, 2) DEFAULT 0,

  -- Última actualización
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint único por tienda/almacén/producto
  UNIQUE(tienda_id, almacen_id, articulo_id)
);

-- Índices
CREATE INDEX idx_existencias_tienda ON devcompras.EXISTENCIAS(tienda_id);
CREATE INDEX idx_existencias_articulo ON devcompras.EXISTENCIAS(articulo_id);
CREATE INDEX idx_existencias_sku ON devcompras.EXISTENCIAS(sku);
CREATE INDEX idx_existencias_dias_inv ON devcompras.EXISTENCIAS(dias_inventario);
CREATE INDEX idx_existencias_existencia ON devcompras.EXISTENCIAS(existencia);

COMMENT ON TABLE devcompras.EXISTENCIAS IS 'Snapshot de existencias actuales + métricas de rotación';

-- ============================================
-- 8. ETL: LOG DE SINCRONIZACIÓN
-- ============================================
CREATE TABLE devcompras.etl_sync_log (
  id BIGSERIAL PRIMARY KEY,

  -- Tipo de sincronización
  sync_type VARCHAR(50) NOT NULL, -- 'productos', 'ventas', 'inventario', 'categorias', 'full'

  -- Estado
  status VARCHAR(20) NOT NULL, -- 'running', 'success', 'error'

  -- Métricas
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Rango de fechas (para ventas e inventario)
  fecha_inicio DATE,
  fecha_fin DATE,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,

  -- Errores
  error_message TEXT,
  error_details JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sync_log_type ON devcompras.etl_sync_log(sync_type);
CREATE INDEX idx_sync_log_status ON devcompras.etl_sync_log(status);
CREATE INDEX idx_sync_log_started ON devcompras.etl_sync_log(started_at DESC);

COMMENT ON TABLE devcompras.etl_sync_log IS 'Log de sincronizaciones ETL Microsip → Supabase';

-- ============================================
-- 9. FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION devcompras.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_lineas_updated_at BEFORE UPDATE ON devcompras.LINEAS_ARTICULOS
  FOR EACH ROW EXECUTE FUNCTION devcompras.update_updated_at_column();

CREATE TRIGGER update_articulos_updated_at BEFORE UPDATE ON devcompras.ARTICULOS
  FOR EACH ROW EXECUTE FUNCTION devcompras.update_updated_at_column();

CREATE TRIGGER update_sucursales_updated_at BEFORE UPDATE ON devcompras.SUCURSALES
  FOR EACH ROW EXECUTE FUNCTION devcompras.update_updated_at_column();

CREATE TRIGGER update_doctos_pv_det_updated_at BEFORE UPDATE ON devcompras.DOCTOS_PV_DET
  FOR EACH ROW EXECUTE FUNCTION devcompras.update_updated_at_column();

CREATE TRIGGER update_existencias_updated_at BEFORE UPDATE ON devcompras.EXISTENCIAS
  FOR EACH ROW EXECUTE FUNCTION devcompras.update_updated_at_column();

-- ============================================
-- 10. VISTAS MATERIALIZADAS (Para análisis rápido)
-- ============================================

-- Vista: Ventas por día
CREATE MATERIALIZED VIEW devcompras.mv_ventas_por_dia AS
SELECT
  fecha,
  COUNT(DISTINCT ticket_id) as total_tickets,
  COUNT(*) as total_partidas,
  SUM(cantidad_neta) as unidades_vendidas,
  SUM(total_partida) as ingresos_totales,
  COUNT(DISTINCT tienda_id) as tiendas_activas,
  COUNT(DISTINCT articulo_id) as productos_vendidos
FROM devcompras.DOCTOS_PV_DET
GROUP BY fecha
ORDER BY fecha DESC;

CREATE UNIQUE INDEX idx_mv_ventas_dia ON devcompras.mv_ventas_por_dia(fecha);

-- Vista: Top productos por ventas (últimos 30 días)
CREATE MATERIALIZED VIEW devcompras.mv_top_productos_30d AS
SELECT
  p.articulo_id,
  p.sku,
  p.nombre,
  p.categoria_id,
  SUM(fv.cantidad_neta) as cantidad_vendida,
  SUM(fv.total_partida) as ingresos_totales,
  COUNT(DISTINCT fv.ticket_id) as num_tickets,
  AVG(fv.precio_unitario) as precio_promedio
FROM devcompras.DOCTOS_PV_DET fv
INNER JOIN devcompras.ARTICULOS p ON fv.articulo_id = p.articulo_id
WHERE fv.fecha >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.articulo_id, p.sku, p.nombre, p.categoria_id
ORDER BY cantidad_vendida DESC
LIMIT 100;

CREATE UNIQUE INDEX idx_mv_top_productos ON devcompras.mv_top_productos_30d(articulo_id);

-- Vista: Inventario crítico (días < 30)
CREATE MATERIALIZED VIEW devcompras.mv_inventario_critico AS
SELECT
  ia.tienda_id,
  ia.articulo_id,
  p.sku,
  p.nombre,
  p.categoria_id,
  ia.existencia,
  ia.existencia_disponible,
  ia.ventas_ultimos_30dias,
  ia.dias_inventario,
  ia.rotacion_anual,
  ia.valor_inventario
FROM devcompras.EXISTENCIAS ia
INNER JOIN devcompras.ARTICULOS p ON ia.articulo_id = p.articulo_id
WHERE ia.dias_inventario < 30
  AND ia.existencia_disponible > 0
ORDER BY ia.dias_inventario ASC;

CREATE INDEX idx_mv_inv_critico_tienda ON devcompras.mv_inventario_critico(tienda_id);
CREATE INDEX idx_mv_inv_critico_articulo ON devcompras.mv_inventario_critico(articulo_id);

-- ============================================
-- 11. ROW LEVEL SECURITY (RLS) - Opcional
-- ============================================

-- Habilitar RLS en tablas (descomentar si se requiere)
-- ALTER TABLE devcompras.DOCTOS_PV_DET ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE devcompras.EXISTENCIAS ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE devcompras.ARTICULOS ENABLE ROW LEVEL SECURITY;

-- Políticas de ejemplo (ajustar según necesidades)
-- CREATE POLICY "Permitir lectura a usuarios autenticados" ON devcompras.DOCTOS_PV_DET
--   FOR SELECT TO authenticated USING (true);

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

-- Función para refrescar todas las vistas materializadas
CREATE OR REPLACE FUNCTION devcompras.refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY devcompras.mv_ventas_por_dia;
  REFRESH MATERIALIZED VIEW CONCURRENTLY devcompras.mv_top_productos_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY devcompras.mv_inventario_critico;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION devcompras.refresh_all_materialized_views() IS 'Refresca todas las vistas materializadas de análisis';
