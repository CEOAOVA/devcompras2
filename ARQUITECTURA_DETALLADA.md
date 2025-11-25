# ARQUITECTURA DETALLADA DEL PROYECTO EMBLER
## Análisis Técnico Profundo

**Documento Técnico:** Arquitectura y Componentes  
**Fecha:** 31 de Octubre de 2025  
**Versión:** 1.0.0

---

## TABLA DE CONTENIDOS

1. [Diagrama de Arquitectura General](#diagrama-de-arquitectura-general)
2. [Arquitectura Frontend (Micro-Frontends)](#arquitectura-frontend)
3. [Arquitectura Backend (Monolito Modular)](#arquitectura-backend)
4. [Arquitectura de Datos](#arquitectura-de-datos)
5. [Arquitectura ML](#arquitectura-ml)
6. [Flujos de Datos Detallados](#flujos-de-datos-detallados)
7. [Modelo de Deployment](#modelo-de-deployment)
8. [Consideraciones de Performance](#consideraciones-de-performance)
9. [Seguridad en Capas](#seguridad-en-capas)

---

## DIAGRAMA DE ARQUITECTURA GENERAL

```
╔════════════════════════════════════════════════════════════════════════════╗
║                          CAPA DE PRESENTACIÓN                             ║
║                         (Frontend - Navegador)                            ║
╠════════════════════════════════════════════════════════════════════════════╣
│                                                                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Shell App Host  │  │ Analytics Module │  │ Logistics Module │       │
│  │   (Port 3000)    │  │  (Port 3002)     │  │  (Port 3003)     │       │
│  │                  │  │                  │  │                  │       │
│  │  Module Federation│──│ Remote Entry JS  │──│  Remote Entry JS │       │
│  │  Webpack 5       │  │                  │  │                  │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│         ▲                      ▲                      ▲                   │
│         │                      │                      │                   │
│         └──────────────────────┼──────────────────────┘                   │
│                                │                                         │
│               Shared Libraries (React, RQ, Router, Zustand)              │
│                                                                            │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                    HTTP REST + WebSocket
                                 │
╔════════════════════════════════▼═════════════════════════════════════════╗
║                      CAPA DE APLICACIÓN                                  ║
║                    (Backend - API Gateway)                               ║
╠════════════════════════════════════════════════════════════════════════╣
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                   Fastify Server (Port 3001)                    │  │
│  │                                                                 │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ MIDDLEWARE LAYER                                               │  │
│  │  ├─ CORS Handler                                               │  │
│  │  ├─ Helmet (Security Headers)                                  │  │
│  │  ├─ JWT Validation                                             │  │
│  │  ├─ Rate Limiter                                               │  │
│  │  └─ Request Logger (Pino)                                      │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ ROUTE HANDLERS                                                 │  │
│  │  ├─ POST /auth/register, /auth/login                           │  │
│  │  ├─ GET /inventory, POST /inventory/...                        │  │
│  │  ├─ GET /orders, POST /orders/...                              │  │
│  │  ├─ GET /predictions, POST /predictions/...                    │  │
│  │  ├─ WebSocket /ws (Real-time updates)                          │  │
│  │  └─ GET /health, /metrics                                      │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ SERVICES LAYER                                                 │  │
│  │  ├─ AuthService (JWT, roles, validation)                       │  │
│  │  ├─ EmbeddingService (Vector generation)                       │  │
│  │  ├─ ImageAnalyzer (Vision processing)                          │  │
│  │  ├─ PDFProcessor (Text extraction)                             │  │
│  │  ├─ TranslationService (Multiidioma)                           │  │
│  │  └─ MCPClient (MCP protocol adapter)                           │  │
│  ├─────────────────────────────────────────────────────────────────┤  │
│  │ UTILITIES & HELPERS                                            │  │
│  │  ├─ Redis Singleton (Connection pooling)                       │  │
│  │  ├─ Error Handlers                                             │  │
│  │  ├─ Validators (Zod schemas)                                   │  │
│  │  └─ Transformers (DTO mapping)                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└──────────────┬──────────────────────────┬──────────────────────────────┘
               │                          │
      HTTP to PostgreSQL       HTTP to ML Service
               │                          │
╔══════════════▼════════════════╗  ╔═════▼═══════════════════════════════╗
║   CAPA DE DATOS              ║  ║  CAPA DE ML & ANALYTICS             ║
║                              ║  ║                                     ║
║ PostgreSQL (Port 5432)       ║  ║  FastAPI Server (Port 8001)         ║
║ ├─ Supabase Managed          ║  ║  ├─ DemandPredictor                 ║
║ ├─ Schema: embler            ║  ║  │  ├─ Random Forest                ║
║ ├─ RLS Enabled               ║  ║  │  └─ Gradient Boosting            ║
║ ├─ Realtime                  ║  ║  ├─ Feature Engineering             ║
║ └─ pgVector Extension        ║  ║  ├─ Model Evaluation                ║
║                              ║  ║  └─ Predictions API                 ║
║ Redis (Port 6379)            ║  ║                                     ║
║ ├─ Session Store             ║  ║  Workers:                           ║
║ ├─ Cache Layer               ║  ║  ├─ Model Training (Bull Queue)     ║
║ ├─ Job Queue (Bull)          ║  ║  ├─ Predictions (Async)             ║
║ └─ Rate Limit Counters       ║  ║  └─ Data Analysis (Async)           ║
║                              ║  ║                                     ║
╚══════════════╬════════════════╝  ╚═════╬═══════════════════════════════╝
               │                          │
               └──────────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
        ┌─────▼──────┐            ┌──────────▼─────┐
        │   Storage  │            │ External APIs  │
        │  (Supabase)│            │                │
        │ ├─ Uploads │            ├─ OpenAI       │
        │ ├─ Exports │            ├─ OpenRouter   │
        │ └─ Models  │            ├─ Google Maps  │
        │            │            └─ Stripe       │
        └────────────┘            └────────────────┘
```

---

## ARQUITECTURA FRONTEND

### 1. Estructura de Módulos

```
MICRO-FRONTEND ARCHITECTURE (Module Federation)
═══════════════════════════════════════════════

Navegador
  │
  ├─ Shell App (Host)
  │   Responsabilidades:
  │   ├─ Orquestación de módulos
  │   ├─ Routing principal
  │   ├─ Gestión de auth global
  │   ├─ Tema y estilos globales
  │   └─ Notificaciones globales
  │
  ├─ Analytics Module (Remote)
  │   Responsabilidades:
  │   ├─ Dashboards de analítica
  │   ├─ Gráficos y reportes
  │   ├─ Predicciones de demanda
  │   └─ Análisis de inventario
  │
  └─ Logistics Module (Remote)
      Responsabilidades:
      ├─ Gestión de rutas
      ├─ Tracking GPS
      ├─ Asignación de repartidores
      └─ Estados de entrega
```

### 2. Module Federation Configuration

```javascript
// Shell App (Host)
{
  name: 'shell',
  filename: 'remoteEntry.js',
  remotes: {
    analytics: 'analytics@http://localhost:3002/remoteEntry.js',
    logistics: 'logistics@http://localhost:3003/remoteEntry.js'
  },
  exposes: {
    './AuthContext': './src/providers/AuthProvider.tsx',
    './useAuth': './src/hooks/useAuth.ts'
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.2.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
    'react-router-dom': { singleton: true, requiredVersion: '^6.21.3' },
    '@tanstack/react-query': { singleton: true },
    'zustand': { singleton: true }
  }
}

// Analytics Module (Remote)
{
  name: 'analytics',
  filename: 'remoteEntry.js',
  exposes: {
    './App': './src/App.tsx'
  },
  shared: {
    // Importa del shell si está disponible
    react: { singleton: true },
    // ... etc
  }
}
```

### 3. Flujo de Carga Dinámico

```
Usuario abre navegador
  ↓
Shell App carga (webpack)
  ├─ Ejecuta index.tsx
  ├─ Carga bootstrap.tsx (lazy)
  ├─ Inicializa providers
  │  ├─ QueryClientProvider (TanStack Query)
  │  ├─ AuthProvider (JWT token)
  │  └─ Toaster (hot-toast)
  └─ Renderiza Layout
       │
       ├─ Header + Sidebar
       ├─ Routes
       │  ├─ /dashboard → ComponenteDashboard
       │  ├─ /analytics/* → import('analytics/App')
       │  └─ /logistics/* → import('logistics/App')
       │
       └─ Si accede a /analytics:
           ├─ Webpack descarga remoteEntry.js
           ├─ Descomprime modulos de analytics
           ├─ Comparte dependencias (React, RQ, etc.)
           └─ Renderiza AnalyticsApp
```

### 4. Componentes Principales del Shell

```
src/
├── App.tsx
│   ├─ Router setup
│   ├─ Route definitions
│   └─ Error boundaries
│
├── bootstrap.tsx
│   ├─ App initialization
│   └─ React.lazy loading
│
├── components/
│   ├─ Layout.tsx (Main container)
│   ├─ Header.tsx (Navigation)
│   ├─ Sidebar.tsx (Menu)
│   ├─ ErrorBoundary.tsx
│   └─ LoadingSpinner.tsx
│
├── providers/
│   ├─ AuthProvider.tsx (JWT context)
│   ├─ QueryProvider.tsx (React Query)
│   └─ NotificationProvider.tsx (Toast)
│
├── hooks/
│   ├─ useAuth.ts (Get auth context)
│   ├─ useUser.ts (Current user)
│   └─ useQuery.ts (Data fetching)
│
├── lib/
│   ├─ api-client.ts (Axios instance)
│   ├─ validators.ts (Zod schemas)
│   └─ constants.ts (App constants)
│
└── styles/
    └─ globals.css (TailwindCSS)
```

### 5. Componentes Analytics Module

```
analytics-module/src/
├── App.tsx (Entry point)
├── components/
│   ├─ DemandPrediction.tsx
│   │  ├─ Chart con histórico vs predicción
│   │  ├─ Confidence interval
│   │  ├─ Filter por producto
│   │  └─ Export button
│   │
│   └─ InventoryAnalytics.tsx
│      ├─ Stock level gauge
│      ├─ Critical items table
│      ├─ Turnover rates
│      └─ Recommendations
│
├── hooks/
│   ├─ usePredictions.ts
│   └─ useInventory.ts
│
└── lib/
    └─ analytics-api.ts
```

---

## ARQUITECTURA BACKEND

### 1. Estructura del API Gateway

```
backend/api-gateway/src/
│
├── server.ts (Punto de entrada)
│   ├─ Inicialización Fastify
│   ├─ Registro de plugins
│   ├─ Declaración de rutas
│   └─ Error handlers globales
│
├── middleware/
│   └─ auth.middleware.ts
│      ├─ JWT verification
│      ├─ Role checking
│      └─ Permission validation
│
├── services/
│   ├─ auth-service.ts
│   │  ├─ register(email, password)
│   │  ├─ login(email, password)
│   │  ├─ refreshToken(token)
│   │  └─ validateToken(token)
│   │
│   ├─ embedding-service.ts
│   │  ├─ generateEmbedding(text)
│   │  └─ searchSimilar(vector, topK)
│   │
│   ├─ image-analyzer.ts
│   │  ├─ analyzeImage(path)
│   │  └─ extractText(image)
│   │
│   ├─ pdf-processor.ts
│   │  ├─ extractText(pdf)
│   │  ├─ extractMetadata(pdf)
│   │  └─ getPageCount(pdf)
│   │
│   ├─ translation-service.ts
│   │  ├─ translate(text, lang)
│   │  └─ detect(text)
│   │
│   └─ mcp-client.ts
│      ├─ callTool(toolName, args)
│      └─ listResources()
│
├── utils/
│   ├─ redis-singleton.ts
│   │  ├─ getRedisClient()
│   │  └─ closeRedisConnection()
│   │
│   ├─ validators.ts
│   │  ├─ userSchema
│   │  ├─ productSchema
│   │  └─ orderSchema
│   │
│   └─ error-handler.ts
│      ├─ AppError (custom class)
│      ├─ errorFormatter()
│      └─ errorLogger()
│
└── prisma/
    └─ schema.prisma
       ├─ Models (Profile, Inventario, OrdenEntrega)
       ├─ Relationships
       └─ Migrations
```

### 2. Flujo de Solicitud HTTP

```
Cliente (Navegador)
  │
  ├─ Envía POST /auth/login
  │  └─ Content-Type: application/json
  │     { email, password }
  │
  ├─ Llega a Fastify
  │  │
  │  ├─ Middleware: CORS check
  │  ├─ Middleware: Rate limiter
  │  ├─ Middleware: Request logger
  │  │
  │  ├─ Route handler: /auth/login
  │  │  │
  │  │  ├─ Validación Zod
  │  │  ├─ Busca user en Prisma
  │  │  ├─ Compara contraseña (bcryptjs)
  │  │  │
  │  │  ├─ SI OK:
  │  │  │  ├─ Genera JWT token
  │  │  │  ├─ Almacena en Redis (refresh token)
  │  │  │  └─ Retorna { accessToken, refreshToken }
  │  │  │
  │  │  └─ SI ERROR:
  │  │     ├─ Registra intento fallido
  │  │     └─ Retorna 401 Unauthorized
  │  │
  │  └─ Response headers (Helmet)
  │     ├─ Content-Security-Policy
  │     ├─ X-Frame-Options
  │     └─ Strict-Transport-Security
  │
  └─ Cliente recibe respuesta
     ├─ Guarda accessToken en memory
     ├─ Guarda refreshToken en httpOnly cookie
     └─ Redirige a /dashboard
```

### 3. Plugin Architecture

```
Fastify Server
│
├─ @fastify/cors
│  └─ Permite solicitudes cross-origin
│
├─ @fastify/helmet
│  └─ Agrega headers de seguridad
│
├─ @fastify/jwt
│  ├─ sign({ userId, role })
│  └─ verify(token)
│
├─ @fastify/rate-limit
│  └─ Limita solicitudes por IP
│
├─ @fastify/websocket
│  └─ Soporte WebSocket
│
├─ @fastify/multipart
│  └─ Procesamiento de uploads
│
└─ Custom plugins
   ├─ PostgreSQL connection pool
   ├─ Redis client initialization
   └─ Error handling
```

---

## ARQUITECTURA DE DATOS

### 1. Estructura de PostgreSQL

```
Supabase Project (PostgreSQL 15)
│
├─ Database: embler_db
│
├─ Schemas:
│  ├─ public (autenticación de Supabase)
│  └─ embler (datos de aplicación)
│
├─ Tablas en schema 'embler':
│  │
│  ├─ profiles
│  │  ├─ id (UUID)
│  │  ├─ email (UNIQUE)
│  │  ├─ name
│  │  ├─ role (admin/analyst/user)
│  │  ├─ avatar_url
│  │  ├─ created_at
│  │  └─ RLS enabled (users see own data)
│  │
│  ├─ inventario
│  │  ├─ id (UUID)
│  │  ├─ numero_parte (UNIQUE SKU)
│  │  ├─ descripcion
│  │  ├─ cantidad_actual
│  │  ├─ cantidad_minima
│  │  ├─ cantidad_maxima
│  │  ├─ ubicacion_almacen
│  │  ├─ costo_unitario (DECIMAL)
│  │  ├─ INDEX: numero_parte
│  │  └─ created_at, updated_at
│  │
│  ├─ ordenes_entrega
│  │  ├─ id (UUID)
│  │  ├─ numero_orden (UNIQUE)
│  │  ├─ cliente_id (FK)
│  │  ├─ repartidor_id (FK)
│  │  ├─ estado (enum)
│  │  ├─ direccion_entrega
│  │  ├─ coordenadas_lat (DECIMAL)
│  │  ├─ coordenadas_lng (DECIMAL)
│  │  ├─ fecha_creacion
│  │  ├─ fecha_asignacion
│  │  ├─ fecha_entrega
│  │  ├─ observaciones
│  │  ├─ INDEX: estado, cliente_id
│  │  └─ Realtime enabled
│  │
│  ├─ datasets
│  │  ├─ id (UUID)
│  │  ├─ user_id (FK)
│  │  ├─ name
│  │  ├─ file_type (csv/excel/json)
│  │  ├─ storage_path
│  │  ├─ row_count
│  │  ├─ columns_metadata (JSONB)
│  │  ├─ sample_data (JSONB)
│  │  ├─ processing_status
│  │  ├─ tags (TEXT[])
│  │  ├─ is_public
│  │  └─ INDEX: user_id, status
│  │
│  ├─ insights
│  │  ├─ id (UUID)
│  │  ├─ dataset_id (FK)
│  │  ├─ user_id (FK)
│  │  ├─ insight_type (summary/anomaly/prediction)
│  │  ├─ title
│  │  ├─ description
│  │  ├─ confidence (FLOAT 0-1)
│  │  ├─ metadata (JSONB)
│  │  └─ Realtime enabled
│  │
│  ├─ chat_conversations
│  │  ├─ id (UUID)
│  │  ├─ user_id (FK)
│  │  ├─ title
│  │  ├─ model_used
│  │  └─ created_at
│  │
│  ├─ chat_messages
│  │  ├─ id (UUID)
│  │  ├─ conversation_id (FK)
│  │  ├─ role (user/assistant/system)
│  │  ├─ content
│  │  ├─ embedding (VECTOR)
│  │  ├─ metadata (JSONB)
│  │  └─ Realtime enabled
│  │
│  ├─ data_embeddings
│  │  ├─ id (UUID)
│  │  ├─ document_id (FK)
│  │  ├─ chunk_text
│  │  ├─ embedding (VECTOR 1536)
│  │  └─ similarity search function
│  │
│  └─ ml_models
│     ├─ id (UUID)
│     ├─ name
│     ├─ model_type
│     ├─ version
│     ├─ metrics (JSONB)
│     ├─ storage_path
│     └─ trained_at
│
├─ Extensiones:
│  ├─ uuid-ossp (UUID generation)
│  ├─ pgvector (Vector embeddings)
│  └─ pg_cron (Scheduled jobs)
│
├─ Funciones:
│  ├─ match_embeddings() → Búsqueda vectorial
│  ├─ hybrid_search() → Búsqueda texto + vector
│  └─ get_predictions() → Llamada a ML service
│
├─ Storage Buckets:
│  ├─ csv-uploads/ (Archivos CSV subidos)
│  ├─ excel-files/ (Archivos Excel)
│  ├─ pdf-reports/ (Reportes generados)
│  ├─ ml-models/ (Modelos entrenados)
│  └─ user-exports/ (Exportaciones de usuario)
│
└─ Row Level Security (RLS):
   └─ Cada tabla tiene políticas:
      ├─ SELECT: users ver su propio data
      ├─ INSERT: users insertar su data
      ├─ UPDATE: users actualizar su data
      └─ DELETE: users eliminar su data
```

### 2. Redis Architecture

```
Redis Server (Port 6379)
│
├─ Session Store
│  ├─ Key: session:{sessionId}
│  ├─ Value: { userId, roles, permissions }
│  └─ TTL: 7 días
│
├─ Cache Layer
│  ├─ Key: cache:inventory:{id}
│  ├─ Value: { product_data }
│  └─ TTL: 5 minutos
│
├─ Rate Limiting
│  ├─ Key: rate_limit:{ip}:{endpoint}
│  ├─ Value: request_count
│  └─ TTL: 1 minuto
│
├─ Job Queue (Bull)
│  ├─ Queue: predictions
│  │  └─ Jobs: [{ type: 'train', params: {...} }]
│  │
│  ├─ Queue: notifications
│  │  └─ Jobs: [{ type: 'email', to, subject }]
│  │
│  └─ Queue: processing
│     └─ Jobs: [{ type: 'pdf_extract', file_id }]
│
├─ Pub/Sub (WebSockets)
│  ├─ Channel: updates:inventory
│  ├─ Channel: updates:orders
│  └─ Channel: updates:predictions
│
└─ Temporal Cache
   ├─ Key: temp:{requestId}
   ├─ Value: intermediate_results
   └─ TTL: 1 hora
```

---

## ARQUITECTURA ML

### 1. Pipeline de Machine Learning

```
ML Service (FastAPI - Port 8001)
│
├─ DATA INGESTION
│  ├─ Lee CSV/Excel
│  ├─ Validación de columnas
│  ├─ Estadística descriptiva
│  └─ Detección de anomalías
│
├─ FEATURE ENGINEERING
│  ├─ Temporal features:
│  │  ├─ Year, Month, DayOfWeek, Quarter
│  │  └─ Seasonality indicators
│  │
│  ├─ Lag features (t-1, t-7, t-14, t-30):
│  │  └─ Captura dependencias temporales
│  │
│  ├─ Moving averages (7d, 14d, 30d):
│  │  └─ Suaviza fluctuaciones
│  │
│  ├─ Trend features:
│  │  └─ Cambio porcentual
│  │
│  ├─ Inventory features:
│  │  ├─ Stock/Sales ratio
│  │  └─ Low stock indicator
│  │
│  └─ Categorical encoding:
│     ├─ LabelEncoder para número_parte
│     ├─ OneHotEncoder para categoría
│     └─ Manejo de valores nuevos
│
├─ DATA PREPARATION
│  ├─ Remover missing values
│  ├─ Outlier detection (IQR method)
│  ├─ Feature scaling (StandardScaler)
│  └─ Train/Test split (80/20)
│
├─ MODEL TRAINING
│  │
│  ├─ Random Forest
│  │  ├─ n_estimators: 100
│  │  ├─ max_depth: 15
│  │  ├─ min_samples_split: 5
│  │  ├─ max_features: 'sqrt'
│  │  └─ Para capturar no-linealidades
│  │
│  ├─ Gradient Boosting
│  │  ├─ n_estimators: 100
│  │  ├─ max_depth: 6
│  │  ├─ learning_rate: 0.1
│  │  ├─ subsample: 0.8
│  │  └─ Para obtener mejor precisión
│  │
│  └─ Ensemble (votación):
│     └─ Combina predicciones de ambos
│
├─ EVALUATION
│  ├─ Train Metrics:
│  │  ├─ MAE (Mean Absolute Error)
│  │  ├─ RMSE (Root Mean Squared Error)
│  │  └─ R² Score
│  │
│  ├─ Test Metrics:
│  │  ├─ MAE
│  │  ├─ RMSE
│  │  └─ R² (target > 0.85)
│  │
│  └─ Cross-Validation:
│     ├─ 5-fold CV
│     ├─ Calcula std de error
│     └─ Detecta overfitting
│
├─ MODEL PERSISTENCE
│  ├─ Serialización: joblib
│  ├─ Almacenamiento: Supabase Storage
│  ├─ Versionado: v1.0, v1.1, etc.
│  └─ Metadata: métricas, features, scaler
│
└─ PREDICTION SERVICE
   ├─ Carga modelo
   ├─ Prepara features nuevas
   ├─ Aplica transformaciones
   ├─ Realiza predicción
   └─ Retorna con intervalo confianza
```

### 2. Flujo Completo de Entrenamiento

```
1. Usuario sube CSV en Web
   └─ POST /upload
      └─ File guardado en Supabase Storage

2. API Gateway procesa
   └─ Validación de formato
   └─ Envía a ML Service

3. ML Service - DemandPredictor
   ├─ Carga CSV en memoria
   ├─ Validación de columnas
   │  └─ Requiere: fecha, numero_parte, cantidad_vendida
   ├─ Preparación de features
   ├─ Split train/test
   ├─ Escalado (StandardScaler.fit_transform)
   ├─ Entrenamiento modelos
   │  ├─ Random Forest
   │  └─ Gradient Boosting
   ├─ Evaluación
   │  ├─ Calcula MAE, RMSE, R²
   │  └─ CV 5-fold
   ├─ Persistencia
   │  └─ joblib.dump(model_data, 'models/demand.joblib')
   └─ Retorna métricas

4. Almacenamiento
   ├─ Redis: cache de resultados (5 min)
   ├─ PostgreSQL: metadata en tabla ml_models
   ├─ Storage: archivo joblib
   └─ WebSocket: notifica al frontend

5. Frontend actualiza
   ├─ Muestra métricas de entrenamiento
   ├─ Habilita botón de predicción
   └─ Guarda model_id en state
```

### 3. Flujo de Predicción

```
1. Usuario selecciona producto y dias_ahead
   └─ GET /api/predictions?producto=SKU123&days=30

2. ML Service
   ├─ Carga modelo entrenado
   ├─ Filtra datos históricos del producto
   ├─ Para cada día futuro:
   │  ├─ Prepara features
   │  ├─ Aplica scaling
   │  ├─ Predice con ambos modelos
   │  ├─ Promedia predicciones
   │  └─ Calcula intervalo confianza
   └─ Retorna array de predicciones

3. Respuesta
   {
     "predictions": [
       {
         "fecha": "2025-11-01",
         "prediccion_demanda": 150.5,
         "confidence_lower": 130.2,
         "confidence_upper": 170.8,
         "dias_adelante": 1
       },
       ...
     ],
     "modelo_usado": "ensemble"
   }

4. Frontend renderiza
   ├─ Gráfico con línea de predicción
   ├─ Banda de confianza sombreada
   ├─ Comparación con histórico
   └─ KPIs (MAE, RMSE, etc.)
```

---

## FLUJOS DE DATOS DETALLADOS

### Flujo 1: Análisis de Demanda (End-to-End)

```
USUARIO:
  1. Accede a /analytics/demand-forecast
  2. Selecciona producto (dropdown)
  3. Selecciona período (date range)
  4. Hace click en "Generate Forecast"

FRONTEND (React):
  5. useQuery hook envía GET /api/predictions
  6. Estado: isLoading = true
  7. Muestra spinner

API GATEWAY (Fastify):
  8. Recibe GET /api/predictions?numero_parte=SKU123&days=30
  9. Middleware: Valida JWT token
  10. Servicio: Busca en cache Redis
  11. Si NO está en cache:
     a. Llama a ML Service
     b. ML Service carga modelo
     c. Calcula features
     d. Genera predicciones
     e. Guarda en Redis (5 min TTL)

ML SERVICE (FastAPI):
  12. DemandPredictor.load_model()
  13. DemandPredictor.prepare_features()
  14. DemandPredictor.predict()
  15. Retorna JSON con predicciones

API GATEWAY:
  16. Transforma respuesta
  17. Retorna HTTP 200 + JSON

FRONTEND (React):
  18. React Query actualiza state
  19. Re-render componente
  20. Recharts renderiza gráfico
  21. Muestra métricas (MAE, R², etc.)

USUARIO VE:
  22. Gráfico interactivo con:
     - Línea histórica (pasado)
     - Línea de predicción (futuro)
     - Banda de confianza (sombreado)
     - Tooltip con valores
```

### Flujo 2: Procesamiento de PDF (Async con Bull Queue)

```
USUARIO:
  1. Carga PDF en upload zone
  2. Frontend: POST /api/documents/upload

API GATEWAY:
  3. Valida archivo (size, type)
  4. Guarda en Supabase Storage
  5. Crea registro en BD (documents table)
  6. Encola job en Bull queue
  7. Retorna 202 Accepted + document_id

BULL WORKER (Async):
  8. Toma job de queue
  9. Descarga PDF
  10. pdf-processor.extractText()
  11. Divide en chunks (RAG)
  12. Para cada chunk:
      a. Genera embedding (OpenAI)
      b. Guarda en pgVector
  13. Actualiza documento status = 'completed'
  14. Publica en WebSocket

REALTIME (WebSocket):
  15. Subscriber recibe update
  16. Frontend notificado

FRONTEND:
  17. Toast: "PDF procesado exitosamente"
  18. Habilita botón de chat
  19. Actualiza lista de documentos

USUARIO PUEDE:
  20. Hacer preguntas sobre el PDF
  21. RAG busca chunks relevantes
  22. LLM genera respuesta contextualizada
```

### Flujo 3: Gestión de Órdenes en Tiempo Real

```
REPARTIDOR (APP MÓVIL):
  1. Recibe notificación de nueva orden
  2. Abre orden #ORD-12345
  3. Hace click en "Aceptar"
  4. Socket emite: { action: 'order_accepted', orderId }

API GATEWAY (WebSocket handler):
  5. Recibe evento del repartidor
  6. Valida JWT del repartidor
  7. Actualiza en BD: estado = 'ASIGNADA'
  8. Publica en channel 'orders:updates'

SUSCRIPTORES:
  9a. ADMINISTRADOR (web):
      ├─ Recibe actualización via WebSocket
      ├─ Dashboard se actualiza
      └─ Ve orden con status 'ASIGNADA'

  9b. CLIENTE (web):
      ├─ Recibe notificación push
      ├─ Ve en tracking "Repartidor asignado"
      └─ Puede ver GPS en tiempo real

  9c. ALMACENISTA (app):
      ├─ Recibe notificación
      ├─ Ve orden lista para preparar
      └─ Comienza picking

REPARTIDOR (en ruta):
  10. Inicia navegación (Google Maps)
  11. Abre orden
  12. App emite GPS cada 30 seg
  13. Backend actualiza coordenadas

TRACKING EN TIEMPO REAL:
  14. Cliente abre tracking
  15. WebSocket actualiza pin en mapa
  16. Se ve movimiento del repartidor
  17. ETA se recalcula

ENTREGA:
  18. Repartidor llega
  19. Click "Confirmar entrega"
  20. Toma foto con cámara
  21. Envía confirmación

API GATEWAY:
  22. Actualiza orden: estado = 'ENTREGADA'
  23. Guarda foto en Storage
  24. Publica notificación

NOTIFICACIONES:
  25. Cliente: "Su orden fue entregada"
  26. Almacenista: Recuento de entrega
  27. Admin: Dashboard se actualiza
```

---

## MODELO DE DEPLOYMENT

### Arquitectura de Producción

```
INTERNET
  │
  ├─ Dominio: embler.example.com
  │
  ├─ CloudFlare CDN
  │  └─ Cache estático
  │
  ├─ Coolify (o similar)
  │  ├─ Orchestración
  │  └─ Auto-scaling
  │
  ├─ HTTPS/TLS
  │  └─ Let's Encrypt
  │
  ├─ Load Balancer
  │  ├─ Sticky sessions
  │  └─ Health checks
  │
  ├─ Docker Swarm / Kubernetes
  │  │
  │  ├─ Frontend Services (2-3 réplicas)
  │  │  ├─ Shell App
  │  │  ├─ Analytics Module
  │  │  └─ Logistics Module
  │  │
  │  ├─ Backend Services (3-5 réplicas)
  │  │  └─ API Gateway
  │  │
  │  ├─ ML Services (1-2 réplicas)
  │  │  └─ FastAPI Server
  │  │
  │  ├─ Worker Services
  │  │  ├─ Bull Queue Workers
  │  │  ├─ PDF Processors
  │  │  └─ Embedding Generators
  │  │
  │  └─ Data Services (managed)
  │     ├─ PostgreSQL (Supabase)
  │     └─ Redis Cluster
  │
  └─ Monitoring & Logging
     ├─ Prometheus
     ├─ Grafana
     ├─ ELK Stack
     └─ Sentry
```

### CI/CD Pipeline

```
GIT PUSH
  │
  ├─ GitHub Actions
  │
  ├─ Stage 1: Lint & Type Check
  │  ├─ eslint
  │  ├─ tsc --noEmit
  │  └─ prettier check
  │
  ├─ Stage 2: Unit Tests
  │  ├─ Jest (Frontend)
  │  ├─ Pytest (Backend/ML)
  │  └─ Coverage > 80%
  │
  ├─ Stage 3: E2E Tests
  │  ├─ Playwright
  │  └─ Critical paths
  │
  ├─ Stage 4: Build
  │  ├─ npm run build (frontend)
  │  ├─ tsc (backend)
  │  ├─ Docker build images
  │  └─ Push a registry
  │
  ├─ Stage 5: Security Scan
  │  ├─ Snyk (vulnerabilities)
  │  ├─ OWASP (security)
  │  └─ Dependency check
  │
  ├─ Stage 6: Deploy
  │  ├─ Dev: Inmediato
  │  ├─ Staging: Con aprobación
  │  └─ Prod: Con aprobación + backup
  │
  └─ Stage 7: Smoke Tests
     └─ Verifica endpoints principales
```

---

## CONSIDERACIONES DE PERFORMANCE

### 1. Optimizaciones Frontend

```
CODE SPLITTING:
├─ Webpack splitChunks automático
├─ Route-based code splitting
└─ Dynamic imports: React.lazy()

CACHING:
├─ React Query: staleTime = 5 minutos
├─ LocalStorage para user prefs
├─ Service Worker para offline (PWA)
└─ Browser cache headers

RENDERING:
├─ React 18: Automatic batching
├─ Memoization: React.memo()
├─ useCallback para event handlers
└─ useId para keys estables

ASSETS:
├─ Images: WebP + fallback
├─ Compression: GZIP/Brotli
├─ CDN: CloudFlare
└─ Tree shaking: Producción builds
```

### 2. Optimizaciones Backend

```
CACHING LAYER:
├─ Redis: Inventario (5 min TTL)
├─ Query cache: Resultados frecuentes
├─ ETag: Para conditional requests
└─ HTTP cache headers

DATABASE:
├─ Índices: numero_parte, estado, user_id
├─ Connection pooling: PgBouncer
├─ Query optimization: EXPLAIN ANALYZE
└─ Materialized views: Agregaciones

API:
├─ Pagination: 50 items default
├─ Projection: Solo campos necesarios
├─ Compression: gzip/deflate
└─ Rate limiting: 100 req/min

ASYNC PROCESSING:
├─ Bull queues: PDF, embeddings
├─ Background workers: Predicciones
└─ Batch operations: Actualizaciones masivas
```

### 3. Optimizaciones ML

```
MODEL:
├─ Lightweight: Random Forest vs NNs
├─ Batch predictions: 1000s en paralelo
├─ Feature caching: Pre-computed
└─ Model versioning: A/B testing

INFERENCE:
├─ Load balancing: Múltiples workers
├─ GPU: Disponible para DL models
├─ Memory pooling: Reutilizar tensores
└─ Quantization: Modelos ligeros

TRAINING:
├─ Incremental learning: Online training
├─ Distributed: Ray, Dask
├─ Scheduled: Off-peak hours
└─ Data sampling: Para datasets grandes
```

### 4. Benchmarks Target

| Métrica | Target | Actual |
|---------|--------|--------|
| Dashboard carga | < 2s | - |
| API response | < 200ms p95 | - |
| Predicción | < 500ms | - |
| Chat IA | < 3s | - |
| 99% uptime | 99.9% | - |
| Concurrent users | 100+ | - |

---

## SEGURIDAD EN CAPAS

### 1. Capa de Transporte

```
HTTPS/TLS 1.3
├─ Todos los endpoints
├─ HSTS headers
├─ Certificate pinning (futuro)
└─ Perfect Forward Secrecy
```

### 2. Capa de Aplicación

```
AUTENTICACIÓN:
├─ JWT: access token (15 min) + refresh (7 días)
├─ HTTP-only cookies: Refresh token
├─ Token rotation: Automático
└─ Session invalidation: Logout

AUTORIZACIÓN:
├─ Role-based: admin/analyst/user
├─ Permission-based: Fine-grained
├─ Attribute-based: Context-aware
└─ Resource-based: Ownership check

VALIDACIÓN:
├─ Zod schemas: Input validation
├─ OWASP top 10: Prevention
├─ SQL injection: Prepared statements (Prisma)
├─ XSS: Content-Security-Policy headers
└─ CSRF: SameSite cookies
```

### 3. Capa de Datos

```
ROW LEVEL SECURITY (RLS):
├─ PostgreSQL policies
├─ Users ven su data
├─ Admins ven todo
└─ Compartir público: is_public flag

ENCRYPTION:
├─ At rest: PG encryption
├─ At transit: TLS
├─ Sensitive fields: AES-256 (futuro)
└─ Audit trail: Logging de cambios

BACKUPS:
├─ Supabase: Automático diario
├─ Retention: 7 días
├─ Point-in-time recovery
└─ Geo-redundancy
```

### 4. Capa de Infraestructura

```
NETWORK:
├─ VPC: Aislamiento de red
├─ Firewalls: Ingress/egress rules
├─ DDoS protection: Cloudflare
└─ WAF: Web Application Firewall

CONTAINERS:
├─ Image scanning: Vulnerabilities
├─ Read-only filesystem
├─ Resource limits (CPU/Memory)
└─ No root execution

SECRETS:
├─ Environment variables (managed)
├─ Vault: Para credenciales
├─ Rotation: Automática
└─ Audit logging: Acceso a secrets
```

---

## MATRIZ DE COMPONENTES

```
┌─────────────────┬──────────────┬──────────────┬──────────────┐
│ Componente      │ Tecnología   │ Puerto       │ Escalabilidad│
├─────────────────┼──────────────┼──────────────┼──────────────┤
│ Shell App       │ React + TS   │ 3000         │ Horizontal   │
│ Analytics Mod   │ React + TS   │ 3002         │ Horizontal   │
│ Logistics Mod   │ React + TS   │ 3003         │ Horizontal   │
│ API Gateway     │ Fastify      │ 3001         │ Horizontal   │
│ ML Service      │ FastAPI      │ 8001         │ Vertical     │
│ PostgreSQL      │ Supabase     │ 5432         │ Vertical     │
│ Redis           │ Redis        │ 6379         │ Cluster      │
│ Nginx           │ Nginx        │ 80/443       │ Horizontal   │
│ Adminer         │ PHP          │ 8080         │ Stateless    │
└─────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## CONCLUSIONES ARQUITECTÓNICAS

### Fortalezas

✅ **Separación de Concerns:** Frontend, Backend, ML desacoplados  
✅ **Escalabilidad Horizontal:** Múltiples réplicas posibles  
✅ **Resiliencia:** Caching, fallbacks, circuit breakers  
✅ **Seguridad Multinivel:** Defensa en profundidad  
✅ **Observabilidad:** Logging, métricas, tracing  

### Áreas de Mejora

⚠️ **Testing:** Falta cobertura de tests  
⚠️ **Monitoreo:** Necesita Prometheus/Grafana  
⚠️ **Documentation:** Falta OpenAPI specs  
⚠️ **Disaster Recovery:** Plan de recuperación  
⚠️ **Performance:** Load testing no realizado  

### Próximas Evoluciones

→ Event-driven architecture (Kafka/RabbitMQ)  
→ GraphQL API (complemento REST)  
→ Microservicios (descomponer API Gateway)  
→ Service mesh (Istio)  
→ GitOps (ArgoCD)  

---

**Documento Compilado:** 31 de Octubre de 2025  
**Versión:** 1.0.0 - Technical Deep Dive
