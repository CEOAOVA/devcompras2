# ARQUITECTURA E INTEGRACIÓN - DEVCOMPRAS2
## Sistema Empresarial Integrado con ERP, ML y Procesamiento de Archivos

**Fecha**: 2025-01-16
**Versión**: 1.0

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General de Arquitectura](#visión-general-de-arquitectura)
2. [Stack Tecnológico Completo](#stack-tecnológico-completo)
3. [Servicios y Puertos](#servicios-y-puertos)
4. [Diagramas de Arquitectura](#diagramas-de-arquitectura)
5. [Flujos de Datos](#flujos-de-datos)
6. [Modelos de Datos](#modelos-de-datos)
7. [APIs y Contratos](#apis-y-contratos)
8. [Seguridad](#seguridad)
9. [Performance y Escalabilidad](#performance-y-escalabilidad)
10. [Deployment](#deployment)

---

## VISIÓN GENERAL DE ARQUITECTURA

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Shell App   │  │  Analytics   │  │  Logistics   │      │
│  │  (Host)      │  │  Module      │  │  Module      │      │
│  │  Port 3000   │  │  Port 3002   │  │  (Future)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                  │                                 │
│         └──────────────────┼─────────────────────────────────┤
│                            │  Module Federation (Webpack 5)  │
└────────────────────────────┼─────────────────────────────────┘
                             │
                        HTTP/REST
                        WebSocket
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                     API GATEWAY LAYER                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Fastify API Gateway (Port 3001)             │   │
│  │                                                       │   │
│  │  ┌────────┐ ┌────────┐ ┌──────┐ ┌─────────┐        │   │
│  │  │  Auth  │ │  CRUD  │ │ Sync │ │ AI Query│        │   │
│  │  │ Routes │ │ Routes │ │Routes│ │  Routes │        │   │
│  │  └────────┘ └────────┘ └──────┘ └─────────┘        │   │
│  │                                                       │   │
│  │  Middleware: JWT, CORS, Rate Limit, Helmet          │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┼─────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐
│  Python         │  │  Microsip    │  │  ML Service     │
│  Processor      │  │  Connector   │  │  (FastAPI)      │
│  (FastAPI)      │  │  (Express)   │  │  Port 8001      │
│  Port 8002      │  │  Port 8003   │  │                 │
│                 │  │              │  │  ┌───────────┐  │
│  ┌───────────┐  │  │  ┌────────┐ │  │  │ Random    │  │
│  │  Excel    │  │  │  │Firebird│ │  │  │ Forest    │  │
│  │Processor  │  │  │  │ Pool   │ │  │  │ Model     │  │
│  └───────────┘  │  │  └────┬───┘ │  │  └───────────┘  │
└─────────────────┘  └───────┼─────┘  └─────────────────┘
                             │
                             ▼
                     ┌───────────────┐
                     │   Firebird    │
                     │   Microsip    │
                     │   Port 3050   │
                     └───────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      DATA & CACHE LAYER                      │
│                                                               │
│  ┌─────────────────┐         ┌──────────────────────┐       │
│  │   PostgreSQL    │         │       Redis          │       │
│  │   (Supabase)    │         │    Port 6379         │       │
│  │   Port 5432     │         │                      │       │
│  │                 │         │  ┌────────────────┐  │       │
│  │  ┌──────────┐  │         │  │  Cache Layer   │  │       │
│  │  │ erp_*    │  │         │  │  Sessions      │  │       │
│  │  │ tables   │  │         │  │  Bull Queue    │  │       │
│  │  │          │  │         │  │  Pub/Sub       │  │       │
│  │  │ pgVector │  │         │  └────────────────┘  │       │
│  │  └──────────┘  │         └──────────────────────┘       │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## STACK TECNOLÓGICO COMPLETO

### Frontend Stack

#### Shell App (Host - Micro-Frontend)
```json
{
  "framework": "React 18.2.0",
  "language": "TypeScript 5.3.3",
  "build": "Webpack 5.89.0 + Module Federation Plugin",
  "routing": "React Router 6.21.3",
  "state": "Zustand 4.5.0",
  "data-fetching": "TanStack React Query 5.17.19",
  "forms": "React Hook Form + Zod",
  "ui": "TailwindCSS 3.4.1 + shadcn/ui",
  "charts": "Recharts 2.12.0",
  "icons": "lucide-react",
  "notifications": "react-hot-toast",
  "file-upload": "react-dropzone"
}
```

#### Analytics Module (Remote - Micro-Frontend)
```json
{
  "framework": "React 18.2.0",
  "build": "Webpack 5 + Module Federation Plugin",
  "shared-deps": ["react", "react-dom", "react-router-dom", "react-query"]
}
```

### Backend Stack

#### API Gateway (Fastify)
```json
{
  "runtime": "Node.js 18+",
  "framework": "Fastify 4.26.0",
  "language": "TypeScript 5.3.3",
  "orm": "Prisma 5.8.1",
  "database-client": "Supabase JS 2.39.3",
  "cache": "ioredis 5.3.2",
  "queue": "Bull 4.11.5",
  "websockets": "@fastify/websocket 10.0.1",
  "auth": "@fastify/jwt 8.0.0",
  "security": "@fastify/helmet 11.1.1 + @fastify/cors 9.0.1",
  "rate-limiting": "@fastify/rate-limit 9.1.0",
  "validation": "Zod 3.22.4",
  "ai": "OpenAI 4.20.0",
  "http-client": "axios 1.6.0",
  "logging": "pino + pino-pretty"
}
```

#### Python Processor (FastAPI)
```python
{
  "framework": "FastAPI 0.108.0",
  "server": "uvicorn[standard] 0.24.0",
  "language": "Python 3.11+",
  "data": "pandas 2.1.4",
  "excel": "openpyxl 3.1.2",
  "file-handling": "python-multipart 0.0.6",
  "database": "supabase 2.0.2",
  "validation": "pydantic 2.5.0"
}
```

#### Microsip Connector (Express)
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express 4.18.2",
  "database": "node-firebird 1.1.9",
  "security": "helmet 7.1.0",
  "logging": "morgan 1.10.0",
  "config": "dotenv 16.3.1"
}
```

#### ML Service (FastAPI)
```python
{
  "framework": "FastAPI 0.108.0",
  "language": "Python 3.11+",
  "ml-libs": [
    "scikit-learn 1.3.2",
    "pandas 2.1.4",
    "numpy 1.26.2",
    "joblib 1.3.2"
  ],
  "optional": [
    "tensorflow 2.15.0",
    "torch 2.1.2",
    "xgboost 2.0.3"
  ]
}
```

### Database & Infrastructure

```yaml
Database:
  Primary: PostgreSQL 15 (Supabase)
  Extensions:
    - uuid-ossp
    - pgVector (embeddings)
    - pg_cron (scheduled jobs)

Cache & Queue:
  Redis: 7.x
  Uses:
    - Session storage
    - Query cache (TTL: 5-30min)
    - Bull Queue jobs
    - Pub/Sub for WebSocket

Storage:
  Supabase Storage:
    - Buckets: csv-uploads, excel-files, pdf-reports, ml-models
```

---

## SERVICIOS Y PUERTOS

### Tabla de Servicios

| Servicio | Tecnología | Puerto | Propósito | Dependencias |
|----------|-----------|--------|-----------|--------------|
| Shell App | React + Webpack | 3000 | Frontend host, layout principal | API Gateway |
| Analytics Module | React + Webpack | 3002 | Micro-frontend de analítica | Shell App |
| API Gateway | Fastify | 3001 | Orquestador, auth, routing | PostgreSQL, Redis, Python Processor, Microsip Connector, ML Service |
| Python Processor | FastAPI | 8002 | Procesamiento de Excel/PDFs | Supabase |
| Microsip Connector | Express | 8003 | Conexión a Firebird ERP | Firebird Microsip |
| ML Service | FastAPI | 8001 | Predicciones de demanda | - |
| PostgreSQL | Supabase | 5432 | Base de datos principal | - |
| Redis | Redis | 6379 | Cache, sessions, queue | - |
| Firebird Microsip | Firebird | 3050 | ERP Database (externo) | - |
| Nginx | Nginx | 80/443 | Reverse proxy | Todos |

### URLs de Desarrollo

```bash
# Frontend
http://localhost:3000              # Shell App
http://localhost:3002              # Analytics Module

# Backend
http://localhost:3001              # API Gateway
http://localhost:3001/api/health   # Health check
http://localhost:8002              # Python Processor
http://localhost:8003              # Microsip Connector
http://localhost:8001              # ML Service

# Infraestructura
http://localhost:6379              # Redis (no HTTP)
http://localhost:5432              # PostgreSQL (no HTTP)

# Admin tools
http://localhost:8080              # Adminer (DB admin)
```

### URLs de Producción (Propuestas)

```bash
# Frontend
https://app.embler.mx              # Shell App principal

# Backend
https://api.embler.mx              # API Gateway
https://api.embler.mx/health       # Health check

# Admin
https://admin.embler.mx            # Panel admin
```

---

## DIAGRAMAS DE ARQUITECTURA

### Diagrama 1: Flujo de Sincronización ERP → Supabase

```
┌─────────────┐
│   Cron Job  │  Bull Queue: cada 6 horas
│  (Bull)     │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│    ErpSyncService.syncProductos()    │
│                                      │
│  1. Crear SyncJob en BD             │
│  2. GET Microsip Connector          │
│  3. Procesar batch (upsert)         │
│  4. Actualizar SyncJob              │
│  5. Emitir WebSocket event          │
└──────┬───────────────┬───────────────┘
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────────┐
│  Microsip   │  │   Supabase      │
│  Connector  │  │   PostgreSQL    │
│             │  │                 │
│  GET /api/  │  │  UPSERT         │
│  productos  │  │  erp_productos  │
│             │  │                 │
│  ┌────────┐ │  │  ┌────────────┐│
│  │Firebird│ │  │  │ pgVector   ││
│  │  Pool  │ │  │  │ RLS        ││
│  └────────┘ │  │  └────────────┘│
└─────────────┘  └─────────────────┘
       │
       ▼
┌─────────────────────┐
│   Firebird DB       │
│   (Microsip ERP)    │
│                     │
│   Vw_articulos      │
│   Vw_inventario     │
│   Vw_ventas_2025    │
│   Vw_clientes       │
└─────────────────────┘
```

### Diagrama 2: Flujo de Query con IA (Multiagente)

```
Usuario: "Productos con stock bajo"
       │
       ▼
┌─────────────────────────────────────────┐
│      POST /api/ai/query                 │
│      API Gateway                        │
└──────────┬──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────┐
│     Agent Orchestrator                   │
│                                          │
│  Coordina 4 agentes en secuencia        │
└──┬────────┬────────┬────────┬───────────┘
   │        │        │        │
   │ 1      │ 2      │ 3      │ 4
   ▼        ▼        ▼        ▼
┌────────┐┌───────┐┌────────┐┌──────────┐
│Schema  ││ SQL   ││Execute ││Formatting│
│Agent   ││Agent  ││Agent   ││Agent     │
└────┬───┘└───┬───┘└───┬────┘└────┬─────┘
     │        │        │          │
     │        │        │          │
┌────▼────────▼────────▼──────────▼──────┐
│         OpenAI GPT-4 API                │
│                                         │
│  System: "Conoce schema de Firebird"   │
│  User: "Productos con stock bajo"      │
│                                         │
│  Response: { sql, explanation }        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   Validation    │
         │                 │
         │  ✓ Solo SELECT  │
         │  ✗ DROP/DELETE  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Microsip       │
         │  Connector      │
         │                 │
         │  POST /api/     │
         │  query/execute  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Firebird DB    │
         │                 │
         │  Execute SQL    │
         │  Return results │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────────────┐
         │  Response to Frontend   │
         │                         │
         │  {                      │
         │    query: { ... },      │
         │    data: [...],         │
         │    metadata: { ... }    │
         │  }                      │
         └─────────────────────────┘
```

### Diagrama 3: Flujo de Upload de Excel

```
Usuario arrastra Excel
       │
       ▼
┌─────────────────────────┐
│  FileUpload.tsx         │
│  (React Dropzone)       │
└──────────┬──────────────┘
           │ FormData
           ▼
┌─────────────────────────────────┐
│  POST /api/inventory/upload     │
│  API Gateway (Fastify)          │
│                                 │
│  1. Validar tipo (.xlsx, .xls) │
│  2. Validar tamaño (<10MB)     │
│  3. Guardar temporal            │
└──────────┬──────────────────────┘
           │ Proxy request
           ▼
┌──────────────────────────────────┐
│  Python Processor (FastAPI)     │
│  POST /process-excel             │
│                                  │
│  1. FileDetector.detect_type()  │
│  2. WebSafeExcelFixer.fix()     │
│  3. clean_excel_stock/ventas()  │
│  4. get_sucursal()              │
│  5. date_range_extractor()      │
└──────────┬───────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌─────────┐  ┌──────────────┐
│Supabase │  │  Supabase    │
│ Storage │  │  PostgreSQL  │
│         │  │              │
│ Upload  │  │  INSERT INTO │
│ original│  │  erp_*       │
│ Excel   │  │  tables      │
└─────────┘  └──────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  WebSocket    │
            │  Event        │
            │               │
            │  'upload:     │
            │   completed'  │
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │  Frontend     │
            │  Auto-refresh │
            │  Inventory    │
            └───────────────┘
```

### Diagrama 4: Arquitectura de Micro-Frontend (Module Federation)

```
┌─────────────────────────────────────────────────────────┐
│                  Browser Window                          │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │  Shell App (Host) - localhost:3000             │    │
│  │                                                 │    │
│  │  ┌──────────────────────────────────────────┐ │    │
│  │  │  App.tsx (Main Container)                │ │    │
│  │  │                                          │ │    │
│  │  │  <Layout>                                │ │    │
│  │  │    <Sidebar>                             │ │    │
│  │  │    <Routes>                              │ │    │
│  │  │      /dashboard → Dashboard.tsx          │ │    │
│  │  │      /inventory → InventoryPage.tsx      │ │    │
│  │  │      /ai-query  → AIQueryPage.tsx        │ │    │
│  │  │      /analytics/* → Analytics Module     │ │    │
│  │  │    </Routes>                             │ │    │
│  │  │  </Layout>                               │ │    │
│  │  └──────────────┬───────────────────────────┘ │    │
│  │                 │                             │    │
│  │                 │ Lazy load via Module        │    │
│  │                 │ Federation                  │    │
│  │                 │                             │    │
│  │                 ▼                             │    │
│  │  ┌──────────────────────────────────────────┐ │    │
│  │  │  Analytics Module (Remote) - :3002       │ │    │
│  │  │                                          │ │    │
│  │  │  const AnalyticsApp = React.lazy(() =>  │ │    │
│  │  │    import('analytics/App')               │ │    │
│  │  │  );                                      │ │    │
│  │  │                                          │ │    │
│  │  │  Exposed components:                     │ │    │
│  │  │  - Dashboard                             │ │    │
│  │  │  - DemandPrediction                      │ │    │
│  │  │  - InventoryAnalytics                    │ │    │
│  │  └──────────────────────────────────────────┘ │    │
│  │                                                 │    │
│  │  Shared Dependencies (Singleton):              │    │
│  │  - react (18.2.0)                              │    │
│  │  - react-dom                                   │    │
│  │  - react-router-dom                            │    │
│  │  - @tanstack/react-query                       │    │
│  │  - zustand                                     │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## FLUJOS DE DATOS

### Flujo 1: Autenticación (JWT)

```
1. POST /api/auth/login
   Body: { email, password }

2. AuthService.validateCredentials()
   - Query Supabase profiles
   - bcrypt.compare(password, hash)

3. Generate JWT
   - Payload: { id, email, role }
   - Secret: process.env.JWT_SECRET
   - Expiry: 7 days

4. Store refresh token in Redis
   - Key: `refresh:${userId}`
   - Value: refreshToken
   - TTL: 30 days

5. Response
   {
     token: "eyJhbGc...",
     user: { id, email, name, role },
     expiresIn: 604800
   }

6. Frontend stores token
   - localStorage.setItem('token', token)
   - Set Authorization header

7. Subsequent requests
   - Header: "Authorization: Bearer eyJhbGc..."
   - Middleware verifies JWT
   - Extract user from payload
   - Attach to request.user
```

### Flujo 2: Sincronización Incremental

```
1. Trigger (manual o cron)
   - POST /api/sync/productos?incremental=true

2. ErpSyncService.syncProductos(incremental=true)

3. Query última sincronización
   - SELECT MAX(last_synced_at) FROM erp_productos

4. Obtener productos nuevos/modificados del ERP
   - GET /api/productos?modifiedAfter=<timestamp>
   - Microsip Connector → Firebird
   - WHERE fecha_modificacion > <timestamp>

5. Batch upsert (chunks de 100)
   for chunk in chunks(productos, 100):
     await prisma.erpProducto.upsert({
       where: { codigo: producto.CODIGO },
       update: { nombre, precio, lastSyncedAt },
       create: { codigo, nombre, precio, lastSyncedAt }
     })

6. Actualizar SyncJob
   - records_processed
   - records_created
   - records_updated

7. Emit WebSocket event
   - 'sync:completed'
   - { type: 'productos', recordsCreated, recordsUpdated }

8. Frontend auto-refresh
   - queryClient.invalidateQueries(['inventory'])
```

### Flujo 3: Predicción de Demanda con ML

```
1. Usuario selecciona producto
   - Frontend: AIQueryPage.tsx
   - Select: numero_parte = "ABC123"
   - Input: days_ahead = 30

2. POST /api/predictions/demand
   Body: { numero_parte, days_ahead }

3. API Gateway valida y proxy
   - Validar con Zod
   - POST http://localhost:8001/predict

4. ML Service procesa
   a. Obtener datos históricos
      - Query Supabase: ventas de ABC123
      - Últimos 90 días

   b. Feature engineering
      - Lags (t-1, t-7, t-14, t-30)
      - Moving averages (7d, 14d, 30d)
      - Tendencia
      - Día de semana, mes, trimestre

   c. Cargar modelo
      - joblib.load('models/demand_predictor.joblib')

   d. Predecir
      - predictions = model.predict(features)
      - confidence_interval = calcular_intervalo()

   e. Formatear respuesta
      {
        producto: "ABC123",
        predicciones: [
          { fecha, demanda_estimada, confidence_low, confidence_high }
        ],
        metricas: { mae, rmse, r2 }
      }

5. API Gateway retorna al frontend

6. Frontend renderiza
   - Recharts: LineChart
   - Área de confianza (shaded)
   - Tabla de valores
```

---

## MODELOS DE DATOS

### ERD (Entity Relationship Diagram)

```
┌─────────────────────┐
│   erp_productos     │
├─────────────────────┤
│ id (PK)             │
│ codigo (UNIQUE)     │──┐
│ nombre              │  │
│ descripcion         │  │
│ precio              │  │
│ costo               │  │
│ categoria           │  │
│ unidad_medida       │  │
│ activo              │  │
│ erp_id              │  │
│ last_synced_at      │  │
│ sync_status         │  │
│ created_at          │  │
│ updated_at          │  │
└─────────────────────┘  │
                         │ 1:N
                         │
            ┌────────────┘
            │
            ▼
┌─────────────────────┐       ┌─────────────────────┐
│   erp_inventario    │       │     erp_ventas      │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ producto_id (FK)    │       │ folio (UNIQUE)      │
│ almacen             │       │ fecha               │
│ stock_actual        │       │ cliente_id (FK)     │──┐
│ stock_minimo        │       │ cliente_nombre      │  │
│ stock_maximo        │       │ subtotal            │  │
│ ubicacion           │       │ iva                 │  │
│ last_synced_at      │       │ total               │  │
│ created_at          │       │ estatus             │  │
│ updated_at          │       │ last_synced_at      │  │
└─────────────────────┘       │ created_at          │  │
                              └─────────────────────┘  │
                                                       │ N:1
                                                       │
                                          ┌────────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │   erp_clientes      │
                              ├─────────────────────┤
                              │ id (PK)             │
                              │ erp_id (UNIQUE)     │
                              │ nombre              │
                              │ rfc                 │
                              │ email               │
                              │ telefono            │
                              │ direccion           │
                              │ last_synced_at      │
                              │ created_at          │
                              │ updated_at          │
                              └─────────────────────┘


┌─────────────────────┐
│     sync_jobs       │
├─────────────────────┤
│ id (PK)             │
│ job_type            │  ← 'productos', 'inventario', 'ventas', 'clientes'
│ status              │  ← 'pending', 'running', 'completed', 'failed'
│ records_processed   │
│ records_created     │
│ records_updated     │
│ records_failed      │
│ error_message       │
│ started_at          │
│ completed_at        │
│ created_at          │
└─────────────────────┘
```

### Schemas de Validación (Zod)

#### Producto
```typescript
const ProductoSchema = z.object({
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(1).max(255),
  descripcion: z.string().optional(),
  precio: z.number().positive().optional(),
  costo: z.number().positive().optional(),
  categoria: z.string().optional(),
  unidadMedida: z.string().optional(),
  activo: z.boolean().default(true)
});
```

#### Inventario
```typescript
const InventarioSchema = z.object({
  productoId: z.string().uuid(),
  almacen: z.string().min(1),
  stockActual: z.number().int().min(0),
  stockMinimo: z.number().int().min(0),
  stockMaximo: z.number().int().positive().optional(),
  ubicacion: z.string().optional()
});
```

#### AI Query
```typescript
const AIQuerySchema = z.object({
  query: z.string().min(3).max(500),
  limit: z.number().int().positive().max(1000).default(100),
  cache: z.boolean().default(true)
});
```

---

## APIS Y CONTRATOS

### API Gateway Endpoints

#### Authentication

**POST /api/auth/login**
```typescript
Request:
{
  email: string;
  password: string;
}

Response (200):
{
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  expiresIn: number;
}

Errors:
- 400: Invalid credentials
- 429: Too many requests
```

**POST /api/auth/register**
```typescript
Request:
{
  email: string;
  password: string;
  name: string;
}

Response (201):
{
  user: { id, email, name };
  token: string;
}

Errors:
- 400: Email already exists
- 422: Validation error
```

#### Inventory

**GET /api/inventory**
```typescript
Query Params:
{
  page?: number;          // default: 1
  limit?: number;         // default: 20, max: 100
  search?: string;        // buscar en codigo/nombre
  categoria?: string;
  almacen?: string;
  stockBajo?: boolean;    // stock_actual < stock_minimo
}

Response (200):
{
  data: ErpProducto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

**GET /api/inventory/:id**
```typescript
Response (200):
{
  producto: ErpProducto;
  inventario: ErpInventario[];
}

Errors:
- 404: Producto not found
```

**POST /api/inventory**
```typescript
Request:
{
  codigo: string;
  nombre: string;
  precio?: number;
  costo?: number;
  categoria?: string;
  unidadMedida?: string;
}

Response (201):
{
  producto: ErpProducto;
}

Errors:
- 409: Producto con codigo ya existe
- 422: Validation error
```

**PUT /api/inventory/:id**
```typescript
Request:
Partial<ErpProducto>

Response (200):
{
  producto: ErpProducto;
}
```

**DELETE /api/inventory/:id**
```typescript
Response (204): No content

Errors:
- 404: Producto not found
- 409: Cannot delete (referenced by inventario)
```

**POST /api/inventory/upload**
```typescript
Request:
FormData with file: .xlsx or .xls

Response (200):
{
  success: true;
  filename: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  fileType: 'inventory' | 'sales';
  store: string;
}

Errors:
- 400: Invalid file type
- 413: File too large (>10MB)
- 422: Invalid Excel structure
```

#### Synchronization

**POST /api/sync/productos**
```typescript
Request:
{
  incremental?: boolean;  // default: true
}

Response (200):
{
  success: true;
  jobId: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  duration: number;  // milliseconds
}
```

**POST /api/sync/full**
```typescript
Response (200):
{
  success: true;
  jobs: {
    productos: SyncResult;
    inventario: SyncResult;
    clientes: SyncResult;
    ventas: SyncResult;
  };
  totalDuration: number;
}
```

**GET /api/sync/status**
```typescript
Response (200):
{
  jobs: SyncJob[];  // últimos 10 jobs
  schedule: {
    productos: string;     // cron expression
    inventario: string;
    ventas: string;
  };
  lastSync: {
    productos: Date;
    inventario: Date;
    ventas: Date;
  };
}
```

#### AI Queries

**POST /api/ai/query**
```typescript
Request:
{
  query: string;         // "Productos con stock bajo"
  limit?: number;        // default: 100
  cache?: boolean;       // default: true
}

Response (200):
{
  success: true;
  query: {
    natural: string;
    sql: string;
    explanation: string;
  };
  data: any[];
  metadata: {
    rowCount: number;
    executionTime: number;  // ms
    estimatedRows: number;
    schemaContext: object;
  };
  agents: {
    schema: 'completed' | 'failed';
    sql: 'completed' | 'failed';
    execution: 'completed' | 'failed';
  };
}

Errors:
- 400: Query inválido
- 403: SQL peligroso detectado
- 500: Error en agente o ejecución
- 503: OpenAI API unavailable
```

**GET /api/ai/query/examples**
```typescript
Response (200):
{
  examples: string[];
}
```

#### Predictions

**POST /api/predictions/demand**
```typescript
Request:
{
  numeroParte: string;
  daysAhead: number;    // 1-90
}

Response (200):
{
  producto: string;
  predicciones: Array<{
    fecha: Date;
    demandaEstimada: number;
    confidenceLow: number;
    confidenceHigh: number;
  }>;
  metricas: {
    mae: number;
    rmse: number;
    r2: number;
  };
}
```

---

## SEGURIDAD

### Authentication & Authorization

#### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "admin | user",
    "iat": 1705392000,
    "exp": 1705996800
  }
}
```

#### Roles y Permisos

```typescript
const ROLES = {
  ADMIN: {
    permissions: ['*']  // Todos los permisos
  },
  MANAGER: {
    permissions: [
      'inventory:read',
      'inventory:write',
      'sync:trigger',
      'predictions:read',
      'ai-query:execute'
    ]
  },
  USER: {
    permissions: [
      'inventory:read',
      'predictions:read',
      'ai-query:execute'
    ]
  },
  VIEWER: {
    permissions: [
      'inventory:read'
    ]
  }
};
```

#### Row Level Security (RLS) en Supabase

```sql
-- Solo usuarios pueden ver sus propios queries
CREATE POLICY "Users can view own queries"
ON query_history
FOR SELECT
USING (auth.uid() = user_id);

-- Admins pueden ver todo
CREATE POLICY "Admins can view all"
ON query_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### API Security

#### Rate Limiting
```typescript
// Global rate limit
fastify.register(rateLimitPlugin, {
  max: 100,              // 100 requests
  timeWindow: '1 minute' // por minuto
});

// Endpoint específico
fastify.post('/api/ai/query', {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '1 minute'
    }
  }
}, handler);
```

#### Input Validation

```typescript
// Todas las rutas usan Zod
fastify.post('/api/inventory', {
  schema: {
    body: ProductoSchema
  }
}, async (request, reply) => {
  // request.body ya está validado
});
```

#### SQL Injection Prevention

```typescript
// 1. Validación de queries AI
const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'GRANT'];

function validateSQL(sql: string): boolean {
  const upper = sql.toUpperCase();
  return !dangerousKeywords.some(kw => upper.includes(kw));
}

// 2. Solo SELECT permitido
if (!sql.trim().toUpperCase().startsWith('SELECT')) {
  throw new Error('Solo queries SELECT son permitidos');
}

// 3. Prepared statements en Prisma
await prisma.erpProducto.findMany({
  where: { codigo: userInput }  // Automáticamente escapado
});
```

#### CORS Configuration

```typescript
fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://app.embler.mx']
    : ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
});
```

#### Security Headers (Helmet)

```typescript
fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'https://akcwnfrstqdpumzywzxv.supabase.co']
    }
  }
});
```

---

## PERFORMANCE Y ESCALABILIDAD

### Caching Strategy

#### Redis Cache Layers

```typescript
// Layer 1: Query results (5 min TTL)
const cacheKey = `query:${hash(sql)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await executeQuery(sql);
await redis.setex(cacheKey, 300, JSON.stringify(result));

// Layer 2: Inventario (2 min TTL)
const inventoryKey = `inventory:${page}:${limit}:${search}`;
// ...

// Layer 3: Predicciones ML (1 hora TTL)
const predictionKey = `prediction:${numeroParte}:${daysAhead}`;
await redis.setex(predictionKey, 3600, JSON.stringify(prediction));

// Layer 4: Sessions (30 días TTL)
const sessionKey = `session:${userId}`;
await redis.setex(sessionKey, 2592000, token);
```

#### Cache Invalidation

```typescript
// Invalidar al sincronizar
async syncProductos() {
  // ... sync logic ...

  // Invalidar cache de inventario
  const keys = await redis.keys('inventory:*');
  if (keys.length) await redis.del(...keys);

  // Invalidar predicciones (datos cambiaron)
  const predKeys = await redis.keys('prediction:*');
  if (predKeys.length) await redis.del(...predKeys);
}
```

### Database Optimization

#### Índices Críticos
```sql
-- Búsquedas de productos
CREATE INDEX idx_erp_productos_codigo ON erp_productos(codigo);
CREATE INDEX idx_erp_productos_nombre ON erp_productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX idx_erp_productos_categoria ON erp_productos(categoria);

-- Filtros de inventario
CREATE INDEX idx_erp_inventario_stock ON erp_inventario(stock_actual) WHERE stock_actual < stock_minimo;
CREATE INDEX idx_erp_inventario_almacen ON erp_inventario(almacen);

-- Queries de ventas
CREATE INDEX idx_erp_ventas_fecha ON erp_ventas(fecha DESC);
CREATE INDEX idx_erp_ventas_cliente_fecha ON erp_ventas(cliente_id, fecha DESC);

-- Sync jobs
CREATE INDEX idx_sync_jobs_status_created ON sync_jobs(status, created_at DESC);
```

#### Connection Pooling

```typescript
// Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Configuración recomendada
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true&connection_limit=20"
```

#### Query Optimization

```typescript
// Malo: N+1 queries
const productos = await prisma.erpProducto.findMany();
for (const p of productos) {
  const inventario = await prisma.erpInventario.findMany({
    where: { productoId: p.id }
  });
}

// Bueno: 1 query con include
const productos = await prisma.erpProducto.findMany({
  include: {
    inventario: true
  }
});
```

### Horizontal Scaling

#### Load Balancing (Nginx)

```nginx
upstream api_backend {
  least_conn;
  server api1:3001;
  server api2:3001;
  server api3:3001;
}

server {
  listen 80;

  location /api {
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

#### Stateless Services

```typescript
// ✓ Bueno: JWT en header (stateless)
const user = verifyJWT(request.headers.authorization);

// ✗ Malo: Session en memoria (stateful)
const session = sessions[sessionId];  // No escala
```

### Async Processing (Bull Queue)

```typescript
// Jobs de larga duración
const syncQueue = new Bull('sync', { redis: REDIS_URL });

// Producer
await syncQueue.add('sync-productos', {}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
});

// Consumer (puede estar en otro servidor)
syncQueue.process('sync-productos', async (job) => {
  return await syncService.syncProductos();
});
```

---

## DEPLOYMENT

### Docker Compose (Producción)

```yaml
version: '3.9'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - api-gateway
      - shell-app

  api-gateway:
    build: ./backend/api-gateway
    env_file: .env.production
    deploy:
      replicas: 3
    depends_on:
      - redis
      - postgres

  python-processor:
    build: ./backend/python-processor
    env_file: .env.production

  microsip-connector:
    build: ./backend/microsip-connector
    env_file: .env.production
    environment:
      - FIREBIRD_HOST=${FIREBIRD_HOST}

  ml-service:
    build: ./ml-models
    env_file: .env.production

  shell-app:
    build: ./apps/shell-app
    environment:
      - REACT_APP_API_URL=${API_URL}

  analytics-module:
    build: ./apps/analytics-module

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  postgres:  # Solo si no usas Supabase cloud
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

### Variables de Entorno (Producción)

```bash
# .env.production

# Supabase
SUPABASE_URL=https://akcwnfrstqdpumzywzxv.supabase.co
SUPABASE_ANON_KEY=<PRODUCCION_KEY>
SUPABASE_SERVICE_ROLE_KEY=<PRODUCCION_KEY>
DATABASE_URL=postgresql://postgres:<PASS>@db.supabase.co:5432/postgres?schema=embler

# Microsip ERP
FIREBIRD_HOST=192.65.134.78
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\\Microsip datos\\EMBLER.FDB
FIREBIRD_USER=ODBC
FIREBIRD_PASSWORD=<PRODUCCION>
MICROSIP_API_URL=http://microsip-connector:8003
MICROSIP_API_KEY=<GENERAR_FUERTE>

# OpenAI
OPENAI_API_KEY=sk-...

# Security
JWT_SECRET=<GENERAR_256_BITS>
NODE_ENV=production

# URLs
API_URL=https://api.embler.mx
FRONTEND_URL=https://app.embler.mx

# Redis
REDIS_URL=redis://redis:6379

# Sync Schedule
SYNC_PRODUCTOS_CRON=0 */6 * * *
SYNC_INVENTARIO_CRON=0 */2 * * *
SYNC_VENTAS_CRON=0 * * * *

# Logging
LOG_LEVEL=info
```

### Health Checks

```typescript
// /api/health endpoint
{
  status: 'healthy',
  timestamp: '2025-01-16T10:30:00Z',
  uptime: 3600,
  version: '1.0.0',
  services: {
    database: 'connected',
    redis: 'connected',
    microsip: 'connected',
    ml: 'connected'
  },
  memory: {
    used: '250MB',
    total: '512MB'
  }
}
```

### Monitoring

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:3001']
    metrics_path: '/metrics'
```

---

**Documento creado**: 2025-01-16
**Última actualización**: 2025-01-16
**Versión**: 1.0
