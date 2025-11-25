# Firebird Microsip Connector

Microservicio Node.js para conectar con base de datos Firebird de Microsip sin ODBC.

## Características

- ✅ Conexión directa TCP/IP a Firebird (puerto 3050)
- ✅ Sin dependencias nativas (no requiere fbclient.so)
- ✅ API REST completa para Microsip
- ✅ Autenticación con API Key
- ✅ Cache en memoria
- ✅ CORS configurable
- ✅ Docker ready

## Quick Start

### Desarrollo Local

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. Ejecutar servidor:
```bash
npm start
```

4. Probar conexión:
```bash
curl http://localhost:3001/health
```

### Con Docker

```bash
docker-compose up
```

## API Endpoints

### Health Check
```
GET /health
Response: { "status": "ok", "firebird": "connected" }
```

### Productos
```
GET /api/productos
GET /api/productos/:codigo
```

### Clientes
```
GET /api/clientes
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

## Autenticación

Todas las peticiones (excepto /health) requieren header:
```
X-API-Key: tu_api_key
```

## Variables de Entorno

Ver `.env.example` para todas las variables disponibles.

## Testing

```bash
npm test
```

## 🔍 Exploración de Base de Datos Microsip

### Listar todas las tablas disponibles
```bash
node test/list-tables.js
```

### Listar todas las vistas disponibles
```bash
node test/list-views.js
```

### Explorar estructura de una tabla
```bash
node test/explore-table.js ARTICULOS 10
```

### Explorar estructura de una vista
```bash
node test/explore-view.js Vw_ventas_2025 5
```

**📚 Ver [GUIA_VISTAS.md](./GUIA_VISTAS.md) para documentación completa sobre vistas de Microsip**

## Deploy en Coolify

1. Push a Git
2. Crear servicio en Coolify con docker-compose.yml
3. Configurar variables de entorno en Coolify
4. Deploy

## Troubleshooting

### Error: Connection refused
- Verificar firewall en servidor Firebird (puerto 3050)
- Verificar conectividad: `nc -zv 192.65.134.78 3050`

### Error: WireCrypt
- Deshabilitar en firebird.conf del servidor: `WireCrypt = Disabled`
