# Quick Start: ETL Microsip → Supabase

Guía rápida para poner en marcha el sistema ETL en 15 minutos.

---

## Paso 1: Prerequisitos

Asegúrate de tener:
- [x] Node.js instalado (v16+)
- [x] Acceso a Microsip (Firebird)
- [x] Cuenta de Supabase creada
- [x] Variables de entorno configuradas

---

## Paso 2: Configurar Variables de Entorno

Crea o verifica el archivo `.env`:

```bash
# Microsip (Firebird)
FIREBIRD_HOST=192.65.134.78
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\\Microsip datos\\EMBLER.FDB
FIREBIRD_USER=SYSDBA
FIREBIRD_PASSWORD=masterkey

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Servidor
PORT=3000
```

**IMPORTANTE:** Usa `SUPABASE_SERVICE_KEY` (no `ANON_KEY`) para ETL, ya que necesita permisos de escritura.

---

## Paso 3: Crear Schema en Supabase

1. Abre Supabase Dashboard: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega el contenido de `supabase-schema.sql`
5. Click en **Run** o presiona `Cmd/Ctrl + Enter`

**Resultado esperado:** Se crearán 8 tablas + 3 vistas materializadas

---

## Paso 4: Instalar Dependencias

```bash
npm install
```

---

## Paso 5: Probar Conexión a Microsip

```bash
node test-connection.js
```

**Resultado esperado:**
```
✅ CONECTADO
📊 Encontradas X tablas en Microsip
```

---

## Paso 6: Primera Sincronización Completa

```bash
# Sincronizar últimos 30 días de ventas
node sync-etl.js full 30
```

**Tiempo estimado:** 3-5 minutos

**Progreso esperado:**
```
🔄 [ETL] Sincronizando categorías desde Microsip...
✅ [ETL] Categorías sincronizadas: 50 insertadas

🔄 [ETL] Sincronizando tiendas desde Microsip...
✅ [ETL] Tiendas sincronizadas: 10 insertadas

🔄 [ETL] Sincronizando productos desde Microsip...
✅ [ETL] Productos sincronizados: 5000 OK, 0 errores

🔄 [ETL] Sincronizando ventas desde 2024-12-25 hasta 2025-01-23...
✅ [ETL] Ventas sincronizadas: 15000 OK, 0 errores

🔄 [ETL] Calculando inventario actual desde Microsip...
✅ [ETL] Inventario actual sincronizado: 8000 OK, 0 errores

🎉 [ETL] SINCRONIZACIÓN COMPLETA FINALIZADA
```

---

## Paso 7: Verificar Datos en Supabase

### Opción A: Dashboard de Supabase

1. Ve a **Table Editor**
2. Verifica cada tabla:
   - `categorias` - Debería tener ~50 registros
   - `productos` - Debería tener ~5,000+ registros
   - `tiendas` - Debería tener ~10 registros
   - `fact_ventas` - Debería tener miles de registros
   - `inventario_actual` - Debería tener ~8,000+ registros

### Opción B: SQL Query

En SQL Editor, ejecuta:

```sql
-- Verificar totales
SELECT
  (SELECT COUNT(*) FROM categorias) as categorias,
  (SELECT COUNT(*) FROM productos) as productos,
  (SELECT COUNT(*) FROM tiendas) as tiendas,
  (SELECT COUNT(*) FROM fact_ventas) as ventas,
  (SELECT COUNT(*) FROM inventario_actual) as inventario;

-- Verificar última sincronización
SELECT *
FROM etl_sync_log
ORDER BY started_at DESC
LIMIT 5;
```

**Resultado esperado:**
| categorias | productos | tiendas | ventas | inventario |
|------------|-----------|---------|--------|------------|
| 50         | 5000      | 10      | 15000  | 8000       |

---

## Paso 8: Probar Queries Rápidas

```sql
-- KPIs de ventas (últimos 7 días)
SELECT
  COUNT(DISTINCT ticket_id) as total_tickets,
  SUM(total_partida) as ingresos_totales,
  SUM(cantidad_neta) as unidades_vendidas,
  COUNT(DISTINCT tienda_id) as tiendas_activas
FROM fact_ventas
WHERE fecha >= CURRENT_DATE - INTERVAL '7 days';

-- Top 10 productos más vendidos
SELECT
  p.sku,
  p.nombre,
  SUM(fv.cantidad_neta) as cantidad_vendida,
  SUM(fv.total_partida) as ingresos
FROM fact_ventas fv
JOIN productos p ON fv.articulo_id = p.articulo_id
WHERE fv.fecha >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.articulo_id, p.sku, p.nombre
ORDER BY cantidad_vendida DESC
LIMIT 10;

-- Inventario crítico (< 30 días)
SELECT * FROM mv_inventario_critico
ORDER BY dias_inventario ASC
LIMIT 20;
```

**Performance esperada:** < 100ms por query

---

## Paso 9: Configurar Sincronización Diaria (Opcional)

### Opción A: Cron Job (Linux/Mac)

```bash
# Editar crontab
crontab -e

# Agregar estas líneas (ajustar rutas)
# Sincronizar ventas diarias a las 2:00 AM
0 2 * * * cd /ruta/a/microsip-connector && node sync-etl.js ventas $(date -d '1 day ago' +\%Y-\%m-\%d) $(date +\%Y-\%m-\%d) >> /var/log/etl-ventas.log 2>&1

# Actualizar inventario a las 3:00 AM
0 3 * * * cd /ruta/a/microsip-connector && node sync-etl.js inventario >> /var/log/etl-inventario.log 2>&1
```

### Opción B: Task Scheduler (Windows)

1. Abre **Task Scheduler**
2. Crea nueva tarea: "ETL Ventas Diarias"
3. Trigger: Daily at 2:00 AM
4. Action: `node C:\ruta\sync-etl.js ventas FECHA_AYER FECHA_HOY`

### Opción C: Manual Diario

```bash
# Ejecutar cada día
node sync-etl.js ventas 2025-01-22 2025-01-23
node sync-etl.js inventario
```

---

## Paso 10: Configurar API (Opcional)

Si quieres exponer endpoints ETL vía API:

1. Crear archivo de rutas `src/routes/etl.js`:

```javascript
const express = require('express');
const router = express.Router();
const etlController = require('../controllers/etlController');

router.post('/sync/full', etlController.syncFull);
router.post('/sync/categorias', etlController.syncCategorias);
router.post('/sync/productos', etlController.syncProductos);
router.post('/sync/tiendas', etlController.syncTiendas);
router.post('/sync/ventas', etlController.syncVentas);
router.post('/sync/inventario', etlController.syncInventario);

module.exports = router;
```

2. Registrar en `src/index.js`:

```javascript
const etlRoutes = require('./routes/etl');
app.use('/api/etl', etlRoutes);
```

3. Iniciar servidor:

```bash
npm start
```

4. Probar endpoint:

```bash
curl -X POST http://localhost:3000/api/etl/sync/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_inicio": "2025-01-22",
    "fecha_fin": "2025-01-23"
  }'
```

---

## Comandos Útiles

### Sincronizaciones

```bash
# Completa (90 días de ventas)
node sync-etl.js full

# Completa (30 días de ventas)
node sync-etl.js full 30

# Solo ventas (ayer)
node sync-etl.js ventas 2025-01-22 2025-01-23

# Solo inventario
node sync-etl.js inventario

# Solo catálogo
node sync-etl.js productos
node sync-etl.js categorias
```

### Monitoreo

```sql
-- Últimas sincronizaciones
SELECT
  sync_type,
  status,
  records_processed,
  duration_seconds,
  started_at
FROM etl_sync_log
ORDER BY started_at DESC
LIMIT 10;

-- Errores recientes
SELECT *
FROM etl_sync_log
WHERE status = 'error'
ORDER BY started_at DESC;
```

---

## Troubleshooting Común

### Error: "Cannot connect to Firebird"

**Solución:**
```bash
# Verificar conexión
node test-connection.js

# Verificar variables de entorno
cat .env | grep FIREBIRD
```

### Error: "Supabase authentication failed"

**Solución:**
```bash
# Verificar que uses SERVICE_KEY (no ANON_KEY)
cat .env | grep SUPABASE_SERVICE_KEY
```

### Error: "Table already exists"

**Causa:** Schema ya fue ejecutado antes

**Solución:** Puedes ignorar, o hacer DROP de tablas y re-ejecutar:
```sql
-- Solo si quieres empezar de cero
DROP TABLE IF EXISTS public.fact_ventas CASCADE;
DROP TABLE IF EXISTS public.inventario_actual CASCADE;
-- ... etc
```

### Sincronización muy lenta

**Solución:** Reduce batch size en `etlService.js` línea 167:
```javascript
const batchSize = 100; // Cambiar de 500 a 100
```

---

## Próximos Pasos

Una vez que tengas el ETL funcionando:

1. **Crear dashboards** en tu aplicación usando queries a Supabase
2. **Configurar alertas** de inventario crítico
3. **Implementar cache Redis** para queries muy frecuentes
4. **Explorar vistas materializadas** para análisis pre-calculados

---

## Recursos

- **Documentación completa:** `ETL_ARCHITECTURE.md`
- **Schema SQL:** `supabase-schema.sql`
- **Código fuente ETL:** `src/services/etlService.js`
- **CLI:** `sync-etl.js`
- **API Controller:** `src/controllers/etlController.js`

---

## Soporte

Si encuentras problemas:
1. Revisa `etl_sync_log` en Supabase
2. Verifica logs de Node.js
3. Consulta `ETL_ARCHITECTURE.md` para detalles técnicos

---

**¡Listo!** Ahora tienes un sistema ETL completo sincronizando Microsip a Supabase para análisis rápido de ventas e inventario.

**Performance:**
- Microsip directo: 8+ segundos ❌
- Supabase con ETL: < 100ms ✅

**Mejora: 80-100x más rápido** 🚀
