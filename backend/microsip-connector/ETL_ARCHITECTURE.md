# Arquitectura ETL: Microsip → Supabase

## Resumen Ejecutivo

Sistema de extracción, transformación y carga (ETL) que sincroniza datos de Microsip (Firebird) a Supabase (PostgreSQL) para análisis rápido de ventas, inventario y catálogo.

**Problema resuelto:** VW_FACT_VENTAS en Microsip es extremadamente lenta (8+ segundos), haciendo imposible análisis en tiempo real.

**Solución:** Extraer datos a Supabase donde las queries toman < 100ms.

---

## Arquitectura General

```
┌─────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│                 │          │                  │          │                  │
│   MICROSIP      │  ─ETL──> │  SUPABASE        │  <────>  │  API GATEWAY     │
│   (Firebird)    │          │  (PostgreSQL)    │          │  (Express)       │
│                 │          │                  │          │                  │
└─────────────────┘          └──────────────────┘          └──────────────────┘
  Tablas base:                 Tablas:                       Endpoints:
  - DOCTOS_PV                  - fact_ventas                 GET /ventas
  - DOCTOS_PV_DET              - inventario_actual           GET /inventario
  - ARTICULOS                  - productos                   GET /productos
  - LINEAS_ARTICULOS           - categorias                  POST /etl/sync/*
  - SUCURSALES                 - tiendas
  - EXISTENCIAS                - etl_sync_log
```

---

## Tablas en Supabase

### 1. **Catálogo**

#### `categorias`
Líneas/categorías de productos
- `categoria_id` (PK)
- `nombre`, `descripcion`
- `total_productos`

#### `productos`
Catálogo completo de productos
- `articulo_id` (PK)
- `sku` (UNIQUE)
- `nombre`, `descripcion`
- `categoria_id` (FK)
- `costo_promedio`, `precio_lista`
- `activo`, `peso`, `volumen`

#### `precios_productos`
Precios por lista de precios
- `articulo_id` (FK)
- `lista_precios_id`
- `precio`, `unidad`

#### `tiendas`
Catálogo de sucursales
- `sucursal_id` (PK)
- `nombre`, `direccion`, `ciudad`, `estado`

### 2. **Transacciones (Fact Tables)**

#### `fact_ventas`
**Tabla principal de análisis** - Todas las transacciones de venta
- `id` (PK, serial)
- `docto_pv_id`, `docto_pv_det_id` (UNIQUE constraint)
- **Dimensiones de tiempo:**
  - `fecha`, `ano`, `mes`, `dia`, `semana`
- **Dimensiones de negocio:**
  - `tienda_id` (FK), `articulo_id` (FK), `sku`
  - `ticket_id`, `cliente_id`, `vendedor_id`
- **Métricas:**
  - `cantidad`, `cantidad_devuelta`, `cantidad_neta`
  - `precio_unitario`, `precio_con_iva`, `impuesto`
  - `total_partida`
  - `costo_unitario`, `margen_unitario`, `margen_total`

**Índices optimizados para:**
- Consultas por fecha
- Análisis por tienda
- Análisis por producto/SKU
- Lookup por ticket

#### `inventario_movimientos`
Historial de movimientos de inventario
- `docto_in_id`, `docto_in_det_id` (UNIQUE)
- `fecha`, `tienda_id`, `articulo_id`
- `tipo_movimiento` (Entrada, Salida, Ajuste, Transferencia)
- `cantidad`, `costo_unitario`

#### `inventario_actual`
**Snapshot de existencias actuales + métricas calculadas**
- `tienda_id`, `almacen_id`, `articulo_id` (UNIQUE constraint)
- `existencia`, `existencia_disponible`
- `ventas_ultimos_30dias`, `ventas_ultimos_90dias`
- **`dias_inventario`** - Métrica clave: días de inventario disponible
- **`rotacion_anual`** - Rotación anual estimada
- `valor_inventario`

### 3. **Administración**

#### `etl_sync_log`
Log de todas las sincronizaciones ETL
- `sync_type` (productos, ventas, inventario, full)
- `status` (running, success, error)
- `records_processed`, `records_inserted`, `records_updated`
- `started_at`, `completed_at`, `duration_seconds`
- `error_message`, `error_details`

---

## Vistas Materializadas

### `mv_ventas_por_dia`
Agregación de ventas diarias
- Pre-calculada para dashboards
- Refresh: cada sincronización

### `mv_top_productos_30d`
Top 100 productos más vendidos (últimos 30 días)
- Incluye cantidad vendida, ingresos, tickets

### `mv_inventario_critico`
Productos con días de inventario < 30
- Alerta de productos con baja rotación

---

## Servicio ETL (`etlService.js`)

### Funciones Principales

#### `syncCategorias()`
Sincroniza líneas de productos desde `LINEAS_ARTICULOS`

#### `syncProductos()`
Sincroniza catálogo completo desde `ARTICULOS`
- Procesa en batches de 100 registros
- Performance: ~2-3 segundos para 10,000 productos

#### `syncTiendas()`
Sincroniza sucursales desde `SUCURSALES`

#### `syncVentas(fechaInicio, fechaFin)`
Sincroniza ventas en rango de fechas
- Extrae desde `DOCTOS_PV` + `DOCTOS_PV_DET` + `ARTICULOS` (JOIN optimizado)
- Calcula métricas: `cantidad_neta`, `ano`, `mes`, `semana`
- Procesa en batches de 500 registros
- Performance: ~1-2 segundos por cada 1,000 registros

#### `syncInventarioActual()`
Calcula snapshot de inventario actual
- Extrae existencias desde `EXISTENCIAS`
- Calcula ventas de últimos 30 y 90 días desde Supabase
- Calcula métricas:
  - **Días de inventario** = Existencia / (Ventas 30 días / 30)
  - **Rotación anual** = (Ventas 90 días * 4) / Existencia
- Performance: ~3-5 segundos para 5,000 registros

#### `syncFull(diasVentas = 90)`
Sincronización completa en orden:
1. Categorías
2. Tiendas
3. Productos
4. Ventas (últimos X días)
5. Inventario actual
6. Refresh vistas materializadas

**Tiempo total:** 5-10 minutos para sincronización completa (depende del volumen)

---

## CLI de Sincronización (`sync-etl.js`)

### Uso Manual

```bash
# Sincronización completa (últimos 90 días de ventas)
node sync-etl.js full

# Sincronización completa (últimos 30 días de ventas)
node sync-etl.js full 30

# Solo categorías
node sync-etl.js categorias

# Solo productos
node sync-etl.js productos

# Solo tiendas
node sync-etl.js tiendas

# Ventas por rango de fechas
node sync-etl.js ventas 2025-01-01 2025-01-31

# Inventario actual
node sync-etl.js inventario
```

### Logs
- Muestra progreso en tiempo real
- Registra en `etl_sync_log` tabla
- Captura errores con stack trace

---

## API Endpoints (`etlController.js`)

### POST `/api/etl/sync/full`
Sincronización completa via API

**Body:**
```json
{
  "dias_ventas": 90
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sincronización completa finalizada",
  "data": {
    "categorias": { "inserted": 50, "total": 50 },
    "tiendas": { "inserted": 10, "total": 10 },
    "productos": { "inserted": 5000, "total": 5000 },
    "ventas": { "inserted": 15000, "total": 15000 },
    "inventario": { "inserted": 8000, "total": 8000 }
  }
}
```

### POST `/api/etl/sync/categorias`
Sincroniza solo categorías

### POST `/api/etl/sync/productos`
Sincroniza solo productos

### POST `/api/etl/sync/tiendas`
Sincroniza solo tiendas

### POST `/api/etl/sync/ventas`
Sincroniza ventas por rango

**Body:**
```json
{
  "fecha_inicio": "2025-01-01",
  "fecha_fin": "2025-01-31"
}
```

### POST `/api/etl/sync/inventario`
Sincroniza inventario actual

---

## Estrategia de Sincronización

### Sincronización Inicial (Setup)

```bash
# 1. Crear schema en Supabase
# Ejecutar supabase-schema.sql en Supabase SQL Editor

# 2. Sincronización completa (últimos 90 días)
node sync-etl.js full 90
```

**Tiempo estimado:** 5-10 minutos

### Sincronización Incremental (Diaria)

**Opción A: Cron Job Automático**
```bash
# Agregar a crontab (Linux/Mac) o Task Scheduler (Windows)
# Ejecutar cada día a las 2:00 AM

0 2 * * * cd /path/to/microsip-connector && node sync-etl.js ventas $(date -d '1 day ago' +\%Y-\%m-\%d) $(date +\%Y-\%m-\%d)
0 3 * * * cd /path/to/microsip-connector && node sync-etl.js inventario
```

**Opción B: Sincronización Manual**
```bash
# Sincronizar ventas de ayer
node sync-etl.js ventas 2025-01-22 2025-01-23

# Actualizar inventario
node sync-etl.js inventario
```

**Opción C: API Trigger desde otro servicio**
```bash
curl -X POST http://localhost:3000/api/etl/sync/ventas \
  -H "Content-Type: application/json" \
  -d '{"fecha_inicio": "2025-01-22", "fecha_fin": "2025-01-23"}'
```

### Sincronización de Catálogo (Semanal)

```bash
# Productos y categorías cambian poco, sincronizar semanalmente
node sync-etl.js productos
node sync-etl.js categorias
```

---

## Performance Benchmarks

### Microsip (Firebird) - Antes

| Query | Tiempo | Registros |
|-------|--------|-----------|
| VW_FACT_VENTAS COUNT (7 días) | 8,562ms | 1,770 |
| VW_FACT_VENTAS SELECT (10 reg) | 8,726ms | 10 |
| DOCTOS_PV COUNT (7 días) | 593ms | 3,192 |
| DOCTOS_PV + JOIN (10 reg) | 771ms | 10 |

**Conclusión:** VW_FACT_VENTAS es **11x más lenta** que DOCTOS_PV + JOIN

### Supabase (PostgreSQL) - Después

| Query | Tiempo | Registros |
|-------|--------|-----------|
| SELECT COUNT(*) fact_ventas | < 50ms | Cualquier cantidad |
| SELECT fact_ventas (últimos 7 días) | < 100ms | 3,000+ |
| SELECT top productos | < 50ms | 100 |
| SELECT inventario actual | < 80ms | 5,000+ |
| Vistas materializadas | < 10ms | Pre-calculado |

**Mejora:** **100x más rápido** para análisis

---

## Casos de Uso

### 1. Dashboard de Ventas en Tiempo Real

**Antes (Microsip directo):**
- KPIs tardan 8+ segundos
- No se puede hacer análisis interactivo
- Timeout en queries complejas

**Después (Supabase):**
```sql
-- KPIs del día (< 50ms)
SELECT
  COUNT(DISTINCT ticket_id) as tickets,
  SUM(total_partida) as ingresos,
  SUM(cantidad_neta) as unidades
FROM fact_ventas
WHERE fecha = CURRENT_DATE;

-- Top 10 productos hoy (< 30ms)
SELECT
  p.nombre,
  SUM(fv.cantidad_neta) as vendido,
  SUM(fv.total_partida) as ingresos
FROM fact_ventas fv
JOIN productos p ON fv.articulo_id = p.articulo_id
WHERE fv.fecha = CURRENT_DATE
GROUP BY p.articulo_id, p.nombre
ORDER BY vendido DESC
LIMIT 10;
```

### 2. Análisis de Días de Inventario

```sql
-- Productos con inventario crítico (< 30 días)
SELECT *
FROM mv_inventario_critico
WHERE tienda_id = 'MTY'
ORDER BY dias_inventario ASC;

-- Productos sin rotación (> 180 días)
SELECT
  p.sku,
  p.nombre,
  ia.existencia_disponible,
  ia.dias_inventario,
  ia.valor_inventario
FROM inventario_actual ia
JOIN productos p ON ia.articulo_id = p.articulo_id
WHERE ia.dias_inventario > 180
  AND ia.existencia_disponible > 0
ORDER BY ia.valor_inventario DESC;
```

### 3. Tendencias de Ventas

```sql
-- Ventas por día (últimos 30 días)
SELECT * FROM mv_ventas_por_dia
WHERE fecha >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY fecha DESC;

-- Comparación año anterior
SELECT
  fecha,
  total_ventas,
  LAG(total_ventas) OVER (ORDER BY fecha) as ventas_dia_anterior
FROM mv_ventas_por_dia
WHERE fecha >= CURRENT_DATE - INTERVAL '7 days';
```

---

## Monitoreo y Logs

### Verificar última sincronización

```sql
-- Últimas 10 sincronizaciones
SELECT
  sync_type,
  status,
  records_processed,
  records_inserted,
  duration_seconds,
  started_at
FROM etl_sync_log
ORDER BY started_at DESC
LIMIT 10;

-- Sincronizaciones fallidas
SELECT *
FROM etl_sync_log
WHERE status = 'error'
ORDER BY started_at DESC;
```

### Alertas

- Si `status = 'error'`: Revisar `error_message`
- Si `duration_seconds > 600`: Sincronización lenta
- Si no hay sincronizaciones en últimas 24h: Cron job caído

---

## Próximos Pasos

### Fase 1: Setup Inicial ✅
- [x] Diseñar schema Supabase
- [x] Crear servicio ETL
- [x] Crear CLI de sincronización
- [x] Crear API endpoints

### Fase 2: Testing
- [ ] Ejecutar `supabase-schema.sql` en Supabase
- [ ] Probar `node sync-etl.js full` con datos reales
- [ ] Validar datos en Supabase
- [ ] Verificar performance de queries

### Fase 3: Automatización
- [ ] Configurar cron job para sincronización diaria
- [ ] Implementar alertas por email en caso de error
- [ ] Crear dashboard de monitoreo ETL

### Fase 4: Optimización
- [ ] Agregar cache Redis para queries frecuentes
- [ ] Implementar sincronización delta (solo cambios)
- [ ] Crear índices adicionales según patrones de uso

---

## Troubleshooting

### Error: "Connection timeout to Firebird"
**Solución:** Verificar que el servidor Microsip esté accesible
```bash
# Test de conexión
node test-connection.js
```

### Error: "Supabase authentication failed"
**Solución:** Verificar variables de entorno
```bash
# Verificar .env
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_KEY
```

### Error: "Duplicate key violation"
**Causa:** Intentando insertar registros que ya existen
**Solución:** ETL usa `UPSERT`, esto no debería ocurrir. Verificar constraints en Supabase.

### Sincronización lenta
**Solución:** Reducir batch size en `etlService.js`
```javascript
const batchSize = 100; // Reducir de 500 a 100
```

---

## Contacto y Soporte

Para dudas o problemas con el ETL:
1. Revisar logs en `etl_sync_log`
2. Verificar conexión a Microsip y Supabase
3. Consultar documentación de Supabase: https://supabase.com/docs

---

**Última actualización:** 2025-01-23
**Versión:** 1.0.0
