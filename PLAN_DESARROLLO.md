# PLAN DE DESARROLLO INTEGRAL - DEVCOMPRAS2
## Sistema Integrado con ERP, ML y Procesamiento de Archivos

**Fecha de creación**: 2025-01-16
**Duración estimada**: 3-4 semanas
**Objetivo**: MVP funcional end-to-end

---

## 📋 TABLA DE CONTENIDOS

1. [Visión General](#visión-general)
2. [Objetivos del Proyecto](#objetivos-del-proyecto)
3. [Cronograma Semanal](#cronograma-semanal)
4. [Semana 1: Fundamentos y Sincronización](#semana-1)
5. [Semana 2: Backend Funcional](#semana-2)
6. [Semana 3: Frontend Funcional](#semana-3)
7. [Semana 4: Integración y Pulido](#semana-4)
8. [Criterios de Éxito](#criterios-de-éxito)
9. [Riesgos y Mitigaciones](#riesgos-y-mitigaciones)

---

## VISIÓN GENERAL

### Proyectos a Integrar

**devcompras2** (Base)
- Micro-frontends con Module Federation
- API Gateway con Fastify
- ML Service con Python/FastAPI
- PostgreSQL (Supabase) + Redis

**devcomprasnodeprueba** (Motor ERP)
- Conexión a Firebird Microsip
- Node.js + Express
- Pool de conexiones optimizado
- API REST para consultas ERP

**devcompras** (Procesamiento de Archivos)
- Upload y procesamiento de Excel
- Detección automática de tipo
- Extracción de metadatos
- Corrección de archivos corruptos

### Nuevas Capacidades

**Sistema de Sincronización**
- ERP → Supabase automática y manual
- Jobs programados con Bull Queue
- Tracking de sincronizaciones
- Cache inteligente con Redis

**Sistema Multiagente con IA**
- Queries en lenguaje natural
- Text-to-SQL con OpenAI GPT-4
- Validación y ejecución segura
- Respuestas formateadas

---

## OBJETIVOS DEL PROYECTO

### Funcionales

1. **Sincronización Bidireccional**
   - Extraer datos de Microsip (Firebird)
   - Almacenar en Supabase (PostgreSQL)
   - Sincronización automática programada
   - Sincronización manual on-demand

2. **Consultas Inteligentes**
   - Interfaz de lenguaje natural
   - Sistema multiagente (Schema, SQL, Execution)
   - Generación automática de SQL
   - Ejecución segura en Firebird

3. **Gestión de Inventario**
   - CRUD completo de productos
   - Upload masivo vía Excel
   - Dashboard con KPIs reales
   - Predicción de demanda con ML

### Técnicos

1. **Arquitectura Escalable**
   - Micro-servicios independientes
   - Comunicación vía REST/HTTP
   - Message queues para procesamiento asíncrono
   - WebSockets para real-time

2. **Seguridad**
   - Autenticación JWT
   - API Keys para servicios
   - Validación de queries SQL
   - Row Level Security (RLS)

3. **Performance**
   - Cache con Redis (TTL configurable)
   - Batch processing para sync
   - Índices de BD optimizados
   - Connection pooling

---

## CRONOGRAMA SEMANAL

### Resumen por Semana

| Semana | Foco Principal | Entregables |
|--------|----------------|-------------|
| 1 | Fundamentos y Sincronización | BD configurada, Sync funcionando, Agentes IA |
| 2 | Backend Funcional | Endpoints CRUD, Upload Excel, ML API |
| 3 | Frontend Funcional | Dashboard, UI Queries IA, Panel Sync |
| 4 | Integración y Pulido | Testing, Deploy, Documentación |

---

## SEMANA 1: FUNDAMENTOS Y SINCRONIZACIÓN
**Días 1-7 | Objetivo: Infraestructura base operativa**

### Día 1-2: Configuración de Base de Datos

#### Tareas

**1. Obtener Credenciales Supabase**
- Acceder a [Supabase Dashboard](https://app.supabase.com)
- Proyecto: `akcwnfrstqdpumzywzxv`
- Obtener de Settings > API:
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Obtener de Settings > Database:
  - Password de PostgreSQL
  - Connection string completa

**2. Ejecutar Migraciones Existentes**

Ubicación: `devcompras2/database/migrations/`

```bash
# Conectar a Supabase SQL Editor
# Ejecutar en orden:

# 1. GenAI Tables
001_create_genai_tables.sql

# 2. Storage Buckets
002_setup_storage.sql

# 3. RAG Multimodal
003_rag_multimodal_secure.sql

# 4. Auth System
004_auth_system.sql
```

**3. Crear Nueva Migración para Datos ERP**

Archivo: `005_create_erp_sync_tables.sql`

```sql
-- Tabla de productos sincronizados desde ERP
CREATE TABLE erp_productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2),
  costo DECIMAL(10, 2),
  categoria VARCHAR(100),
  unidad_medida VARCHAR(20),
  activo BOOLEAN DEFAULT true,

  -- Metadatos de sincronización
  erp_id VARCHAR(100),
  last_synced_at TIMESTAMP,
  sync_status VARCHAR(20) DEFAULT 'synced',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de inventario por almacén
CREATE TABLE erp_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID REFERENCES erp_productos(id) ON DELETE CASCADE,
  almacen VARCHAR(100) NOT NULL,
  stock_actual INT DEFAULT 0,
  stock_minimo INT DEFAULT 0,
  stock_maximo INT,
  ubicacion VARCHAR(100),

  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(producto_id, almacen)
);

-- Tabla de ventas
CREATE TABLE erp_ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio VARCHAR(50) UNIQUE NOT NULL,
  fecha DATE NOT NULL,
  cliente_id VARCHAR(100),
  cliente_nombre TEXT,
  subtotal DECIMAL(12, 2),
  iva DECIMAL(12, 2),
  total DECIMAL(12, 2),
  estatus VARCHAR(50),

  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de clientes
CREATE TABLE erp_clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  erp_id VARCHAR(100) UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  rfc VARCHAR(20),
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,

  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de control de sincronización
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_message TEXT,

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_erp_productos_codigo ON erp_productos(codigo);
CREATE INDEX idx_erp_productos_categoria ON erp_productos(categoria);
CREATE INDEX idx_erp_inventario_producto ON erp_inventario(producto_id);
CREATE INDEX idx_erp_inventario_almacen ON erp_inventario(almacen);
CREATE INDEX idx_erp_ventas_fecha ON erp_ventas(fecha);
CREATE INDEX idx_erp_ventas_cliente ON erp_ventas(cliente_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status, job_type);
CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at DESC);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_erp_productos_updated_at
  BEFORE UPDATE ON erp_productos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_erp_inventario_updated_at
  BEFORE UPDATE ON erp_inventario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_erp_clientes_updated_at
  BEFORE UPDATE ON erp_clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**4. Actualizar Schema Prisma**

Archivo: `backend/api-gateway/prisma/schema.prisma`

```prisma
// Agregar al archivo existente

model ErpProducto {
  id            String   @id @default(uuid())
  codigo        String   @unique
  nombre        String
  descripcion   String?
  precio        Decimal? @db.Decimal(10, 2)
  costo         Decimal? @db.Decimal(10, 2)
  categoria     String?
  unidadMedida  String?  @map("unidad_medida")
  activo        Boolean  @default(true)

  erpId         String?  @map("erp_id")
  lastSyncedAt  DateTime? @map("last_synced_at")
  syncStatus    String   @default("synced") @map("sync_status")

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  inventario    ErpInventario[]

  @@map("erp_productos")
}

model ErpInventario {
  id            String   @id @default(uuid())
  productoId    String   @map("producto_id")
  producto      ErpProducto @relation(fields: [productoId], references: [id], onDelete: Cascade)
  almacen       String
  stockActual   Int      @default(0) @map("stock_actual")
  stockMinimo   Int      @default(0) @map("stock_minimo")
  stockMaximo   Int?     @map("stock_maximo")
  ubicacion     String?

  lastSyncedAt  DateTime? @map("last_synced_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@unique([productoId, almacen])
  @@map("erp_inventario")
}

model ErpVenta {
  id            String   @id @default(uuid())
  folio         String   @unique
  fecha         DateTime @db.Date
  clienteId     String?  @map("cliente_id")
  clienteNombre String?  @map("cliente_nombre")
  subtotal      Decimal? @db.Decimal(12, 2)
  iva           Decimal? @db.Decimal(12, 2)
  total         Decimal? @db.Decimal(12, 2)
  estatus       String?

  lastSyncedAt  DateTime? @map("last_synced_at")
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("erp_ventas")
}

model ErpCliente {
  id            String   @id @default(uuid())
  erpId         String   @unique @map("erp_id")
  nombre        String
  rfc           String?
  email         String?
  telefono      String?
  direccion     String?

  lastSyncedAt  DateTime? @map("last_synced_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("erp_clientes")
}

model SyncJob {
  id                String   @id @default(uuid())
  jobType           String   @map("job_type")
  status            String   @default("pending")
  recordsProcessed  Int      @default(0) @map("records_processed")
  recordsCreated    Int      @default(0) @map("records_created")
  recordsUpdated    Int      @default(0) @map("records_updated")
  recordsFailed     Int      @default(0) @map("records_failed")
  errorMessage      String?  @map("error_message")

  startedAt         DateTime? @map("started_at")
  completedAt       DateTime? @map("completed_at")
  createdAt         DateTime @default(now()) @map("created_at")

  @@map("sync_jobs")
}
```

**5. Generar Cliente Prisma**

```bash
cd backend/api-gateway
npx prisma generate
```

#### Entregables Día 1-2
- ✅ Credenciales Supabase obtenidas
- ✅ 5 migraciones SQL ejecutadas
- ✅ Schema Prisma actualizado
- ✅ Cliente Prisma generado

---

### Día 3-4: Sistema de Sincronización ERP → Supabase

#### Tareas

**1. Crear Servicio de Sincronización**

Archivo: `backend/api-gateway/src/services/erp-sync-service.ts`

Ver detalles completos en **GUIA_IMPLEMENTACION.md** sección 2.1

**2. Crear Rutas de Sincronización**

Archivo: `backend/api-gateway/src/routes/sync.ts`

Endpoints:
- `POST /api/sync/productos` - Sincronizar productos
- `POST /api/sync/inventario` - Sincronizar inventario
- `POST /api/sync/ventas` - Sincronizar ventas
- `POST /api/sync/clientes` - Sincronizar clientes
- `POST /api/sync/full` - Sincronización completa
- `GET /api/sync/status` - Estado de sincronizaciones

**3. Implementar Bull Queue para Sync Programado**

Archivo: `backend/api-gateway/src/jobs/sync-scheduler.ts`

Ver detalles en **GUIA_IMPLEMENTACION.md** sección 2.2

**4. Registrar Rutas en Server.ts**

```typescript
// backend/api-gateway/src/server.ts

import { syncRoutes } from './routes/sync';
import { schedulePeriodicSync } from './jobs/sync-scheduler';

// ... código existente ...

// Registrar rutas
await fastify.register(syncRoutes);

// Iniciar scheduler de sincronización
schedulePeriodicSync();
```

#### Entregables Día 3-4
- ✅ ErpSyncService implementado
- ✅ Endpoints de sync funcionando
- ✅ Bull Queue configurado
- ✅ Sync programado activo

---

### Día 5-7: Sistema Multiagente para Queries con IA

#### Arquitectura de Agentes

```
Usuario Query → Agent Orchestrator
                      ↓
         ┌────────────┼────────────┐
         ↓            ↓            ↓
   Schema Agent  SQL Agent  Execution Agent
   (Analiza DB) (Text→SQL) (Ejecuta query)
         ↓            ↓            ↓
         └────────────┼────────────┘
                      ↓
              Formatting Agent
                      ↓
              Respuesta JSON
```

#### Tareas

**1. Implementar Schema Agent**

Archivo: `backend/api-gateway/src/agents/schema-agent.ts`

Responsabilidades:
- Conocer estructura de vistas Firebird
- Analizar query natural
- Sugerir tablas/columnas relevantes
- Identificar agregaciones necesarias

**2. Implementar SQL Agent**

Archivo: `backend/api-gateway/src/agents/sql-agent.ts`

Responsabilidades:
- Convertir lenguaje natural a SQL Firebird
- Usar sintaxis correcta (FIRST/SKIP)
- Validar SQL generado
- Prevenir operaciones peligrosas

**3. Implementar Execution Agent**

Archivo: `backend/api-gateway/src/agents/execution-agent.ts`

Responsabilidades:
- Ejecutar SQL en Firebird
- Manejar errores de conexión
- Timeout handling
- Formatear resultados

**4. Implementar Agent Orchestrator**

Archivo: `backend/api-gateway/src/agents/orchestrator.ts`

Responsabilidades:
- Coordinar flujo entre agentes
- Logging de proceso
- Manejo de errores global
- Métricas de performance

**5. Crear Rutas AI Query**

Archivo: `backend/api-gateway/src/routes/ai-query.ts`

Endpoints:
- `POST /api/ai/query` - Ejecutar query natural
- `GET /api/ai/query/examples` - Ejemplos de queries
- `GET /api/ai/query/history` - Historial de queries del usuario

**6. Actualizar Microsip Connector**

Archivo: `backend/microsip-connector/src/routes/query.js`

Nuevo endpoint:
- `POST /api/query/execute` - Ejecutar SQL raw (solo SELECT)

#### Entregables Día 5-7
- ✅ 4 agentes implementados
- ✅ Orchestrator funcional
- ✅ Endpoint AI query operativo
- ✅ Microsip connector actualizado

---

## SEMANA 2: BACKEND FUNCIONAL
**Días 8-14 | Objetivo: APIs completas y funcionales**

### Día 8-10: Integración Sistema de Upload Excel

#### Tareas

**1. Crear Microservicio Python Processor**

Estructura:
```
backend/python-processor/
├── main.py
├── requirements.txt
├── services/
│   ├── __init__.py
│   ├── excel_processor.py      # De devcompras
│   ├── file_detector.py
│   ├── clean_excel_stock.py
│   ├── clean_excel_ventas.py
│   ├── web_safe_excel_fixer.py
│   ├── get_sucursal.py
│   └── date_range_extractor.py
└── Dockerfile
```

**2. Copiar Servicios desde devcompras**

```bash
# Copiar archivos de procesamiento
cp -r ../devcompras/backend/services/* backend/python-processor/services/
```

**3. Crear FastAPI App**

Archivo: `backend/python-processor/main.py`

Ver implementación en **GUIA_IMPLEMENTACION.md** sección 3.1

**4. Integrar con API Gateway**

Nuevo endpoint en API Gateway:
- `POST /api/inventory/upload`

Flujo:
1. Recibir archivo multipart en Fastify
2. Guardar temporalmente
3. Proxy a Python Processor
4. Procesar con pandas
5. Almacenar en Supabase Storage
6. Insertar datos en BD
7. Retornar resultado

#### Entregables Día 8-10
- ✅ Python Processor creado
- ✅ Servicios de Excel portados
- ✅ Endpoint upload funcional
- ✅ Integración con Supabase Storage

---

### Día 11-12: Endpoints CRUD de Inventario

#### Endpoints a Implementar

**1. Listar Productos**
```typescript
GET /api/inventory?page=1&limit=20&search=filtro&categoria=refacciones

Response:
{
  data: ErpProducto[],
  pagination: {
    page: 1,
    limit: 20,
    total: 150,
    totalPages: 8
  }
}
```

**2. Detalle de Producto**
```typescript
GET /api/inventory/:id

Response: ErpProducto & { inventario: ErpInventario[] }
```

**3. Crear Producto**
```typescript
POST /api/inventory

Body: {
  codigo: string,
  nombre: string,
  precio?: number,
  categoria?: string
}
```

**4. Actualizar Producto**
```typescript
PUT /api/inventory/:id

Body: Partial<ErpProducto>
```

**5. Eliminar Producto**
```typescript
DELETE /api/inventory/:id
```

**6. Stock Bajo**
```typescript
GET /api/inventory/low-stock?threshold=5

Response: (ErpProducto & ErpInventario)[]
```

#### Archivo de Rutas

`backend/api-gateway/src/routes/inventory.ts`

Ver implementación completa en **GUIA_IMPLEMENTACION.md** sección 3.2

#### Entregables Día 11-12
- ✅ 6 endpoints CRUD funcionales
- ✅ Paginación implementada
- ✅ Filtros y búsqueda
- ✅ Validación con Zod

---

### Día 13-14: Machine Learning Service API

#### Tareas

**1. Crear FastAPI Main.py**

Archivo: `ml-models/src/main.py`

Ver implementación en **GUIA_IMPLEMENTACION.md** sección 3.3

Endpoints ML:
- `POST /train` - Entrenar modelo con CSV
- `POST /predict` - Predecir demanda
- `GET /models` - Listar modelos disponibles
- `GET /metrics` - Métricas del modelo actual

**2. Integrar con API Gateway**

Nuevos endpoints en API Gateway:
- `POST /api/predictions/train`
- `POST /api/predictions/demand`
- `GET /api/predictions/models`

**3. Crear Dataset de Ejemplo**

Archivo: `ml-models/data/ventas_historicas.csv`

Estructura:
```csv
fecha,numero_parte,cantidad_vendida,precio,almacen,categoria
2024-01-01,ABC123,10,150.50,Satélite,Refacciones
2024-01-02,ABC123,5,150.50,Satélite,Refacciones
...
```

**4. Entrenar Modelo Inicial**

```bash
cd ml-models
python -c "
from src.demand_prediction import DemandPredictor
import pandas as pd

df = pd.read_csv('data/ventas_historicas.csv')
predictor = DemandPredictor()
result = predictor.train(df)
print(f'R² Score: {result[\"r2_score\"]}')
"
```

#### Entregables Día 13-14
- ✅ FastAPI ML service funcional
- ✅ Endpoints de ML integrados
- ✅ Modelo inicial entrenado
- ✅ R² Score > 0.80

---

## SEMANA 3: FRONTEND FUNCIONAL
**Días 15-21 | Objetivo: Interfaces de usuario completas**

### Día 15-17: Dashboard y Gestión de Inventario

#### Componentes a Crear/Actualizar

**1. Dashboard.tsx**

Ubicación: `apps/shell-app/src/pages/Dashboard.tsx`

Widgets:
- KPI Cards (Total productos, Stock bajo, Ventas mes)
- Gráfico de ventas por mes (Recharts)
- Tabla de últimas sincronizaciones
- Productos más vendidos

**2. InventoryPage.tsx**

Ubicación: `apps/shell-app/src/pages/InventoryPage.tsx`

Features:
- Tabla con TanStack Table
- Búsqueda en tiempo real
- Filtros por categoría
- Paginación
- Botones CRUD
- Modal de edición

**3. FileUpload.tsx**

Copiar desde: `devcompras/frontend/components/FileUpload.tsx`

Adaptar:
- API endpoint a `/api/inventory/upload`
- Estilos a tema de devcompras2
- Integración con React Query

#### React Query Hooks

Crear: `apps/shell-app/src/hooks/useInventory.ts`

```typescript
export function useInventory(params: InventoryParams) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => fetchInventory(params),
    staleTime: 5 * 60 * 1000
  });
}

export function useUploadExcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadExcel(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });
}
```

#### Entregables Día 15-17
- ✅ Dashboard con datos reales
- ✅ Página de inventario funcional
- ✅ Upload de Excel integrado
- ✅ React Query configurado

---

### Día 18-19: UI para Queries con IA

#### Componentes

**1. AIQueryInterface.tsx**

Ubicación: `apps/shell-app/src/components/AIQueryInterface.tsx`

Features:
- Textarea para query natural
- Botón de consulta
- Indicador de proceso (agentes activos)
- Mostrar SQL generado
- Tabla de resultados
- Tiempo de ejecución

**2. ExampleQueries.tsx**

Lista de queries de ejemplo:
- "Productos con stock menor a 5"
- "Top 10 productos más vendidos"
- "Ventas del último mes"
- "Clientes sin compras recientes"

**3. AIQueryPage.tsx**

Página completa con:
- AIQueryInterface
- ExampleQueries
- Historial de queries
- Queries guardadas (favoritos)

#### Entregables Día 18-19
- ✅ Interfaz de queries IA funcional
- ✅ Visualización de resultados
- ✅ Ejemplos interactivos

---

### Día 20-21: Panel de Sincronización

#### Componentes

**1. SyncPanel.tsx**

Features:
- Botones de sincronización manual
- Indicadores de última sincronización
- Progress bars en tiempo real
- Logs de errores
- Estadísticas (registros creados/actualizados)

**2. SyncHistory.tsx**

Tabla de historial:
- Fecha y hora
- Tipo de sync
- Estado (success/failed)
- Registros procesados
- Duración
- Detalles de error

**3. SyncSchedule.tsx**

Visualización de:
- Próximas sincronizaciones programadas
- Frecuencia configurada
- Habilitar/deshabilitar sync automático

#### WebSocket Integration

```typescript
// Escuchar eventos de sincronización
const socket = useWebSocket();

useEffect(() => {
  socket.on('sync:started', (data) => {
    toast.info(`Sincronización ${data.type} iniciada`);
  });

  socket.on('sync:progress', (data) => {
    updateProgress(data.processed, data.total);
  });

  socket.on('sync:completed', (data) => {
    toast.success(`Sincronización completada: ${data.recordsCreated} registros`);
    queryClient.invalidateQueries(['inventory']);
  });
}, []);
```

#### Entregables Día 20-21
- ✅ Panel de sincronización completo
- ✅ Historial visualizado
- ✅ WebSocket integration

---

## SEMANA 4: INTEGRACIÓN Y PULIDO
**Días 22-28 | Objetivo: Sistema completo y deployable**

### Día 22-23: WebSockets Real-time

#### Eventos a Implementar

**Backend: Emisión de Eventos**

```typescript
// En ErpSyncService
async syncProductos() {
  // Emitir inicio
  this.websocket.broadcast('sync:started', {
    type: 'productos'
  });

  for (let i = 0; i < productos.length; i++) {
    // Procesar producto...

    // Emitir progreso cada 100 registros
    if (i % 100 === 0) {
      this.websocket.broadcast('sync:progress', {
        type: 'productos',
        processed: i,
        total: productos.length
      });
    }
  }

  // Emitir completado
  this.websocket.broadcast('sync:completed', {
    type: 'productos',
    recordsCreated: job.recordsCreated,
    recordsUpdated: job.recordsUpdated
  });
}
```

**Frontend: Listeners**

```typescript
// Hook personalizado
function useSyncEvents() {
  const [syncStatus, setSyncStatus] = useState({});
  const socket = useWebSocket();

  useEffect(() => {
    socket.on('sync:started', (data) => {
      setSyncStatus(prev => ({
        ...prev,
        [data.type]: { status: 'running', progress: 0 }
      }));
    });

    socket.on('sync:progress', (data) => {
      setSyncStatus(prev => ({
        ...prev,
        [data.type]: {
          status: 'running',
          progress: (data.processed / data.total) * 100
        }
      }));
    });

    socket.on('sync:completed', (data) => {
      setSyncStatus(prev => ({
        ...prev,
        [data.type]: { status: 'completed', ...data }
      }));
    });
  }, [socket]);

  return syncStatus;
}
```

#### Entregables Día 22-23
- ✅ WebSocket events configurados
- ✅ Progress tracking real-time
- ✅ Auto-refresh de UI

---

### Día 24-25: Testing

#### Testing Strategy

**1. Unit Tests**

Archivos a testear:
- `erp-sync-service.ts`
- `schema-agent.ts`
- `sql-agent.ts`
- `execution-agent.ts`

Framework: Jest

```bash
npm install --save-dev jest @types/jest ts-jest
```

**2. Integration Tests**

Flujos a testear:
- Sincronización completa ERP → Supabase
- Query natural → SQL → Ejecución
- Upload Excel → Procesamiento → BD

**3. E2E Tests**

Framework: Playwright

Escenarios:
- Login → Dashboard → Ver datos
- Upload Excel → Ver productos nuevos
- Query IA → Ver resultados
- Sincronizar → Ver progreso → Verificar datos

#### Test Coverage Target

- Unit: >60%
- Integration: >40%
- E2E: Flujos críticos (3-5 escenarios)

#### Entregables Día 24-25
- ✅ Unit tests (coverage >60%)
- ✅ Integration tests
- ✅ E2E tests (flujos críticos)

---

### Día 26-28: Deployment y Documentación

#### Docker Compose Actualizado

Archivo: `docker-compose.yml`

Servicios (9 total):
1. PostgreSQL (Supabase local o remoto)
2. Redis
3. API Gateway (Fastify)
4. Python Processor
5. Microsip Connector
6. ML Service
7. Shell App (Frontend)
8. Analytics Module
9. Nginx (Reverse proxy)

#### Documentación

Archivos a crear/actualizar:
- `README.md` - Overview y quick start
- `SETUP.md` - Instalación paso a paso
- `API.md` - Documentación de endpoints
- `ENV_VARIABLES.md` - Variables requeridas
- `ARCHITECTURE.md` - Arquitectura detallada
- `DEPLOYMENT.md` - Guía de deployment

#### Deploy en Coolify

1. Configurar proyecto en Coolify
2. Configurar variables de entorno
3. Deploy de servicios
4. Verificar salud de servicios
5. Smoke tests

#### Entregables Día 26-28
- ✅ Docker Compose funcionando
- ✅ Documentación completa
- ✅ Deploy en desarrollo
- ✅ Smoke tests pasando

---

## CRITERIOS DE ÉXITO

### Funcionales

- [ ] Login/Register funcional con JWT
- [ ] Sincronización ERP → Supabase (automática y manual)
- [ ] Queries con IA (text-to-SQL funcional)
- [ ] Upload de Excel y procesamiento
- [ ] Dashboard con KPIs reales
- [ ] Predicciones ML de demanda
- [ ] Panel de sincronización con historial
- [ ] WebSocket real-time updates

### Técnicos

- [ ] Test coverage >50%
- [ ] Documentación completa
- [ ] Docker Compose funcional
- [ ] Deploy en ambiente dev
- [ ] Performance: API <500ms p95
- [ ] Sin errores críticos en logs

### Calidad

- [ ] Código TypeScript strict mode
- [ ] ESLint sin errores
- [ ] Prisma migrations aplicadas
- [ ] Variables de entorno documentadas

---

## RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Credenciales Supabase faltantes | Media | Alto | Obtener en día 1, plan B: PostgreSQL local |
| Conexión Microsip inestable | Media | Medio | Cache Redis 30min, retry logic, timeout 30s |
| Modelo ML baja precisión | Baja | Medio | Validar R²>0.80, ajustar features, más datos |
| OpenAI API costo elevado | Media | Bajo | Rate limiting, cache de queries, modelo local alternativo |
| Integración micro-servicios compleja | Alta | Alto | Docker Compose bien configurado, logs centralizados |
| Tiempo insuficiente | Media | Alto | Priorizar MVP, features opcionales para post-launch |
| Schema Firebird desconocido | Alta | Alto | Scripts de exploración listos, documentar vistas |

---

## PRÓXIMOS PASOS POST-MVP

### Corto Plazo (1 mes)

1. Sistema de notificaciones (email + push)
2. Reportes avanzados (PDF export)
3. Mejoras UI/UX basadas en feedback
4. Optimizaciones de performance

### Mediano Plazo (2-3 meses)

1. Módulo de logística completo
2. Mobile apps (PWA)
3. Integración Stripe (pagos)
4. Multi-tenant support

### Largo Plazo (6+ meses)

1. Kubernetes deployment
2. Microservicios adicionales
3. Analytics avanzado con BI
4. Marketplace de integraciones

---

**Documento creado**: 2025-01-16
**Última actualización**: 2025-01-16
**Versión**: 1.0
**Autor**: Equipo Desarrollo Embler
