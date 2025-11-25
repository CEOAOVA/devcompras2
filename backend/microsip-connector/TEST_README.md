# 🧪 Prueba de Conexión a Firebird (Microsip)

Este script valida la conexión a la base de datos Firebird de Microsip y verifica la vista `Vw_ventas_2025`.

---

## 📋 Qué Prueba el Script

El script `test-connection.js` ejecuta **6 pruebas** automáticas:

### ✅ TEST 1: Verificar existencia de Vw_ventas_2025
- Busca la vista en el catálogo de Firebird
- Si no existe, sugiere vistas alternativas con nombres similares

### ✅ TEST 2: Obtener estructura de campos
- Lista todos los campos de la vista
- Muestra tipo de dato de cada campo (INTEGER, VARCHAR, DATE, etc.)
- Indica si el campo es obligatorio o permite NULL

### ✅ TEST 3: Contar registros totales
- Cuenta cuántos registros tiene la vista
- Alerta si la vista está vacía

### ✅ TEST 4: Obtener muestra de datos
- Extrae los primeros 5 registros
- Muestra todos los campos con valores reales
- Formatea fechas, montos y números

### ✅ TEST 5: Rango de fechas
- Obtiene la fecha más antigua y más reciente
- Cuenta cuántos días distintos tienen datos

### ✅ TEST 6: Listar sucursales
- Lista todas las sucursales con datos
- Muestra cuántos registros tiene cada sucursal

---

## 🚀 Cómo Ejecutar

### Opción 1: Desde la carpeta microsip-connector

```bash
cd C:\Users\Moises\Documents\TRABAJO\aova\embler\devcompras2\emblerecosistema\dev-optimizacionembler\backend\microsip-connector

# Instalar dependencias si no están instaladas
npm install

# Ejecutar el script de prueba
node test-connection.js
```

### Opción 2: Desde cualquier ubicación

```bash
node "C:\Users\Moises\Documents\TRABAJO\aova\embler\devcompras2\emblerecosistema\dev-optimizacionembler\backend\microsip-connector\test-connection.js"
```

---

## 📊 Salida Esperada (Ejemplo)

Si todo funciona correctamente, verás algo como esto:

```
🔌 PRUEBA DE CONEXIÓN A FIREBIRD (MICROSIP)

Configuración:
  Host: 192.65.134.78:3050
  Base de datos: C:\Microsip datos\EMBLER.FDB
  Usuario: ODBC
  Password: *********

🔄 Intentando conectar a Firebird...

✅ CONEXIÓN EXITOSA a Firebird

════════════════════════════════════════════════════════════

📋 TEST 1: Verificar existencia de Vw_ventas_2025

SQL: SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$RELATION_NAME = 'VW_VENTAS_2025'...

✅ Ejecutado exitosamente. Registros: 1

✅ Vista encontrada: VW_VENTAS_2025

════════════════════════════════════════════════════════════

📋 TEST 2: Obtener estructura de campos

SQL: SELECT RF.RDB$FIELD_NAME as CAMPO, F.RDB$FIELD_TYPE as TIPO_ID...

✅ Ejecutado exitosamente. Registros: 11

📊 ESTRUCTURA DE LA VISTA:

════════════════════════════════════════════════════════════
CAMPO                          | TIPO      | OBLIGATORIO
────────────────────────────────────────────────────────────
FECHA_VENTA                    | DATE      | SÍ
SUCURSAL_ID                    | INTEGER   | SÍ
SUCURSAL_NOMBRE                | VARCHAR   | NO
PRODUCTO_CODIGO                | VARCHAR   | SÍ
PRODUCTO_DESCRIPCION           | VARCHAR   | NO
CANTIDAD                       | DOUBLE    | SÍ
PRECIO_UNITARIO                | DOUBLE    | SÍ
TOTAL_VENTA                    | DOUBLE    | SÍ
CLIENTE_ID                     | INTEGER   | NO
CLIENTE_NOMBRE                 | VARCHAR   | NO
VENDEDOR                       | VARCHAR   | NO
════════════════════════════════════════════════════════════

Total de campos: 11

[... resto de pruebas ...]
```

---

## ⚠️ Posibles Errores y Soluciones

### Error: "Connection refused" o "unavailable database"

**Causas posibles:**
- El servidor Firebird no está corriendo
- El host o puerto son incorrectos (verifica: 192.65.134.78:3050)
- Firewall bloqueando el puerto 3050

**Solución:**
1. Verificar que el servidor Firebird esté activo
2. Hacer ping al host: `ping 192.65.134.78`
3. Verificar conectividad al puerto: `telnet 192.65.134.78 3050`
4. Revisar reglas de firewall

---

### Error: "Invalid username or password"

**Causas posibles:**
- Usuario o contraseña incorrectos en el archivo `.env`
- El usuario no tiene permisos en esta base de datos

**Solución:**
1. Verificar credenciales en `.env`:
   ```
   FIREBIRD_USER=ODBC
   FIREBIRD_PASSWORD=masterkey
   ```
2. Confirmar con el administrador de Microsip

---

### Error: "File not found" o "Unable to complete network request"

**Causas posibles:**
- La ruta de la base de datos es incorrecta
- El archivo `.FDB` no existe
- No hay permisos para leer el archivo

**Solución:**
1. Verificar ruta en `.env`:
   ```
   FIREBIRD_DATABASE=C:\Microsip datos\EMBLER.FDB
   ```
2. Confirmar que el archivo existe en esa ubicación
3. Verificar permisos de lectura

---

### Advertencia: "La vista Vw_ventas_2025 NO existe"

**Causas posibles:**
- El nombre de la vista es diferente
- La vista no ha sido creada en Microsip
- Estás conectado a la base de datos incorrecta

**Solución:**
1. El script automáticamente buscará vistas similares
2. Verifica el nombre exacto de la vista en Microsip
3. Consulta con el administrador del ERP

---

### Advertencia: "La vista existe pero no contiene datos"

**Causas posibles:**
- No hay ventas registradas para 2025
- Los datos están en otra vista o tabla
- Falta configuración en Microsip

**Solución:**
1. Verificar que existan ventas en Microsip
2. Confirmar el año correcto (2025)
3. Revisar otras vistas disponibles (Vw_ventas_2024, etc.)

---

## 🔍 Interpretación de Resultados

### Campos Esperados en Vw_ventas_2025

Según el controlador implementado, esperamos estos campos:

| Campo                  | Tipo    | Descripción                    |
|------------------------|---------|--------------------------------|
| FECHA_VENTA            | DATE    | Fecha de la transacción        |
| SUCURSAL_ID            | INTEGER | ID de la sucursal              |
| SUCURSAL_NOMBRE        | VARCHAR | Nombre de la sucursal          |
| PRODUCTO_CODIGO        | VARCHAR | Código del producto            |
| PRODUCTO_DESCRIPCION   | VARCHAR | Descripción del producto       |
| CANTIDAD               | DOUBLE  | Cantidad vendida               |
| PRECIO_UNITARIO        | DOUBLE  | Precio por unidad              |
| TOTAL_VENTA            | DOUBLE  | Total de la venta              |
| CLIENTE_ID             | INTEGER | ID del cliente                 |
| CLIENTE_NOMBRE         | VARCHAR | Nombre del cliente             |
| VENDEDOR               | VARCHAR | Nombre del vendedor            |

**Si los nombres difieren:**
- Toma nota de los nombres reales que devuelve el TEST 2
- Actualiza el archivo `ventasController.js` con los nombres correctos

---

## 📝 Qué Hacer Después de Ejecutar el Script

### 1. Si TODO está OK ✅

- ✅ La vista existe
- ✅ Tiene datos
- ✅ Los campos coinciden

**Siguiente paso:** Iniciar el servidor microsip-connector
```bash
npm run dev
```

Y probar los endpoints desde Postman/curl:
```bash
curl http://localhost:8003/api/ventas/kpis
```

---

### 2. Si los nombres de campos son DIFERENTES

**Ejemplo:** Si encuentras `FECHA_FACT` en lugar de `FECHA_VENTA`

1. Anota todos los nombres reales de campos (del TEST 2)
2. Abre `src/controllers/ventasController.js`
3. Actualiza los nombres en las queries SQL
4. Vuelve a ejecutar el test para validar

---

### 3. Si la vista NO EXISTE

1. Busca vistas alternativas en la salida del TEST 1
2. Si encuentra `VW_VENTAS_2024` o similar, úsala en su lugar
3. Actualiza `ventasController.js` con el nombre correcto
4. Vuelve a ejecutar el test

---

### 4. Si NO HAY CONEXIÓN

1. Verifica que Firebird esté corriendo en el servidor
2. Prueba conectividad de red: `ping 192.65.134.78`
3. Verifica puerto: `telnet 192.65.134.78 3050`
4. Revisa firewall y permisos

---

## 🛠️ Personalizar el Script

Si necesitas probar otras queries, edita el archivo y agrega nuevos tests:

```javascript
// Agregar TEST 7: Tu consulta personalizada
console.log('\n📋 TEST 7: Consulta personalizada\n');

const customSQL = `
  SELECT * FROM TU_TABLA
  WHERE CONDICION = 'VALOR'
`;

try {
  const result = await executeQuery(db, customSQL, 'Tu descripción');
  console.log(result);
} catch (error) {
  console.log('⚠️ Error en consulta personalizada\n');
}
```

---

## 📞 Soporte

Si encuentras problemas que no están documentados aquí:

1. Revisa los logs completos del script
2. Anota el mensaje de error exacto
3. Verifica la configuración en `.env`
4. Consulta con el administrador de Microsip

---

**Creado por:** Claude Code
**Fecha:** 2025-11-23
**Versión:** 1.0
