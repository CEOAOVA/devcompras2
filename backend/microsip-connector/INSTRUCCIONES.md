# 🚀 Instrucciones de Uso - Firebird Microsip Connector

## ✅ Proyecto Creado Exitosamente!

Tu microservicio Node.js está listo en:
`c:\Users\Moises\Documents\TRABAJO\aova\embler\devcomprasnodeprueba`

---

## 📋 Pasos para Ejecutar

### 1. Instalar Node.js (si no lo tienes)

Descargar de: https://nodejs.org/ (versión LTS 18.x o superior)

### 2. Abrir Terminal en el Proyecto

```bash
# En Windows PowerShell o CMD
cd c:\Users\Moises\Documents\TRABAJO\aova\embler\devcomprasnodeprueba
```

### 3. Instalar Dependencias

```bash
npm install
```

Esto instalará:
- node-firebird (cliente Firebird sin dependencias nativas)
- express (servidor web)
- cors, helmet (seguridad)
- dotenv (variables de entorno)

### 4. Configurar Variables de Entorno

El archivo `.env` ya está creado con tus credenciales. Verifica que sea correcto:

```env
FIREBIRD_HOST=192.65.134.78
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\\Microsip datos\\EMBLER.FDB
FIREBIRD_USER=ODBC
FIREBIRD_PASSWORD=OD12345
```

**IMPORTANTE:** Cambia `API_KEY` por algo seguro en producción!

### 5. Probar Conexión a Firebird

```bash
npm test
```

**Resultado esperado:**
```
✅ Conexión exitosa a Firebird Microsip!
📋 Primeras 5 tablas del sistema:
  1. RDB$RELATIONS
  2. RDB$FIELDS
  ...
```

**Si falla con error de conexión:**
- Verificar que 192.65.134.78:3050 sea accesible
- Probar: `telnet 192.65.134.78 3050`
- Verificar firewall en servidor Microsip

**Si falla con error WireCrypt:**
- Ver sección "Troubleshooting" abajo

### 6. Iniciar Servidor

```bash
npm start
```

**Salida esperada:**
```
=================================
🚀 Firebird Connector running
📍 Port: 3001
🌍 Environment: development
🔗 Firebird: 192.65.134.78:3050
=================================
```

### 7. Probar API

**Sin autenticación (health check):**
```bash
# En otra terminal
curl http://localhost:3001/health
```

Respuesta:
```json
{
  "status": "ok",
  "firebird": "connected",
  "timestamp": "2025-10-07T..."
}
```

**Con autenticación (productos):**
```bash
curl -H "X-API-Key: tu_api_key_super_segura_cambiar_en_produccion" \
  http://localhost:3001/api/productos?limit=10
```

---

## 📚 Endpoints Disponibles

### Health Check (sin autenticación)
```
GET /health
```

### Productos (requiere API Key)
```
GET /api/productos?limit=100&offset=0&search=filtro
GET /api/productos/:codigo
```

### Clientes
```
GET /api/clientes?limit=100
GET /api/clientes/:id
```

### Inventario
```
GET /api/inventario
GET /api/inventario/:codigo
```

### Ventas
```
GET /api/ventas?fecha_inicio=2024-01-01&fecha_fin=2024-12-31
```

---

## 🔐 Autenticación

Todas las rutas `/api/*` requieren header:
```
X-API-Key: tu_api_key_super_segura_cambiar_en_produccion
```

---

## 🐛 Troubleshooting

### Error: Connection refused / ECONNREFUSED
**Causa:** No se puede conectar al servidor Firebird

**Soluciones:**
1. Verificar que Firebird esté corriendo en 192.65.134.78:3050
2. Verificar firewall:
   ```bash
   # Desde tu PC
   telnet 192.65.134.78 3050
   # O
   nc -zv 192.65.134.78 3050
   ```
3. Verificar que el puerto 3050 esté abierto en el firewall del servidor

### Error: WireCrypt plugin error / Required / Disabled
**Causa:** Firebird 3.0+ tiene encriptación habilitada por defecto

**Solución 1 (Recomendada):** Deshabilitar WireCrypt en servidor Microsip
```
# En C:\Program Files\Firebird\Firebird_3_0\firebird.conf
WireCrypt = Disabled
```
Reiniciar servicio Firebird

**Solución 2:** Actualizar node-firebird a versión que soporte WireCrypt

### Error: Cannot find module 'node-firebird'
**Causa:** Dependencias no instaladas

**Solución:**
```bash
npm install
```

### Error: API Key inválida
**Causa:** Header X-API-Key no coincide con .env

**Solución:** Verificar que el header sea exactamente igual a `API_KEY` en `.env`

---

## 🐳 Deploy con Docker

### Opción 1: Docker Compose (Local)
```bash
docker-compose up
```

### Opción 2: Deploy en Coolify

1. Push a Git:
```bash
git init
git add .
git commit -m "Initial commit - Firebird connector"
git remote add origin TU_REPO
git push -u origin main
```

2. En Coolify:
   - Crear nuevo servicio
   - Seleccionar docker-compose.yml
   - Configurar variables de entorno
   - Deploy

**Variables de entorno en Coolify:**
```
FIREBIRD_HOST=192.65.134.78
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\\Microsip datos\\EMBLER.FDB
FIREBIRD_USER=ODBC
FIREBIRD_PASSWORD=OD12345
API_KEY=generar_key_segura_aqui
ALLOWED_ORIGINS=https://dev-comprasprueba.aova.mx
```

---

## 🔄 Siguientes Pasos

### 1. Explorar Base de Datos Microsip

El código actual usa nombres genéricos (PRODUCTOS, CLIENTES, VENTAS).
Necesitas descubrir las tablas y vistas reales de Microsip.

**Descubrir tablas:**
```bash
node test/list-tables.js
```

**Descubrir vistas (RECOMENDADO):**
```bash
node test/list-views.js
```

**Explorar estructura de una vista:**
```bash
node test/explore-view.js Vw_ventas_2025 5
```

**📚 Ver [GUIA_VISTAS.md](./GUIA_VISTAS.md) para guía completa de vistas**

Las vistas son mejores que las tablas porque ya tienen JOINs y cálculos resueltos.

Luego actualizar controladores con nombres correctos.

### 2. Integración con DevCompras Backend

Una vez funcionando, integrar con tu backend Python:

**En devcompras/backend/services/microsip_client.py:**
```python
import httpx

class MicrosipClient:
    def __init__(self):
        self.base_url = "http://localhost:3001"
        self.api_key = os.getenv("MICROSIP_API_KEY")

    async def get_productos(self):
        headers = {"X-API-Key": self.api_key}
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/productos",
                headers=headers
            )
            return response.json()
```

### 3. Caché en Supabase

Implementar cache para reducir carga en Firebird.

---

## 📞 Soporte

Si encuentras errores o necesitas ayuda:
1. Revisar logs del servidor
2. Verificar conectividad con Firebird
3. Consultar documentación de Firebird

---

## ✨ Estructura del Proyecto

```
devcomprasnodeprueba/
├── .env                      # ✅ Configuración
├── package.json              # ✅ Dependencias
├── docker-compose.yml        # ✅ Docker
├── README.md                 # ✅ Documentación
│
├── src/
│   ├── index.js             # ✅ Punto entrada
│   ├── config.js            # ✅ Configuración
│   ├── firebird.js          # ✅ Cliente Firebird
│   ├── server.js            # ✅ Servidor Express
│   │
│   ├── middleware/
│   │   ├── auth.js          # ✅ Autenticación
│   │   └── errorHandler.js  # ✅ Manejo errores
│   │
│   ├── routes/
│   │   ├── health.js        # ✅ Health check
│   │   ├── productos.js     # ✅ Rutas productos
│   │   ├── clientes.js      # ✅ Rutas clientes
│   │   ├── inventario.js    # ✅ Rutas inventario
│   │   └── ventas.js        # ✅ Rutas ventas
│   │
│   └── controllers/
│       ├── productosController.js     # ✅ Lógica productos
│       ├── clientesController.js      # ✅ Lógica clientes
│       ├── inventarioController.js    # ✅ Lógica inventario
│       └── ventasController.js        # ✅ Lógica ventas
│
└── test/
    └── connection.test.js    # ✅ Test conexión
```

---

¡Todo listo para empezar! 🎉
