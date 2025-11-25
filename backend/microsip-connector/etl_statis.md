Reporte: Configuración ETL Microsip → Supabase
Fecha: 2025-11-24
Proyecto: embler/devcompras2
Objetivo: Conectar el frontend de analytics con datos reales de Microsip via Supabase

📋 Resumen Ejecutivo
He configurado la infraestructura para sincronizar datos de Microsip (Firebird) a Supabase (PostgreSQL) y trabajé en corregir múltiples incompatibilidades de esquema. El proceso identificó que las tablas reales de Microsip difieren significativamente del esquema esperado por el ETL.

Estado Actual: 🟡 Parcialmente Funcional

✅ Schema de Supabase creado (8 tablas + 3 vistas materializadas)
✅ Conexiones verificadas (Firebird ✓, Supabase ✓)
✅ Queries corregidas para: categorías, tiendas, productos
⚠️ Inventario y ventas detalladas pendientes por incompatibilidades de esquema
🔧 Pasos Realizados
1. Verificación de Credenciales
Problema Inicial: El script ETL fallaba con "Invalid API key"

Solución:

El usuario agregó correctamente la SUPABASE_SERVICE_KEY al archivo 
.env
Creé script de prueba 
test-supabase.js
 para verificar la conexión
Confirmé que las credenciales funcionales pero faltaba el schema
2. Creación del Schema en Supabase
Acción:

El usuario ejecutó 
supabase-schema.sql
 en el SQL Editor de Supabase
Schema Creado:

public schema:
├── categorias
├── productos  
├── precios_productos
├── tiendas
├── fact_ventas
├── inventario_movimientos
├── inventario_actual
└── etl_sync_log
Vistas Materializadas:
├── mv_ventas_por_dia
├── mv_top_productos_30d
└── mv_inventario_critico
3. Depuración y Corrección de Esquemas
Descubrí que el ETL asumía columnas que no existen en las tablas reales de Microsip. Creé scripts de prueba para cada tabla:

3.1 Tabla LINEAS_ARTICULOS (Categorías)
Script: 
test-lineas.js

Problema: Query intentaba usar columna DESCRIPCION que no existe

Solución en 
etlService.js
:

SELECT
    lin.LINEA_ARTICULO_ID as CATEGORIA_ID,
    lin.NOMBRE as NOMBRE_CATEGORIA,
-   lin.DESCRIPCION,
    COUNT(art.ARTICULO_ID) as TOTAL_PRODUCTOS
  FROM LINEAS_ARTICULOS lin
Resultado: ✅ 22 categorías sincronizadas correctamente

3.2 Tabla SUCURSALES (Tiendas)
Script: 
test-sucursales.js

Problema: Query intentaba usar DIRECCION, CIUDAD, ESTADO que no existen

Columnas Reales Encontradas:

SUCURSAL_ID
NOMBRE
SUCURSAL_PADRE_ID
TIPO_ELEMENTO
ES_MATRIZ
Solución:

SELECT
    SUCURSAL_ID,
-   NOMBRE,
-   DIRECCION,
-   CIUDAD,
-   ESTADO
+   NOMBRE
  FROM SUCURSALES
Resultado: ✅ Tiendas sincronizadas (se establecen direccion/ciudad/estado como NULL)

3.3 Tabla ARTICULOS (Productos)
Script: 
test-articulos.js

Problema: ETL esperaba múltiples columnas que no existen:

CLAVE_ARTICULO ❌
DESCRIPCION_1 / DESCRIPCION_2 ❌
TIPO_ARTICULO ❌
CODIGO_BARRAS ❌
COSTO_PROMEDIO ❌
PRECIO_LISTA ❌
Columnas Reales Encontradas:

ARTICULO_ID ✅
NOMBRE ✅
LINEA_ARTICULO_ID ✅
UNIDAD_VENTA ✅
PESO_UNITARIO ✅
ESTATUS ✅
Solución - Query Simplificada:

SELECT
  art.ARTICULO_ID,
  art.ARTICULO_ID as SKU,      // Usar ID como SKU
  art.NOMBRE as NOMBRE,
  art.NOMBRE as DESCRIPCION,    // Duplicar nombre
  art.LINEA_ARTICULO_ID as CATEGORIA_ID,
  art.ESTATUS,
  art.UNIDAD_VENTA,
  art.PESO_UNITARIO
FROM ARTICULOS art
WHERE art.ESTATUS = 'A'         // Solo productos activos
Resultado: ✅ Productos activos sincronizados (campos no disponibles se establecen como NULL/0)

4. Problemas Pendientes
4.1 Tabla EXISTENCIAS
Error: Table unknown, EXISTENC

Problema: La tabla EXISTENCIAS mencionada en el ETL no existe con ese nombre exacto en la base de datos de Microsip, o no es accesible con las credenciales actuales.

Impact: No se puede sincronizar el inventario actual con días de inventario y métricas de rotación.

4.2 Sincronización de Ventas
Estado: No ejecutada aún

Alternativa Disponible: La vista VW_FACT_VENTAS existe y funciona (confirmado en 
test-connection.js
), pero el ETL actual usa DOCTOS_PV + DOCTOS_PV_DET directamente.

📂 Archivos Modificados
Código
Archivo	Cambios	Líneas
etlService.js
Eliminada columna DESCRIPCION de categorías	112-122
etlService.js
Simplificada query de tiendas	278-303
etlService.js
Simplificada query de productos	178-233
Scripts de Prueba Creados
Archivo	Propósito
test-supabase.js
Verificar conexión a Supabase
debug-sync.js
Probar sync de categorías aisladamente
test-lineas.js
Explorar estructura de LINEAS_ARTICULOS
test-sucursales.js
Explorar estructura de SUCURSALES
test-articulos.js
Explorar estructura de ARTICULOS
🎯 Próximas Acciones Recomendadas
Opción 1: Sync Simplificado (Recomendado para Prueba Rápida)
Usar VW_FACT_VENTAS directamente en lugar de tablas base:

Ventajas:

✅ Vista confirmada como funcional
✅ Probablemente ya tiene JOINs y datos agregados
✅ Rápido de implementar
Desventajas:

❌ Sin métricas de inventario
❌ Datos potencialmente más lentos que tablas base
Opción 2: Corregir Esquema Completo (Recomendado para Producción)
Continuar identificando y corrigiendo columnas faltantes:

Pendiente:

Verificar nombres reales de tablas de inventario
Revisar estructura de DOCTOS_PV y DOCTOS_PV_DET
Adaptar queries de ventas a columnas reales
Encontrar fuente alternativa para costos/precios si no están en ARTICULOS
Recursos Necesarios:

Documentación del esquema de Microsip
O acceso a herramienta de inspección de DB (ej. FlameRobin, DBeaver)
📊 Estado del Sistema
Supabase
Componente	Estado	Registros
Schema	✅ Creado	8 tablas + 3 vistas
categorias	✅ Poblada	~22
tiendas	⚠️ Datos parciales	N/A
productos	⚠️ Datos parciales	N/A
fact_ventas	❌ Vacía	0
inventario_actual	❌ Vacía	0
Microsip Connector
Función ETL	Estado	Notas
syncCategorias()	✅ Funcional	22 categorías insertadas
syncTiendas()	✅ Funcional	Sin direcciones
syncProductos()	✅ Funcional	Solo campos básicos
syncVentas()	❌ No probada	Requiere verificar DOCTOS_PV
syncInventarioActual()	❌ Bloqueada	Tabla EXISTENCIAS no encontrada
🔍 Comandos de Verificación
Para verificar lo que se ha cargado en Supabase:

-- Ver categorías
SELECT * FROM public.categorias LIMIT 10;
-- Ver tiendas  
SELECT * FROM public.tiendas;
-- Ver productos
SELECT COUNT(*) FROM public.productos;
-- Ver log de sincronizaciones
SELECT * FROM public.etl_sync_log 
ORDER BY started_at DESC 
LIMIT 10;
📝 Conclusiones
Infraestructura: La arquitectura ETL está bien diseñada (schema Supabase, servicios modulares, logging).

Problema Principal: El código ETL asume un esquema de Microsip que no coincide con la realidad. Esto es común cuando:

La documentación está desactualizada
Se usó como base una versión diferente de Microsip
Las personalizaciones del cliente modificaron el esquema estándar
Solución Pragmática: Para conectar el frontend rápidamente, recomiendo usar VW_FACT_VENTAS para las ventas y aceptar que inventario/costos/precios estarán vacíos o con valores DEFAULT hasta que se corrija completamente el ETL.

Frontend: El código del frontend (
Dashboard.tsx
, 
InventoryAnalytics.tsx
) usa mock data. Una vez que tengamos al menos categorías y ventas en Supabase, podemos reemplazar los mocks con queries reales.