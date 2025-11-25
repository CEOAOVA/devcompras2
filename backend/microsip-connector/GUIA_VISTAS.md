# 👁️ Guía de Vistas de Microsip

## 📋 ¿Qué son las Vistas?

Las **vistas** en Microsip son consultas SQL pre-definidas que combinan múltiples tablas y calculan datos automáticamente. Son **mucho mejores** que consultar tablas directamente porque:

✅ Ya tienen los JOINs complejos resueltos
✅ Datos agregados y calculados (totales, subtotales, etc.)
✅ Más fácil de usar: `SELECT * FROM Vw_ventas_2025`
✅ Mantenidas por el equipo de Microsip
✅ Optimizadas para reportes

---

## 🔍 Scripts de Exploración

### 1. Listar todas las vistas disponibles

**Script:** `test/list-views.js`

**Uso:**
```bash
node test/list-views.js
```

**Qué hace:**
- Lista TODAS las vistas de usuario en Microsip
- Las agrupa por categoría:
  - 📊 Vistas de VENTAS
  - 📦 Vistas de ARTÍCULOS/PRODUCTOS
  - 👥 Vistas de CLIENTES
  - 📋 Otras vistas
- Muestra totales por categoría

**Ejemplo de salida:**
```
✅ Encontradas 47 vistas de usuario:

📊 VISTAS DE VENTAS:
    1. Vw_ventas_2025
    2. Vw_ventas_2024
    3. Vw_ventas_detalle

📦 VISTAS DE ARTÍCULOS/PRODUCTOS:
    1. Vw_articulos
    2. Vw_inventario

👥 VISTAS DE CLIENTES:
    1. Vw_clientes_activos
    2. Vw_clientes_cartera
```

---

### 2. Explorar estructura de una vista específica

**Script:** `test/explore-view.js`

**Uso:**
```bash
# Sintaxis
node test/explore-view.js NOMBRE_VISTA [limite]

# Ejemplos
node test/explore-view.js Vw_ventas_2025 5
node test/explore-view.js Vw_articulos 10
node test/explore-view.js Vw_clientes_activos
```

**Qué hace:**
1. Muestra la estructura completa (columnas y tipos)
2. Consulta datos de ejemplo
3. Formatea los resultados para fácil lectura
4. Genera SQL equivalente para usar en controladores

**Ejemplo de salida:**
```
👁️  Explorando vista: Vw_ventas_2025

📋 Estructura de Vw_ventas_2025:
   Total de columnas: 15

    1. FOLIO                        INTEGER
    2. FECHA                        DATE
    3. CLIENTE_ID                   INTEGER
    4. CLIENTE_NOMBRE               VARCHAR
    5. SUBTOTAL                     DOUBLE
    6. IVA                          DOUBLE
    7. TOTAL                        DOUBLE
    8. ESTATUS                      VARCHAR

📊 Primeros 5 registros:

--- Registro 1 ---
  FOLIO                         : 12345
  FECHA                         : 2025-10-01
  CLIENTE_ID                    : 567
  CLIENTE_NOMBRE                : "REFACCIONARIA LOS PINOS SA DE CV"
  SUBTOTAL                      : 5000.00
  IVA                           : 800.00
  TOTAL                         : 5800.00
  ESTATUS                       : "CONCLUIDO"
```

---

## 🛠️ Cómo Actualizar los Controladores

Una vez que explores las vistas, actualiza los controladores para usar las columnas reales.

### Ejemplo: Controlador de Ventas

**Archivo:** `src/controllers/ventasController.js`

**Antes (genérico):**
```javascript
let sql = `
  SELECT FIRST ${parseInt(limit)}
    ID,
    FECHA,
    CLIENTE_ID,
    TOTAL,
    ESTATUS
  FROM VENTAS  -- ❌ Tabla genérica
`;
```

**Después (usando vista real):**
```javascript
let sql = `
  SELECT FIRST ${parseInt(limit)}
    FOLIO,
    FECHA,
    CLIENTE_ID,
    CLIENTE_NOMBRE,
    SUBTOTAL,
    IVA,
    TOTAL,
    ESTATUS
  FROM Vw_ventas_2025  -- ✅ Vista real de Microsip
`;
```

---

## 📝 Nombres Comunes de Vistas en Microsip

Basado en la convención de Microsip, busca vistas con estos nombres:

### Ventas
- `Vw_ventas_2025` - Ventas del año actual
- `Vw_ventas_2024` - Ventas del año anterior
- `Vw_ventas_detalle` - Detalle de partidas
- `Vw_doctos_ve` - Documentos de venta

### Artículos/Productos
- `Vw_articulos` - Catálogo de artículos
- `Vw_inventario` - Existencias por almacén
- `Vw_existencias` - Stock disponible

### Clientes
- `Vw_clientes` - Catálogo de clientes
- `Vw_clientes_activos` - Clientes con actividad
- `Vw_cartera` - Saldos de clientes

### Compras
- `Vw_compras_2025` - Compras del año
- `Vw_proveedores` - Catálogo de proveedores

---

## 🚀 Flujo de Trabajo Recomendado

### 1. Descubrir vistas disponibles
```bash
node test/list-views.js
```

### 2. Explorar la vista que necesitas
```bash
# Para ventas
node test/explore-view.js Vw_ventas_2025 5

# Para artículos
node test/explore-view.js Vw_articulos 10

# Para clientes
node test/explore-view.js Vw_clientes 5
```

### 3. Actualizar el controlador correspondiente

**ventasController.js:**
- Cambiar tabla `VENTAS` → `Vw_ventas_2025`
- Usar nombres de columnas reales

**productosController.js:**
- Cambiar tabla `PRODUCTOS` → `Vw_articulos`
- Actualizar nombres de columnas

**clientesController.js:**
- Cambiar tabla `CLIENTES` → `Vw_clientes`
- Actualizar nombres de columnas

### 4. Probar el endpoint
```bash
# Iniciar servidor
npm start

# En otra terminal, probar con curl
curl -H "X-API-Key: tu_api_key_super_segura_cambiar_en_produccion" \
  http://localhost:3001/api/ventas?limit=10
```

---

## ⚠️ Notas Importantes

### Diferencia entre Tablas y Vistas

| Concepto | Tablas Base | Vistas |
|----------|-------------|--------|
| Ejemplo | `ARTICULOS`, `DOCTOS_VE` | `Vw_articulos`, `Vw_ventas_2025` |
| Complejidad | Requieren JOINs manuales | Ya tienen JOINs resueltos |
| Campos calculados | No | Sí (totales, subtotales) |
| Mantenimiento | Tu responsabilidad | Microsip lo mantiene |
| Uso recomendado | Inserts/Updates | Consultas/Reportes |

### Convención de Nombres

- Vistas empiezan con `Vw_` o `VW_`
- Incluyen el año: `Vw_ventas_2025`
- Usan minúsculas o MAYÚSCULAS según configuración de Microsip

### Filtrado por Fechas

Si la vista tiene columnas de fecha, puedes filtrar así:

```javascript
let sql = `SELECT * FROM Vw_ventas_2025`;
const conditions = [];

if (fecha_inicio) {
  conditions.push(`FECHA >= '${fecha_inicio}'`);
}

if (fecha_fin) {
  conditions.push(`FECHA <= '${fecha_fin}'`);
}

if (conditions.length > 0) {
  sql += ' WHERE ' + conditions.join(' AND ');
}
```

---

## 🔧 Troubleshooting

### Error: Vista no encontrada
```
❌ Vista "Vw_ventas_2025" no encontrada
```

**Solución:**
1. Ejecuta `node test/list-views.js` para ver las vistas disponibles
2. Verifica el nombre exacto (mayúsculas/minúsculas)
3. La vista puede tener otro nombre: `VW_VENTAS_2025` o `vw_ventas_2025`

### Error: Columna no existe
```
❌ Column unknown: CLIENTE_NOMBRE
```

**Solución:**
1. Ejecuta `node test/explore-view.js Vw_ventas_2025` para ver columnas reales
2. Actualiza el SQL con nombres exactos
3. Considera que Firebird usa MAYÚSCULAS para nombres de columnas

---

## 📊 Ejemplo Completo

### 1. Descubrir vistas de ventas
```bash
$ node test/list-views.js

📊 VISTAS DE VENTAS:
    1. Vw_ventas_2025
    2. Vw_ventas_2024
    3. Vw_ventas_detalle
```

### 2. Explorar estructura
```bash
$ node test/explore-view.js Vw_ventas_2025 3

📋 Estructura de Vw_ventas_2025:
   Total de columnas: 12

    1. FOLIO              INTEGER
    2. FECHA              DATE
    3. CLIENTE_NOMBRE     VARCHAR
    4. TOTAL              DOUBLE
```

### 3. Actualizar controlador

**src/controllers/ventasController.js:**
```javascript
async function listar(req, res, next) {
  try {
    const { fecha_inicio, fecha_fin, limit = 100 } = req.query;

    let sql = `
      SELECT FIRST ${parseInt(limit)}
        FOLIO,
        FECHA,
        CLIENTE_NOMBRE,
        TOTAL
      FROM Vw_ventas_2025
    `;

    const conditions = [];

    if (fecha_inicio) {
      conditions.push(`FECHA >= '${fecha_inicio}'`);
    }

    if (fecha_fin) {
      conditions.push(`FECHA <= '${fecha_fin}'`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY FECHA DESC';

    const ventas = await firebird.queryAsync(sql);

    res.json({
      data: ventas,
      count: ventas.length
    });
  } catch (error) {
    next(error);
  }
}
```

### 4. Probar endpoint
```bash
$ npm start
# En otra terminal
$ curl -H "X-API-Key: tu_api_key_super_segura_cambiar_en_produccion" \
  "http://localhost:3001/api/ventas?limit=5"
```

**Respuesta:**
```json
{
  "data": [
    {
      "FOLIO": 12345,
      "FECHA": "2025-10-07",
      "CLIENTE_NOMBRE": "REFACCIONARIA LOS PINOS",
      "TOTAL": 5800.00
    }
  ],
  "count": 5
}
```

---

## ✅ Checklist de Implementación

- [ ] Ejecutar `node test/list-views.js`
- [ ] Identificar vistas de:
  - [ ] Ventas (Vw_ventas_2025)
  - [ ] Artículos (Vw_articulos)
  - [ ] Clientes (Vw_clientes)
- [ ] Explorar cada vista con `explore-view.js`
- [ ] Actualizar controladores:
  - [ ] ventasController.js
  - [ ] productosController.js
  - [ ] clientesController.js
- [ ] Probar endpoints con `npm start`
- [ ] Verificar datos reales en respuestas

---

## 📚 Referencias

- **INSTRUCCIONES.md** - Guía de instalación y configuración inicial
- **test/list-tables.js** - Para explorar tablas base (553 tablas)
- **test/explore-table.js** - Para explorar estructura de tablas
- **test/list-views.js** - Para listar vistas disponibles (este documento)
- **test/explore-view.js** - Para explorar estructura de vistas

---

¡Todo listo para trabajar con las vistas de Microsip! 🎉
