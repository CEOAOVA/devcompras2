# 📋 Plan Completo: Sistema ETL Microsip → Supabase

**Objetivo:** Extraer TODA la información histórica de Microsip (2020-presente) y almacenarla en Supabase para consultas ultra-rápidas, con actualización automática cada hora.

**Fecha de Implementación:** 2025-01-24
**Proyecto Supabase:** devwhats-phase1-clean (akcwnfrstqdpumzywzxv)

---

## 🎯 PROBLEMA A RESOLVER

### Situación Actual:
- ❌ **VW_FACT_VENTAS en Microsip tarda 8+ segundos** por query
- ❌ Queries analíticas resultan en **timeouts**
- ❌ Dashboard de ventas **inutilizable** por lentitud
- ❌ No hay cálculo de **días de inventario** ni **rotación anual**
- ❌ Imposible hacer análisis histórico de años pasados

### Solución Propuesta:
- ✅ **Extraer toda la data histórica** (2020-presente) → Supabase
- ✅ **Queries en < 100ms** (100-300x más rápido)
- ✅ **Actualización automática cada hora** vía Task Scheduler
- ✅ Nuevas métricas: **días de inventario**, **rotación anual**
- ✅ Vistas materializadas pre-calculadas para dashboards

---

## 📊 ARQUITECTURA DEL SISTEMA

### Flujo de Datos:

```
┌─────────────────────────────────────────────────────────────────┐
│                         MICROSIP (Firebird)                      │
│                                                                  │
│  - DOCTOS_PV (Ventas)                                           │
│  - DOCTOS_PV_DET (Partidas)                                     │
│  - ARTICULOS (Productos)                                        │
│  - CATEGORIAS                                                   │
│  - SUCURSALES (Tiendas)                                         │
│  - EXIST_DEPOSITO (Inventario)                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           │ ETL (Node.js)
                           │ node-firebird + @supabase/supabase-js
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE (PostgreSQL)                       │
│                                                                  │
│  Schema: microsip                                               │
│                                                                  │
│  📦 TABLAS DIMENSIONALES (Catálogo):                            │
│     - microsip.categorias (~50 registros)                       │
│     - microsip.productos (~5,000 registros)                     │
│     - microsip.precios_productos (~15,000 registros)            │
│     - microsip.tiendas (~10 registros)                          │
│                                                                  │
│  📊 TABLAS DE HECHOS (Transaccional):                           │
│     - microsip.fact_ventas (~115,000 registros) 🔥             │
│     - microsip.inventario_movimientos (millones potenciales)    │
│     - microsip.inventario_actual (~8,000 registros)             │
│                                                                  │
│  🔍 VISTAS MATERIALIZADAS (Pre-calculadas):                     │
│     - microsip.mv_ventas_por_dia                                │
│     - microsip.mv_top_productos_30d                             │
│     - microsip.mv_inventario_critico                            │
│                                                                  │
│  📝 AUDITORÍA:                                                  │
│     - microsip.etl_sync_log (log de sincronizaciones)           │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Supabase Client
                           │ @supabase/supabase-js
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APLICACIÓN / DASHBOARD                        │
│                                                                  │
│  - KPIs en tiempo real (< 50ms)                                 │
│  - Top productos (< 30ms)                                       │
│  - Inventario crítico (< 80ms)                                  │
│  - Tendencias históricas (< 100ms)                              │
└─────────────────────────────────────────────────────────────────┘
```

### Sincronización:

```
┌──────────────────────────────────────────────────────────────────┐
│                     SINCRONIZACIÓN INICIAL                        │
│                     (Una sola vez - 1-2 horas)                   │
│                                                                   │
│  sync-historical.js all                                          │
│  ├── Catálogo (1 vez)                                            │
│  │   ├── Categorías                                              │
│  │   ├── Tiendas                                                 │
│  │   └── Productos + Precios                                     │
│  │                                                                │
│  └── Ventas por año                                              │
│      ├── 2020 (~18,000 registros)                                │
│      ├── 2021 (~19,000 registros)                                │
│      ├── 2022 (~20,000 registros)                                │
│      ├── 2023 (~22,000 registros)                                │
│      ├── 2024 (~21,000 registros)                                │
│      └── 2025 YTD (~15,000 registros)                            │
│                                                                   │
│  Total: ~115,000 registros de ventas históricas                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                  SINCRONIZACIÓN HORARIA                           │
│                  (Automática vía Task Scheduler)                 │
│                                                                   │
│  sync-hourly.js (cada hora)                                      │
│  ├── Ventas de la última hora                                    │
│  │   └── Consulta DOCTOS_PV + JOIN                               │
│  │       WHERE fecha >= HACE_1_HORA                               │
│  │                                                                │
│  └── Inventario actual (snapshot completo)                       │
│      ├── Existencia por tienda/almacén                           │
│      ├── Costo promedio                                          │
│      ├── Ventas últimos 30 días                                  │
│      ├── Días de inventario calculado                            │
│      └── Rotación anual calculada                                │
│                                                                   │
│  Duración: ~10-30 segundos                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ MODELO DE DATOS DETALLADO

### 1. TABLAS DIMENSIONALES (Catálogo)

#### `microsip.categorias`
**Propósito:** Clasificación de productos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| categoria_id | VARCHAR(10) PK | ID único de categoría |
| nombre | VARCHAR(100) | Nombre de la categoría |
| descripcion | TEXT | Descripción detallada |
| total_productos | INTEGER | Contador de productos |
| activo | BOOLEAN | Estado de la categoría |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

**Fuente en Microsip:** Tabla `CATEGORIAS`

**Índices:**
- PK en `categoria_id`
- INDEX en `activo`

---

#### `microsip.productos`
**Propósito:** Catálogo maestro de productos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| articulo_id | INTEGER PK | ID único de Microsip |
| sku | VARCHAR(50) UNIQUE | Código SKU del producto |
| nombre | VARCHAR(200) | Nombre del producto |
| descripcion | TEXT | Descripción completa |
| categoria_id | VARCHAR(10) FK | Referencia a categoría |
| unidad_venta | VARCHAR(10) | Unidad (PZ, KG, etc.) |
| costo | DECIMAL(12,2) | Costo actual |
| precio_lista | DECIMAL(12,2) | Precio de lista |
| tipo_articulo | VARCHAR(20) | Tipo (PRODUCTO, SERVICIO) |
| es_kit | BOOLEAN | Si es un kit o conjunto |
| linea | VARCHAR(50) | Línea de producto |
| activo | BOOLEAN | Estado del producto |
| fecha_alta | DATE | Fecha de alta en sistema |
| created_at | TIMESTAMP | Fecha de creación en ETL |
| updated_at | TIMESTAMP | Última actualización en ETL |

**Fuente en Microsip:** Tabla `ARTICULOS`

**Índices:**
- PK en `articulo_id`
- UNIQUE en `sku`
- INDEX en `categoria_id`
- INDEX en `activo`
- INDEX en `created_at`

---

#### `microsip.precios_productos`
**Propósito:** Múltiples listas de precios por producto

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | ID autoincremental |
| articulo_id | INTEGER FK | Referencia a producto |
| lista_precios_id | INTEGER | ID de lista de precios |
| precio | DECIMAL(12,2) | Precio en esta lista |
| moneda | VARCHAR(3) | Moneda (MXN, USD) |
| factor | DECIMAL(10,4) | Factor de conversión |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

**Fuente en Microsip:** Tabla `PRECIOS_ART` o vista relacionada

**Índices:**
- PK en `id`
- INDEX en `articulo_id`
- INDEX en `lista_precios_id`

---

#### `microsip.tiendas`
**Propósito:** Catálogo de sucursales/tiendas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| sucursal_id | VARCHAR(10) PK | ID de sucursal |
| nombre | VARCHAR(100) | Nombre de la tienda |
| direccion | TEXT | Dirección completa |
| ciudad | VARCHAR(100) | Ciudad |
| estado | VARCHAR(50) | Estado |
| telefono | VARCHAR(20) | Teléfono |
| activo | BOOLEAN | Estado de la tienda |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

**Fuente en Microsip:** Tabla `SUCURSALES`

**Índices:**
- PK en `sucursal_id`
- INDEX en `activo`

---

### 2. TABLAS DE HECHOS (Transaccional)

#### `microsip.fact_ventas` 🔥 TABLA PRINCIPAL
**Propósito:** Fact table con todas las partidas de ventas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| **IDs y Referencias** | | |
| id | BIGSERIAL PK | ID autoincremental |
| docto_pv_id | INTEGER | ID del documento en Microsip |
| docto_pv_det_id | INTEGER | ID de la partida en Microsip |
| ticket_id | VARCHAR(50) | Folio del ticket |
| movimiento_id | INTEGER | ID del movimiento |
| **Dimensiones Temporales** | | |
| fecha | DATE | Fecha de la venta |
| ano | INTEGER | Año (2020-2025) |
| mes | INTEGER | Mes (1-12) |
| dia | INTEGER | Día del mes |
| semana | INTEGER | Semana del año |
| **Dimensiones de Negocio** | | |
| tienda_id | VARCHAR(10) FK | Sucursal que vendió |
| articulo_id | INTEGER FK | Producto vendido |
| cliente_id | INTEGER | ID del cliente |
| vendedor_id | INTEGER | ID del vendedor |
| **Métricas de Venta** | | |
| cantidad | DECIMAL(12,4) | Cantidad bruta |
| cantidad_neta | DECIMAL(12,4) | Cantidad neta (con devoluciones) |
| precio_unitario | DECIMAL(12,2) | Precio por unidad |
| total_partida | DECIMAL(12,2) | Total de la partida |
| costo_unitario | DECIMAL(12,2) | Costo unitario |
| costo_total | DECIMAL(12,2) | Costo total de la partida |
| utilidad_bruta | DECIMAL(12,2) | Utilidad (total - costo) |
| margen_porcentaje | DECIMAL(5,2) | Margen % |
| **Clasificación** | | |
| tipo_venta | VARCHAR(20) | NORMAL, DEVOLUCION, CANCELACION |
| es_contado | BOOLEAN | Si es venta de contado |
| **Auditoría** | | |
| created_at | TIMESTAMP | Fecha de creación en ETL |
| updated_at | TIMESTAMP | Última actualización en ETL |

**Fuente en Microsip:**
```sql
SELECT
  dpv.CLAVE as docto_pv_id,
  dpvd.CLAVE as docto_pv_det_id,
  dpv.FOLIO as ticket_id,
  dpvd.ARTICULO_ID as articulo_id,
  dpv.SUCURSAL_ID as tienda_id,
  dpv.FECHA as fecha,
  dpvd.CANTIDAD as cantidad,
  dpvd.PRECIO as precio_unitario,
  dpvd.IMPORTE as total_partida,
  -- ... más campos
FROM DOCTOS_PV dpv
INNER JOIN DOCTOS_PV_DET dpvd ON dpv.CLAVE = dpvd.DOCTO_PV_ID
WHERE dpv.FECHA BETWEEN ? AND ?
```

**Constraint único:** `(docto_pv_id, docto_pv_det_id)` para evitar duplicados

**Índices (8 total):**
1. PK en `id`
2. UNIQUE en `(docto_pv_id, docto_pv_det_id)`
3. INDEX en `fecha DESC` - Para queries por rango de fechas
4. INDEX en `(ano, mes)` - Para análisis mensual
5. INDEX en `(tienda_id, fecha)` - Ventas por tienda
6. INDEX en `(articulo_id, fecha)` - Ventas por producto
7. INDEX en `ticket_id` - Buscar tickets específicos
8. INDEX en `tipo_venta` - Filtrar por tipo

**Capacidad estimada:**
- 2020: ~18,000 registros
- 2021: ~19,000 registros
- 2022: ~20,000 registros
- 2023: ~22,000 registros
- 2024: ~21,000 registros
- 2025 YTD: ~15,000 registros
- **TOTAL: ~115,000 registros**

---

#### `microsip.inventario_movimientos`
**Propósito:** Historial de todos los movimientos de inventario

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGSERIAL PK | ID autoincremental |
| movimiento_id | INTEGER | ID del movimiento en Microsip |
| tienda_id | VARCHAR(10) FK | Sucursal |
| almacen_id | VARCHAR(10) | Almacén |
| articulo_id | INTEGER FK | Producto |
| tipo_movimiento | VARCHAR(50) | ENTRADA, SALIDA, AJUSTE, etc. |
| cantidad | DECIMAL(12,4) | Cantidad del movimiento |
| costo_unitario | DECIMAL(12,2) | Costo en el momento |
| fecha_movimiento | DATE | Fecha del movimiento |
| referencia | VARCHAR(100) | Referencia del documento |
| created_at | TIMESTAMP | Fecha de creación en ETL |

**Fuente en Microsip:** Tabla `MOVIMIENTOS` + `MOVTOS_DET`

**Índices:**
- PK en `id`
- INDEX en `(tienda_id, almacen_id, articulo_id)`
- INDEX en `fecha_movimiento`
- INDEX en `tipo_movimiento`

**Nota:** Esta tabla puede crecer a millones de registros si se carga historial completo. Se recomienda cargar solo lo necesario.

---

#### `microsip.inventario_actual` 📦
**Propósito:** Snapshot del inventario actual con métricas calculadas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGSERIAL PK | ID autoincremental |
| tienda_id | VARCHAR(10) FK | Sucursal |
| almacen_id | VARCHAR(10) | Almacén |
| articulo_id | INTEGER FK | Producto |
| **Stock** | | |
| existencia | DECIMAL(12,4) | Existencia física total |
| existencia_disponible | DECIMAL(12,4) | Disponible para venta |
| existencia_comprometida | DECIMAL(12,4) | Comprometida (pedidos) |
| existencia_transito | DECIMAL(12,4) | En tránsito |
| **Financiero** | | |
| costo_promedio | DECIMAL(12,2) | Costo promedio ponderado |
| valor_inventario | DECIMAL(12,2) | existencia × costo_promedio |
| **Métricas Calculadas 📊** | | |
| ventas_ultimos_30dias | DECIMAL(12,4) | Unidades vendidas últimos 30d |
| dias_inventario | INTEGER | Existencia / (Ventas30d/30) |
| rotacion_anual | DECIMAL(10,2) | (Ventas90d × 4) / Existencia |
| **Clasificación** | | |
| es_critico | BOOLEAN | dias_inventario < 30 |
| nivel_stock | VARCHAR(20) | CRITICO, BAJO, NORMAL, ALTO |
| **Auditoría** | | |
| fecha_actualizacion | DATE | Última actualización |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización en ETL |

**Fuente en Microsip:**
```sql
-- Existencias
SELECT * FROM EXIST_DEPOSITO

-- Ventas últimos 30 días (para cálculo)
SELECT
  ARTICULO_ID,
  SUCURSAL_ID,
  SUM(CANTIDAD) as ventas_30d
FROM DOCTOS_PV dpv
INNER JOIN DOCTOS_PV_DET dpvd ON dpv.CLAVE = dpvd.DOCTO_PV_ID
WHERE dpv.FECHA >= CURRENT_DATE - 30
GROUP BY ARTICULO_ID, SUCURSAL_ID
```

**Fórmulas:**
```javascript
// Días de inventario
dias_inventario = existencia_disponible / (ventas_ultimos_30dias / 30)

// Rotación anual
rotacion_anual = (ventas_ultimos_90dias * 4) / existencia_disponible

// Clasificación
es_critico = dias_inventario < 30
nivel_stock = {
  dias < 15: 'CRITICO',
  dias < 30: 'BAJO',
  dias < 90: 'NORMAL',
  dias >= 90: 'ALTO'
}
```

**Constraint único:** `(tienda_id, almacen_id, articulo_id)`

**Índices:**
- PK en `id`
- UNIQUE en `(tienda_id, almacen_id, articulo_id)`
- INDEX en `dias_inventario` - Para inventario crítico
- INDEX en `articulo_id`
- INDEX en `es_critico`

**Actualización:** Se actualiza completo en cada sincronización horaria

---

### 3. TABLA DE AUDITORÍA

#### `microsip.etl_sync_log`
**Propósito:** Log de todas las sincronizaciones ETL

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGSERIAL PK | ID autoincremental |
| sync_type | VARCHAR(50) | Tipo: 'categorias', 'productos', 'ventas', 'inventario' |
| status | VARCHAR(20) | Estado: 'success', 'error', 'in_progress' |
| records_processed | INTEGER | Total registros procesados |
| records_inserted | INTEGER | Registros insertados exitosamente |
| records_updated | INTEGER | Registros actualizados |
| records_failed | INTEGER | Registros con error |
| started_at | TIMESTAMP | Inicio de la sincronización |
| completed_at | TIMESTAMP | Fin de la sincronización |
| duration_seconds | INTEGER | Duración en segundos |
| error_message | TEXT | Mensaje de error si hay |
| error_details | JSONB | Detalles del error en JSON |
| params | JSONB | Parámetros de la sincronización |

**Índices:**
- PK en `id`
- INDEX en `sync_type`
- INDEX en `status`
- INDEX en `started_at DESC`

**Ejemplo de registro:**
```json
{
  "sync_type": "ventas",
  "status": "success",
  "records_processed": 150,
  "records_inserted": 148,
  "records_failed": 2,
  "started_at": "2025-01-24T14:00:00Z",
  "completed_at": "2025-01-24T14:00:12Z",
  "duration_seconds": 12,
  "params": {
    "fecha_inicio": "2025-01-24",
    "fecha_fin": "2025-01-24"
  }
}
```

---

### 4. VISTAS MATERIALIZADAS

#### `microsip.mv_ventas_por_dia`
**Propósito:** Agregación diaria para dashboards de tendencias

**Definición:**
```sql
CREATE MATERIALIZED VIEW microsip.mv_ventas_por_dia AS
SELECT
  fecha,
  COUNT(DISTINCT ticket_id) as total_tickets,
  COUNT(*) as total_partidas,
  SUM(cantidad_neta) as unidades_vendidas,
  SUM(total_partida) as ingresos_totales,
  AVG(total_partida) as ticket_promedio,
  COUNT(DISTINCT tienda_id) as tiendas_activas,
  COUNT(DISTINCT articulo_id) as productos_vendidos
FROM microsip.fact_ventas
GROUP BY fecha
ORDER BY fecha DESC;
```

**Índices:**
- INDEX en `fecha DESC`

**Actualización:** Después de cada sync de ventas
```sql
REFRESH MATERIALIZED VIEW microsip.mv_ventas_por_dia;
```

**Queries optimizadas:**
```sql
-- Ventas últimos 30 días
SELECT * FROM microsip.mv_ventas_por_dia
WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY fecha DESC;
-- ⚡ < 30ms
```

---

#### `microsip.mv_top_productos_30d`
**Propósito:** Top 100 productos más vendidos últimos 30 días

**Definición:**
```sql
CREATE MATERIALIZED VIEW microsip.mv_top_productos_30d AS
SELECT
  p.articulo_id,
  p.sku,
  p.nombre,
  p.categoria_id,
  c.nombre as categoria_nombre,
  SUM(fv.cantidad_neta) as cantidad_vendida,
  SUM(fv.total_partida) as ingresos_totales,
  COUNT(DISTINCT fv.ticket_id) as num_tickets,
  AVG(fv.precio_unitario) as precio_promedio
FROM microsip.fact_ventas fv
INNER JOIN microsip.productos p ON fv.articulo_id = p.articulo_id
LEFT JOIN microsip.categorias c ON p.categoria_id = c.categoria_id
WHERE fv.fecha >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.articulo_id, p.sku, p.nombre, p.categoria_id, c.nombre
ORDER BY cantidad_vendida DESC
LIMIT 100;
```

**Índices:**
- INDEX en `cantidad_vendida DESC`

**Actualización:** Diariamente o después de sync importante

**Queries optimizadas:**
```sql
-- Top 20 productos
SELECT * FROM microsip.mv_top_productos_30d
LIMIT 20;
-- ⚡ < 20ms
```

---

#### `microsip.mv_inventario_critico`
**Propósito:** Productos con inventario crítico (< 30 días)

**Definición:**
```sql
CREATE MATERIALIZED VIEW microsip.mv_inventario_critico AS
SELECT
  ia.tienda_id,
  t.nombre as tienda_nombre,
  ia.articulo_id,
  p.sku,
  p.nombre as producto_nombre,
  p.categoria_id,
  c.nombre as categoria_nombre,
  ia.existencia_disponible,
  ia.ventas_ultimos_30dias,
  ia.dias_inventario,
  ia.rotacion_anual,
  ia.costo_promedio,
  ia.valor_inventario,
  ia.nivel_stock
FROM microsip.inventario_actual ia
INNER JOIN microsip.productos p ON ia.articulo_id = p.articulo_id
LEFT JOIN microsip.categorias c ON p.categoria_id = c.categoria_id
LEFT JOIN microsip.tiendas t ON ia.tienda_id = t.sucursal_id
WHERE ia.dias_inventario < 30
  AND ia.existencia_disponible > 0
ORDER BY ia.dias_inventario ASC;
```

**Índices:**
- INDEX en `dias_inventario ASC`

**Actualización:** Después de cada sync de inventario

**Queries optimizadas:**
```sql
-- Top 50 productos críticos
SELECT * FROM microsip.mv_inventario_critico
ORDER BY dias_inventario ASC
LIMIT 50;
-- ⚡ < 50ms
```

---

## 🔄 PROCESO DE SINCRONIZACIÓN DETALLADO

### FASE 1: Carga Histórica (sync-historical.js)

**Objetivo:** Cargar TODOS los datos históricos desde 2020 hasta hoy

**Proceso paso a paso:**

```javascript
// 1. CATÁLOGO (Una sola vez)
async function syncCatalogo() {
  // 1.1 Categorías
  await syncCategorias();
  // SELECT * FROM CATEGORIAS
  // INSERT INTO microsip.categorias ON CONFLICT DO UPDATE

  // 1.2 Tiendas
  await syncTiendas();
  // SELECT * FROM SUCURSALES
  // INSERT INTO microsip.tiendas ON CONFLICT DO UPDATE

  // 1.3 Productos + Precios
  await syncProductos();
  // SELECT a.*, p.* FROM ARTICULOS a LEFT JOIN PRECIOS_ART p
  // INSERT INTO microsip.productos ON CONFLICT DO UPDATE
  // INSERT INTO microsip.precios_productos ON CONFLICT DO UPDATE
}

// 2. VENTAS POR AÑO (2020-2025)
for (let year = 2020; year <= 2025; year++) {
  await syncVentasYear(year);
  // SELECT dpv.*, dpvd.*
  // FROM DOCTOS_PV dpv
  // INNER JOIN DOCTOS_PV_DET dpvd ON dpv.CLAVE = dpvd.DOCTO_PV_ID
  // WHERE EXTRACT(YEAR FROM dpv.FECHA) = year
  //
  // Batch insert en lotes de 500:
  // INSERT INTO microsip.fact_ventas (...)
  // ON CONFLICT (docto_pv_id, docto_pv_det_id) DO UPDATE
}

// 3. INVENTARIO ACTUAL
await syncInventarioActual();
// SELECT ed.*, SUM(ventas_30d)
// FROM EXIST_DEPOSITO ed
// LEFT JOIN (
//   SELECT articulo_id, sucursal_id, SUM(cantidad) as ventas_30d
//   FROM fact_ventas
//   WHERE fecha >= CURRENT_DATE - 30
//   GROUP BY articulo_id, sucursal_id
// ) v ON ed.ARTICULO_ID = v.articulo_id
//
// Calcular:
// - dias_inventario = existencia / (ventas_30d / 30)
// - rotacion_anual = (ventas_90d * 4) / existencia
// - es_critico = dias_inventario < 30
//
// INSERT INTO microsip.inventario_actual ON CONFLICT DO UPDATE

// 4. REFRESCAR VISTAS MATERIALIZADAS
await refreshMaterializedViews();
// REFRESH MATERIALIZED VIEW microsip.mv_ventas_por_dia;
// REFRESH MATERIALIZED VIEW microsip.mv_top_productos_30d;
// REFRESH MATERIALIZED VIEW microsip.mv_inventario_critico;
```

**Tiempo estimado:**
- Catálogo: 2-5 minutos
- Ventas por año:
  - 2020: ~3 minutos
  - 2021: ~3 minutos
  - 2022: ~3 minutos
  - 2023: ~3 minutos
  - 2024: ~3 minutos
  - 2025 YTD: ~2 minutos
- Inventario: 5-10 minutos
- Refrescar vistas: 2-3 minutos

**TOTAL: 1-2 horas**

---

### FASE 2: Sincronización Horaria (sync-hourly.js)

**Objetivo:** Mantener Supabase actualizado con las ventas de la última hora

**Proceso paso a paso:**

```javascript
// 1. CALCULAR RANGO DE LA ÚLTIMA HORA
function getHourlyDateRange() {
  const ahora = new Date();
  const haceUnaHora = new Date(ahora.getTime() - 60 * 60 * 1000);

  // Si es la primera hora del día (00:00-01:00),
  // sincronizar desde medianoche
  if (ahora.getHours() === 0) {
    return {
      fechaInicio: ahora.toISOString().split('T')[0],
      fechaFin: ahora.toISOString().split('T')[0]
    };
  }

  return {
    fechaInicio: haceUnaHora.toISOString().split('T')[0],
    fechaFin: ahora.toISOString().split('T')[0]
  };
}

// 2. SINCRONIZAR VENTAS DE LA ÚLTIMA HORA
async function syncVentasHoraria() {
  const { fechaInicio, fechaFin } = getHourlyDateRange();

  // Query a Microsip
  const query = `
    SELECT
      dpv.CLAVE as docto_pv_id,
      dpvd.CLAVE as docto_pv_det_id,
      dpv.FOLIO as ticket_id,
      dpv.FECHA as fecha,
      dpv.SUCURSAL_ID as tienda_id,
      dpvd.ARTICULO_ID as articulo_id,
      dpvd.CANTIDAD as cantidad,
      dpvd.PRECIO as precio_unitario,
      dpvd.IMPORTE as total_partida
      -- ... más campos
    FROM DOCTOS_PV dpv
    INNER JOIN DOCTOS_PV_DET dpvd ON dpv.CLAVE = dpvd.DOCTO_PV_ID
    WHERE dpv.FECHA BETWEEN ? AND ?
  `;

  const ventas = await microsipQuery(query, [fechaInicio, fechaFin]);

  // Insert en Supabase (batch de 100)
  for (let batch of chunks(ventas, 100)) {
    await supabase
      .from('microsip.fact_ventas')
      .upsert(batch, {
        onConflict: 'docto_pv_id,docto_pv_det_id'
      });
  }

  // Log
  await logSync('ventas', 'success', ventas.length);
}

// 3. SINCRONIZAR INVENTARIO ACTUAL (COMPLETO)
async function syncInventarioHoraria() {
  // Query existencias de Microsip
  const existencias = await microsipQuery(`
    SELECT * FROM EXIST_DEPOSITO
  `);

  // Query ventas últimos 30 días de Supabase
  const ventasPorProducto = await supabase
    .from('microsip.fact_ventas')
    .select('articulo_id, tienda_id, SUM(cantidad_neta) as ventas_30d')
    .gte('fecha', thirtyDaysAgo)
    .group('articulo_id, tienda_id');

  // Combinar y calcular métricas
  const inventario = existencias.map(e => {
    const ventas = ventasPorProducto.find(v =>
      v.articulo_id === e.ARTICULO_ID &&
      v.tienda_id === e.SUCURSAL_ID
    );

    const ventas30d = ventas?.ventas_30d || 0;
    const ventaDiaria = ventas30d / 30;
    const diasInventario = ventaDiaria > 0
      ? Math.round(e.EXISTENCIA_DISPONIBLE / ventaDiaria)
      : 999;

    return {
      tienda_id: e.SUCURSAL_ID,
      almacen_id: e.ALMACEN_ID,
      articulo_id: e.ARTICULO_ID,
      existencia: e.EXISTENCIA,
      existencia_disponible: e.EXISTENCIA_DISPONIBLE,
      costo_promedio: e.COSTO_PROMEDIO,
      valor_inventario: e.EXISTENCIA * e.COSTO_PROMEDIO,
      ventas_ultimos_30dias: ventas30d,
      dias_inventario: diasInventario,
      es_critico: diasInventario < 30,
      nivel_stock: clasificarStock(diasInventario)
    };
  });

  // Insert en Supabase
  await supabase
    .from('microsip.inventario_actual')
    .upsert(inventario, {
      onConflict: 'tienda_id,almacen_id,articulo_id'
    });

  // Log
  await logSync('inventario', 'success', inventario.length);
}

// 4. REFRESCAR VISTAS (OPCIONAL)
async function refreshViews() {
  await supabase.rpc('refresh_materialized_view', {
    view_name: 'microsip.mv_ventas_por_dia'
  });
  // ... otras vistas
}

// 5. EJECUTAR SINCRONIZACIÓN COMPLETA
async function main() {
  console.log('🚀 Iniciando sincronización horaria...');

  const startTime = Date.now();

  await syncVentasHoraria();
  console.log('✅ Ventas sincronizadas');

  await syncInventarioHoraria();
  console.log('✅ Inventario actualizado');

  const duration = Math.round((Date.now() - startTime) / 1000);
  console.log(`⏱️ Duración: ${duration} segundos`);
}
```

**Tiempo de ejecución:** 10-30 segundos

**Frecuencia:** Cada hora vía Task Scheduler

---

## 📂 ESTRUCTURA DE ARCHIVOS

```
microsip-connector/
│
├── 📄 .env                           # Variables de entorno
│   ├── FIREBIRD_HOST                 # IP de Microsip
│   ├── FIREBIRD_DATABASE             # Path de .FDB
│   ├── SUPABASE_URL                  # URL de Supabase
│   └── SUPABASE_SERVICE_KEY          # Key para ETL
│
├── 📄 package.json                   # Dependencias del proyecto
│
├── 🔧 Scripts de Sincronización:
│   ├── sync-historical.js            # Carga histórica (2020-presente)
│   └── sync-hourly.js                # Sincronización horaria
│
├── 📚 Documentación:
│   ├── DEPLOYMENT.md                 # Guía completa deployment (5 fases)
│   ├── QUICKSTART.md                 # Guía rápida (15 min)
│   ├── ETL_STATUS_REPORT.md          # Estado actual del sistema
│   └── PLAN_COMPLETO.md              # Este archivo
│
├── 📁 src/
│   │
│   ├── 📁 services/
│   │   ├── etlService.js             # Lógica core del ETL
│   │   │   ├── syncCategorias()
│   │   │   ├── syncProductos()
│   │   │   ├── syncTiendas()
│   │   │   ├── syncVentas(inicio, fin)
│   │   │   └── syncInventarioActual()
│   │   │
│   │   └── microsipService.js        # Cliente Firebird
│   │       ├── query()
│   │       ├── connect()
│   │       └── disconnect()
│   │
│   ├── 📁 config/
│   │   ├── supabase.js               # Cliente Supabase
│   │   └── firebird.js               # Config Firebird
│   │
│   └── 📁 utils/
│       ├── logger.js                 # Sistema de logs
│       └── batchProcessor.js         # Procesamiento por lotes
│
└── 📁 logs/                          # Logs automáticos (se crean al ejecutar)
    ├── sync-hourly.log               # Log de todas las ejecuciones
    ├── last-sync.json                # Última sincronización (JSON)
    └── historical-sync-summary.json  # Resumen de carga histórica
```

---

## 🚀 PASOS DE EJECUCIÓN

### ✅ COMPLETADO (Automático vía MCP):

#### 1. Crear schema en Supabase ✅
- [x] Schema `microsip` creado
- [x] 8 tablas base creadas
- [x] 3 vistas materializadas creadas
- [x] 46 índices optimizados creados
- [x] 2 funciones/triggers creados

#### 2. Configurar credenciales ✅
- [x] SUPABASE_URL configurado
- [x] SUPABASE_ANON_KEY configurado
- [x] Credenciales de Microsip ya estaban configuradas

#### 3. Generar documentación ✅
- [x] DEPLOYMENT.md creado
- [x] QUICKSTART.md creado
- [x] ETL_STATUS_REPORT.md creado
- [x] PLAN_COMPLETO.md creado

---

### ⚠️ PENDIENTE (Manual - 2-3 horas):

#### 4. Completar configuración de SERVICE_ROLE_KEY (5 min)

**Por qué:**
- ANON_KEY solo tiene permisos de lectura
- SERVICE_ROLE_KEY tiene permisos de escritura (necesario para ETL)

**Pasos:**
1. Ir a: https://app.supabase.com/project/akcwnfrstqdpumzywzxv/settings/api
2. Copiar el valor de **"service_role"** (JWT muy largo)
3. Editar `.env`:
   ```bash
   code C:\Users\Moises\Documents\TRABAJO\aova\embler\devcompras2\emblerecosistema\dev-optimizacionembler\backend\microsip-connector\.env
   ```
4. Reemplazar línea 19:
   ```bash
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tu-service-role-key-real-aqui
   ```
5. Guardar archivo

---

#### 5. Ejecutar carga histórica (1-2 horas)

**Comando:**
```bash
cd C:\Users\Moises\Documents\TRABAJO\aova\embler\devcompras2\emblerecosistema\dev-optimizacionembler\backend\microsip-connector

node sync-historical.js all
```

**Lo que hace:**
1. Sincroniza catálogo (categorías, tiendas, productos)
2. Sincroniza ventas año por año (2020-2025)
3. Calcula inventario actual con métricas
4. Genera resumen en `logs/historical-sync-summary.json`

**Progreso esperado:**
```
═══════════════════════════════════════════════════════
🚀 CARGA HISTÓRICA: MICROSIP → SUPABASE
═══════════════════════════════════════════════════════

📋 Sincronizando catálogo base...
✅ Categorías: 50 insertadas
✅ Tiendas: 10 insertadas
✅ Productos: 5,000 insertados

═══════════════════════════════════════════════════════
📅 SINCRONIZANDO AÑO 2020
═══════════════════════════════════════════════════════
✅ Año 2020 completado en 180 segundos
   Registros: 18,500 insertados, 0 errores

... (continúa con cada año)

═══════════════════════════════════════════════════════
📦 ACTUALIZANDO INVENTARIO ACTUAL
═══════════════════════════════════════════════════════
✅ Inventario actualizado: 8,000 registros

═══════════════════════════════════════════════════════
RESUMEN DE CARGA HISTÓRICA
═══════════════════════════════════════════════════════
📊 Total registros sincronizados: 115,000
⏱️ Tiempo total: 120 minutos
✅ Años exitosos: 6
```

---

#### 6. Verificar datos en Supabase (5 min)

**Opción A: Dashboard de Supabase**
1. Ir a: https://app.supabase.com/project/akcwnfrstqdpumzywzxv/editor
2. Seleccionar schema: `microsip`
3. Verificar cada tabla tenga datos

**Opción B: SQL Query**
```sql
-- Verificar totales
SELECT
  (SELECT COUNT(*) FROM microsip.categorias) as categorias,
  (SELECT COUNT(*) FROM microsip.productos) as productos,
  (SELECT COUNT(*) FROM microsip.tiendas) as tiendas,
  (SELECT COUNT(*) FROM microsip.fact_ventas) as ventas,
  (SELECT COUNT(*) FROM microsip.inventario_actual) as inventario;

-- Debe mostrar aproximadamente:
-- categorias: 50
-- productos: 5000
-- tiendas: 10
-- ventas: 115000
-- inventario: 8000
```

---

#### 7. Probar sincronización horaria (2 min)

**Comando:**
```bash
node sync-hourly.js
```

**Resultado esperado:**
```
═══════════════════════════════════════════════════════
🚀 INICIO DE SINCRONIZACIÓN HORARIA
═══════════════════════════════════════════════════════
📅 Rango: 2025-01-24 hasta 2025-01-24

📊 Sincronizando ventas...
✅ Ventas: 150 registros insertados

📦 Actualizando inventario...
✅ Inventario: 8,000 registros actualizados

═══════════════════════════════════════════════════════
✅ SINCRONIZACIÓN COMPLETADA EXITOSAMENTE
⏱️ Duración: 12 segundos
📊 Total registros procesados: 8,150
═══════════════════════════════════════════════════════
```

---

#### 8. Configurar Task Scheduler (10 min)

**Objetivo:** Ejecutar `sync-hourly.js` automáticamente cada hora

**Pasos detallados:**

1. **Abrir Task Scheduler:**
   - Presiona `Windows + R`
   - Escribe `taskschd.msc`
   - Presiona Enter

2. **Crear Nueva Tarea:**
   - Click en **"Create Task"** (NO "Create Basic Task")

3. **General tab:**
   - Name: `ETL Microsip Hourly`
   - Description: `Sincronización horaria Microsip → Supabase`
   - ✓ Run whether user is logged on or not
   - ✓ Run with highest privileges
   - Configure for: Windows 10

4. **Triggers tab:**
   - Click **"New"**
   - Begin the task: **On a schedule**
   - Settings: **Daily**
   - Start: (hora actual)
   - Repeat task every: **1 hour**
   - For a duration of: **Indefinitely**
   - ✓ Enabled
   - Click **OK**

5. **Actions tab:**
   - Click **"New"**
   - Action: **Start a program**
   - Program/script: `node`
     - O usar ruta completa: `C:\Program Files\nodejs\node.exe`
   - Add arguments: `sync-hourly.js`
   - Start in: `C:\Users\Moises\Documents\TRABAJO\aova\embler\devcompras2\emblerecosistema\dev-optimizacionembler\backend\microsip-connector`
   - Click **OK**

6. **Conditions tab:**
   - ⬜ Start the task only if the computer is on AC power (desmarcar)
   - ✓ Wake the computer to run this task (opcional)

7. **Settings tab:**
   - ✓ Allow task to be run on demand
   - ✓ Run task as soon as possible after a scheduled start is missed
   - If the task fails, restart every: **10 minutes**
   - Attempt to restart up to: **3 times**
   - ⬜ Stop the task if it runs longer than: (desmarcar o poner 1 hour)

8. **Guardar:**
   - Click **OK**
   - Ingresar contraseña de Windows si se solicita

9. **Probar ejecución:**
   - Click derecho en la tarea creada
   - Click en **"Run"**
   - Verificar que se ejecute sin errores

---

#### 9. Verificar automatización (24 horas después)

**Query para verificar sincronizaciones:**
```sql
-- Verificar sincronizaciones horarias de hoy
SELECT
  sync_type,
  status,
  records_processed,
  records_inserted,
  duration_seconds,
  TO_CHAR(started_at, 'HH24:MI:SS') as hora,
  TO_CHAR(started_at, 'YYYY-MM-DD') as fecha
FROM microsip.etl_sync_log
WHERE DATE(started_at) = CURRENT_DATE
  AND sync_type = 'ventas'
ORDER BY started_at DESC;

-- Debe mostrar ~24 registros (uno por hora)
```

**Revisar logs locales:**
```bash
# Ver últimas 50 líneas del log
type logs\sync-hourly.log | Select-Object -Last 50

# Ver última sincronización (JSON)
type logs\last-sync.json
```

---

## 📊 QUERIES OPTIMIZADAS PARA PRODUCCIÓN

### 1. KPIs de Ventas (< 50ms)

```sql
-- KPIs de hoy
SELECT
  COUNT(DISTINCT ticket_id) as tickets_hoy,
  SUM(total_partida) as ingresos_hoy,
  SUM(cantidad_neta) as unidades_vendidas,
  COUNT(DISTINCT tienda_id) as tiendas_activas,
  COUNT(DISTINCT articulo_id) as productos_vendidos,
  AVG(total_partida / NULLIF(cantidad_neta, 0)) as precio_promedio
FROM microsip.fact_ventas
WHERE fecha = CURRENT_DATE;
```

**Performance:** < 50ms
**Uso:** Dashboard principal

---

### 2. Top Productos (< 30ms)

```sql
-- Top 20 productos últimos 30 días
SELECT * FROM microsip.mv_top_productos_30d
LIMIT 20;
```

**Performance:** < 20ms (vista pre-calculada)
**Uso:** Dashboard de productos

---

### 3. Inventario Crítico (< 80ms)

```sql
-- Productos con menos de 30 días de inventario
SELECT * FROM microsip.mv_inventario_critico
WHERE dias_inventario < 30
ORDER BY dias_inventario ASC
LIMIT 50;
```

**Performance:** < 50ms (vista pre-calculada)
**Uso:** Alertas de inventario

---

### 4. Tendencias de Ventas (< 100ms)

```sql
-- Ventas diarias últimos 30 días
SELECT
  fecha,
  total_tickets,
  ingresos_totales,
  unidades_vendidas,
  ticket_promedio
FROM microsip.mv_ventas_por_dia
WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY fecha DESC;
```

**Performance:** < 30ms (vista pre-calculada)
**Uso:** Gráficas de tendencias

---

### 5. Ventas por Tienda (< 100ms)

```sql
-- Comparación de ventas por tienda (últimos 7 días)
SELECT
  t.nombre as tienda,
  COUNT(DISTINCT fv.ticket_id) as tickets,
  SUM(fv.total_partida) as ingresos,
  SUM(fv.cantidad_neta) as unidades,
  AVG(fv.total_partida / NULLIF(fv.cantidad_neta, 0)) as ticket_promedio
FROM microsip.fact_ventas fv
INNER JOIN microsip.tiendas t ON fv.tienda_id = t.sucursal_id
WHERE fv.fecha >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY t.sucursal_id, t.nombre
ORDER BY ingresos DESC;
```

**Performance:** < 80ms
**Uso:** Comparación de sucursales

---

### 6. Análisis de Categorías (< 150ms)

```sql
-- Performance de categorías (últimos 30 días)
SELECT
  c.nombre as categoria,
  COUNT(DISTINCT fv.articulo_id) as productos_vendidos,
  SUM(fv.cantidad_neta) as unidades,
  SUM(fv.total_partida) as ingresos,
  AVG(fv.total_partida) as ticket_promedio,
  SUM(fv.utilidad_bruta) as utilidad,
  AVG(fv.margen_porcentaje) as margen_promedio
FROM microsip.fact_ventas fv
INNER JOIN microsip.productos p ON fv.articulo_id = p.articulo_id
INNER JOIN microsip.categorias c ON p.categoria_id = c.categoria_id
WHERE fv.fecha >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.categoria_id, c.nombre
ORDER BY ingresos DESC;
```

**Performance:** < 120ms
**Uso:** Análisis de categorías

---

### 7. Rotación de Inventario (< 100ms)

```sql
-- Productos con mejor y peor rotación
SELECT
  p.sku,
  p.nombre,
  ia.existencia_disponible,
  ia.ventas_ultimos_30dias,
  ia.dias_inventario,
  ia.rotacion_anual,
  ia.valor_inventario,
  CASE
    WHEN ia.rotacion_anual > 12 THEN 'EXCELENTE'
    WHEN ia.rotacion_anual > 6 THEN 'BUENA'
    WHEN ia.rotacion_anual > 3 THEN 'REGULAR'
    ELSE 'BAJA'
  END as clasificacion_rotacion
FROM microsip.inventario_actual ia
INNER JOIN microsip.productos p ON ia.articulo_id = p.articulo_id
WHERE ia.existencia_disponible > 0
ORDER BY ia.rotacion_anual DESC
LIMIT 50;
```

**Performance:** < 80ms
**Uso:** Gestión de inventario

---

## 🔍 MONITOREO Y MANTENIMIENTO

### Queries de Monitoreo

#### 1. Estado del ETL
```sql
-- Verificar última sincronización
SELECT
  sync_type,
  status,
  records_inserted,
  duration_seconds,
  started_at,
  CASE
    WHEN started_at > NOW() - INTERVAL '2 hours' THEN 'OK'
    ELSE 'ALERTA: Sincronización retrasada'
  END as estado
FROM microsip.etl_sync_log
WHERE status = 'success'
ORDER BY started_at DESC
LIMIT 5;
```

---

#### 2. Detectar Errores
```sql
-- Últimos errores en sincronizaciones
SELECT
  sync_type,
  error_message,
  error_details,
  started_at
FROM microsip.etl_sync_log
WHERE status = 'error'
ORDER BY started_at DESC
LIMIT 10;
```

---

#### 3. Estadísticas de Performance
```sql
-- Performance de sincronizaciones últimos 7 días
SELECT
  sync_type,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE status = 'success') as exitosas,
  COUNT(*) FILTER (WHERE status = 'error') as fallidas,
  ROUND(AVG(duration_seconds)) as duracion_promedio,
  ROUND(AVG(records_inserted)) as registros_promedio,
  SUM(records_inserted) as total_registros
FROM microsip.etl_sync_log
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY sync_type
ORDER BY sync_type;
```

---

#### 4. Refrescar Vistas Materializadas
```sql
-- Ejecutar después de cada sync importante
REFRESH MATERIALIZED VIEW microsip.mv_ventas_por_dia;
REFRESH MATERIALIZED VIEW microsip.mv_top_productos_30d;
REFRESH MATERIALIZED VIEW microsip.mv_inventario_critico;
```

---

## 🛠️ TROUBLESHOOTING

### Error: "Cannot connect to Firebird"

**Causa:** Microsip no accesible desde la red

**Diagnóstico:**
```bash
# Verificar conectividad
ping 192.65.134.78

# Verificar puerto abierto (requiere telnet)
telnet 192.65.134.78 3050

# Probar conexión con script
node test-connection.js
```

**Soluciones:**
1. Verificar que Microsip esté corriendo
2. Verificar firewall permita puerto 3050
3. Verificar IP sea correcta en `.env`
4. Verificar path de base de datos sea correcto

---

### Error: "Supabase authentication failed"

**Causa:** SERVICE_ROLE_KEY no configurada o incorrecta

**Diagnóstico:**
```bash
# Verificar que uses SERVICE_KEY
cat .env | grep SUPABASE_SERVICE_KEY

# Debe ser un JWT largo que empieza con:
# eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

**Solución:**
1. Ir a dashboard de Supabase
2. Copiar "service_role" key (NO "anon" key)
3. Actualizar `.env` línea 19

---

### Sincronización muy lenta

**Causa:** Batch size muy grande o red lenta

**Solución:** Reducir batch size en `src/services/etlService.js`:
```javascript
// Línea ~167
const batchSize = 100; // Cambiar de 500 a 100
```

---

### Task Scheduler no ejecuta

**Diagnóstico:**
1. Verificar tarea habilitada (✓)
2. Revisar "History" en Task Scheduler para ver errores
3. Verificar path de Node.js:
   ```bash
   where node
   # C:\Program Files\nodejs\node.exe
   ```

**Soluciones comunes:**
1. Usar ruta completa a node.exe en vez de solo `node`
2. Verificar "Start in" apunte al directorio correcto
3. Verificar usuario tenga permisos de ejecución
4. Probar ejecutar manualmente desde CMD

---

### Memoria alta durante sincronización

**Causa:** Procesar demasiados registros en memoria

**Solución:** Implementar streaming o reducir batch size

---

## 📈 RESULTADOS ESPERADOS

### Performance Final:

| Métrica | Antes (Microsip) | Después (Supabase) | Mejora |
|---------|------------------|-------------------|---------|
| KPIs ventas | 8,562ms ❌ | < 50ms ✅ | **171x** |
| Top productos | 8,726ms ❌ | < 30ms ✅ | **290x** |
| Inventario actual | No disponible ❌ | < 80ms ✅ | **Nuevo** |
| Tendencias ventas | Timeout ❌ | < 100ms ✅ | **Funcional** |
| Días de inventario | No disponible ❌ | Automático ✅ | **Nuevo** |
| Rotación anual | No disponible ❌ | Automático ✅ | **Nuevo** |

### Datos Almacenados:

- **~50 categorías** de productos
- **~5,000 productos** activos con precios
- **~10 tiendas** (sucursales)
- **~115,000 ventas históricas** (2020-2025)
- **~8,000 registros de inventario** con métricas calculadas

### Automatización:

- ✅ Sincronización automática cada hora
- ✅ Logs detallados de cada ejecución
- ✅ Monitoreo en tiempo real vía `etl_sync_log`
- ✅ Vistas pre-calculadas para dashboards

---

## ✅ CHECKLIST FINAL

### Fase Automática (COMPLETADA):
- [x] Documentación completa creada
- [x] Schema en Supabase creado (8 tablas + 3 vistas)
- [x] Scripts de sincronización listos
- [x] Credenciales SUPABASE_URL configuradas
- [x] Credenciales SUPABASE_ANON_KEY configuradas

### Fase Manual (PENDIENTE):
- [ ] ⚠️ Agregar SUPABASE_SERVICE_KEY al .env
- [ ] ⚠️ Ejecutar carga histórica (`node sync-historical.js all`)
- [ ] ⚠️ Verificar datos en Supabase
- [ ] ⚠️ Probar sincronización horaria (`node sync-hourly.js`)
- [ ] ⚠️ Configurar Task Scheduler
- [ ] ⚠️ Verificar logs después de 24 horas
- [ ] ⚠️ Refrescar vistas materializadas

---

## 🎯 PRÓXIMO PASO INMEDIATO

**Agregar SERVICE_ROLE_KEY al .env (5 minutos):**

1. Ir a: https://app.supabase.com/project/akcwnfrstqdpumzywzxv/settings/api
2. Copiar "service_role" key
3. Editar `.env` línea 19
4. Guardar

**Después ejecutar carga histórica:**
```bash
node sync-historical.js all
```

---

## 📞 SOPORTE Y RECURSOS

### Documentación:
- `DEPLOYMENT.md` - Guía completa paso a paso
- `QUICKSTART.md` - Guía rápida (15 min)
- `ETL_STATUS_REPORT.md` - Estado del sistema
- `PLAN_COMPLETO.md` - Este archivo

### Verificación:
```bash
# Probar conexión a Microsip
node test-connection.js

# Ver logs
type logs\sync-hourly.log | Select-Object -Last 50
type logs\last-sync.json
```

### Queries útiles:
```sql
-- Verificar datos cargados
SELECT
  (SELECT COUNT(*) FROM microsip.fact_ventas) as ventas,
  (SELECT COUNT(*) FROM microsip.productos) as productos,
  (SELECT COUNT(*) FROM microsip.inventario_actual) as inventario;

-- Ver últimas sincronizaciones
SELECT * FROM microsip.etl_sync_log
ORDER BY started_at DESC LIMIT 10;
```

---

## 🎉 CONCLUSIÓN

**Sistema ETL Microsip → Supabase completamente planificado e implementado.**

**Status Actual:**
- ✅ 60% automático completado (schema, docs, scripts)
- ⚠️ 40% manual pendiente (credencial, ejecución, verificación)

**Tiempo restante:** 2-3 horas (mayoría es espera de sincronización)

**Beneficio:** 100-300x más rápido + nuevas métricas automáticas 🚀

---

**Fecha de este plan:** 2025-01-24
**Proyecto:** devwhats-phase1-clean (akcwnfrstqdpumzywzxv)
**Status:** ✅ LISTO PARA EJECUCIÓN MANUAL
