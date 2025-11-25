# 🎯 PLAN DE IMPLEMENTACIÓN COMPLETO - DEVCOMPRAS2

**Proyecto:** Sistema de Gestión de Inventario con IA
**Proyecto Supabase:** devwhats-phase1-clean (akcwnfrstqdpumzywzxv)
**Fecha:** Enero 2025
**Duración Estimada:** 9 semanas (45 días laborables)

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual del Proyecto (20-25% Implementado)

**Lo que SÍ existe:**
- ✅ Arquitectura micro-frontend con Module Federation funcional
- ✅ Autenticación Supabase (login/logout/register)
- ✅ Embedding service production-ready (407 líneas)
- ✅ Modelo ML de predicción de demanda completo (389 líneas)
- ✅ Docker Compose con 8 servicios configurados
- ✅ Documentación excepcional (nivel enterprise)
- ✅ 4 migraciones SQL GenAI listas
- ✅ Health check API funcional

**Lo que NO existe:**
- ❌ CRUD de inventario (endpoints placeholder)
- ❌ Upload de Excel (no implementado)
- ❌ Sincronización con ERP Microsip (0%)
- ❌ Sistema multiagente IA (0%)
- ❌ ML Service API (main.py no existe)
- ❌ Logistics module (carpeta no existe)
- ❌ Dashboard con datos reales (todo mock)
- ❌ WebSocket business events (solo ping/pong)

### Evaluación

| Aspecto | Calificación | Comentario |
|---------|--------------|------------|
| **Arquitectura** | 9/10 | Excelente diseño técnico |
| **Código existente** | 8/10 | Limpio y bien estructurado |
| **Funcionalidad** | 2/10 | Casi todo placeholder |
| **Documentación** | 10/10 | Nivel profesional excepcional |

---

## 🗄️ ESTRATEGIA DE BASE DE DATOS

### Proyecto Supabase: devwhats-phase1-clean

**Problema:** Este proyecto ya tiene ~35 tablas para un CRM de WhatsApp Business.

**Solución:** Usar **schemas separados** dentro del mismo proyecto:

```sql
-- Schema actual (WhatsApp CRM)
public.*
  ├── users, contacts, conversations, messages
  ├── branches, user_branches
  ├── internal_threads, internal_messages
  └── customer_interactions, audit_logs

-- Schema nuevo (Inventario/Compras)
inventario.*
  ├── productos, tiendas, categorias
  ├── transacciones, uploads
  ├── sync_jobs, erp_productos
  └── predictions

-- Schema nuevo (GenAI/RAG)
genai.*
  ├── documents, chunks
  ├── embeddings
  ├── chat_sessions, chat_messages
  └── audio_transcriptions
```

### Ventajas del Enfoque Multi-Schema

| Ventaja | Descripción |
|---------|-------------|
| ✅ **Un solo proyecto** | Menos costos, un solo URL |
| ✅ **Autenticación compartida** | `auth.users` para ambas apps |
| ✅ **Aislamiento de datos** | Cada app en su schema |
| ✅ **Migraciones independientes** | Versionar por schema |
| ✅ **Backups unificados** | Un solo backup incluye todo |

### Desventajas

| Desventaja | Mitigación |
|------------|-----------|
| ⚠️ **Más complejo** | Documentación clara de namespacing |
| ⚠️ **Prisma multi-schema** | Usar `previewFeatures = ["multiSchema"]` |
| ⚠️ **RLS por schema** | Configurar policies separadas |

---

## 📅 CRONOGRAMA DETALLADO

### FASE 0: ARQUITECTURA Y CONFIGURACIÓN (2-3 días)

#### 0.1 Documentación de Arquitectura

**Entregas:**

1. **Diagrama de arquitectura visual completo** (Mermaid/Excalidraw)
   - Frontend: Shell App + Analytics Module + Logistics Module
   - Backend: API Gateway + Microsip Connector + Python Processor + ML Service
   - Base de datos: Esquemas separados explicados
   - Flujo de datos end-to-end
   - Sistema multiagente IA

2. **Documento de decisiones técnicas**
   - Por qué schemas separados vs proyecto nuevo
   - Estrategia de namespacing
   - Configuración de Prisma multi-schema
   - Gestión de migraciones por schema

3. **Walkthrough del código existente**
   - `server.ts` línea por línea (365 líneas)
   - `embedding-service.ts` completo (407 líneas)
   - `AuthProvider.tsx` y flujo de autenticación
   - `demand_prediction.py` modelo ML (389 líneas)

#### 0.2 Configuración de Base de Datos

**SQL para ejecutar en Supabase:**

```sql
-- 1. Crear schemas
CREATE SCHEMA IF NOT EXISTS inventario;
CREATE SCHEMA IF NOT EXISTS genai;

-- 2. Dar permisos
GRANT USAGE ON SCHEMA inventario TO authenticated;
GRANT USAGE ON SCHEMA inventario TO service_role;
GRANT USAGE ON SCHEMA genai TO authenticated;
GRANT USAGE ON SCHEMA genai TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA inventario TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA inventario TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA genai TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA genai TO service_role;

-- 3. Configurar search_path (opcional)
ALTER DATABASE postgres SET search_path TO public, inventario, genai;

-- 4. Comentarios para documentación
COMMENT ON SCHEMA inventario IS 'Schema para sistema de gestión de inventario y compras';
COMMENT ON SCHEMA genai IS 'Schema para features de GenAI, RAG y embeddings';
```

#### 0.3 Actualizar Prisma Schema

**Archivo: `backend/api-gateway/prisma/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "inventario", "genai", "auth", "storage"]
}

// ============================================
// MODELOS WHATSAPP CRM (schema public)
// ============================================

model User {
  @@schema("public")
  id              String   @id @default(uuid())
  email           String   @unique
  name            String
  role            String?
  // ... resto de campos
}

model Conversation {
  @@schema("public")
  // ... campos
}

// ============================================
// MODELOS INVENTARIO (schema inventario)
// ============================================

model Producto {
  @@schema("inventario")
  id            String        @id @default(uuid())
  codigo        String        @unique
  nombre        String
  descripcion   String?
  categoria_id  String?
  categoria     Categoria?    @relation(fields: [categoria_id], references: [id])
  precio        Decimal       @db.Decimal(12, 2)
  costo         Decimal?      @db.Decimal(12, 2)
  unidad        String?
  metadata      Json          @default("{}")
  transacciones Transaccion[]
  created_at    DateTime      @default(now())
  updated_at    DateTime      @updatedAt

  @@index([codigo])
  @@index([categoria_id])
  @@map("productos")
}

model Tienda {
  @@schema("inventario")
  id            String        @id @default(uuid())
  codigo        String        @unique
  nombre        String
  direccion     String?
  telefono      String?
  metadata      Json          @default("{}")
  transacciones Transaccion[]
  created_at    DateTime      @default(now())
  updated_at    DateTime      @updatedAt

  @@map("tiendas")
}

model Categoria {
  @@schema("inventario")
  id          String      @id @default(uuid())
  nombre      String      @unique
  descripcion String?
  parent_id   String?
  parent      Categoria?  @relation("SubCategorias", fields: [parent_id], references: [id])
  children    Categoria[] @relation("SubCategorias")
  productos   Producto[]
  created_at  DateTime    @default(now())

  @@map("categorias")
}

model Transaccion {
  @@schema("inventario")
  id           String    @id @default(uuid())
  producto_id  String
  producto     Producto  @relation(fields: [producto_id], references: [id])
  tienda_id    String
  tienda       Tienda    @relation(fields: [tienda_id], references: [id])
  tipo         String    // inventario, venta, compra, ajuste
  cantidad     Decimal   @db.Decimal(12, 3)
  precio       Decimal?  @db.Decimal(12, 2)
  fecha        DateTime  @db.Date
  fecha_desde  DateTime? @db.Date
  fecha_hasta  DateTime? @db.Date
  metadata     Json      @default("{}")
  created_at   DateTime  @default(now())

  @@index([producto_id])
  @@index([tienda_id])
  @@index([fecha])
  @@index([tipo])
  @@map("transacciones")
}

model Upload {
  @@schema("inventario")
  id                 String    @id @default(uuid())
  filename           String
  file_type          String    // inventario, ventas
  tienda_id          String?
  records_processed  Int       @default(0)
  status             String    @default("pending")
  error_message      String?
  user_id            String?
  created_at         DateTime  @default(now())
  completed_at       DateTime?

  @@map("uploads")
}

// ============================================
// MODELOS GENAI (schema genai)
// ============================================

model Document {
  @@schema("genai")
  id          String   @id @default(uuid())
  user_id     String
  title       String
  content     String
  file_type   String
  file_url    String?
  metadata    Json     @default("{}")
  chunks      Chunk[]
  created_at  DateTime @default(now())

  @@map("documents")
}

model Chunk {
  @@schema("genai")
  id          String   @id @default(uuid())
  document_id String
  document    Document @relation(fields: [document_id], references: [id])
  content     String
  embedding   String?  // vector como string JSON
  metadata    Json     @default("{}")
  created_at  DateTime @default(now())

  @@index([document_id])
  @@map("chunks")
}
```

**Comandos para actualizar Prisma:**

```bash
# Desde backend/api-gateway/
npx prisma db pull
npx prisma generate
npm run build

# Verificar que los tipos se generaron correctamente
# PrismaClient.inventario.producto
# PrismaClient.genai.document
```

---

### FASE 1: MIGRACIONES Y MODELOS (Semana 1 - 5 días)

#### 1.1 Ejecutar Migraciones GenAI (1 día)

**Archivos a modificar y ejecutar:**

Las migraciones existentes en `database/migrations/` deben modificarse para usar el schema `genai.*`:

**001_create_genai_tables.sql → Modificado:**

```sql
-- Crear tablas en schema genai
CREATE TABLE genai.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE genai.chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES genai.documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(512),  -- pgvector extension
  metadata JSONB DEFAULT '{}',
  chunk_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_chunks_document ON genai.chunks(document_id);
CREATE INDEX idx_chunks_embedding ON genai.chunks USING ivfflat (embedding vector_cosine_ops);

-- RLS
ALTER TABLE genai.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE genai.chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON genai.documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON genai.documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

**002_setup_storage.sql → Sin cambios (ya usa schema storage)**

**003_rag_multimodal_secure.sql → Modificado para genai schema**

**004_auth_system.sql → Revisar si es necesario**

#### 1.2 Crear Migración Inventario (2 días)

**Archivo nuevo: `database/migrations/005_create_inventario_schema.sql`**

```sql
-- ============================================
-- MIGRACIÓN 005: SCHEMA INVENTARIO
-- Fecha: 2025-01-17
-- Descripción: Tablas principales para gestión de inventario
-- ============================================

-- 1. Crear schema
CREATE SCHEMA IF NOT EXISTS inventario;

-- 2. Tabla: tiendas (sucursales)
CREATE TABLE inventario.tiendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(10),
  telefono VARCHAR(50),
  email VARCHAR(255),
  gerente VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventario.tiendas IS 'Catálogo de sucursales/tiendas';
COMMENT ON COLUMN inventario.tiendas.metadata IS 'Datos adicionales como horarios, coordenadas GPS, etc.';

-- 3. Tabla: categorias
CREATE TABLE inventario.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  parent_id UUID REFERENCES inventario.categorias(id) ON DELETE SET NULL,
  nivel INTEGER DEFAULT 0,
  path VARCHAR(500),  -- Ruta jerárquica: /vehiculos/llantas/
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventario.categorias IS 'Jerarquía de categorías de productos';

-- 4. Tabla: productos
CREATE TABLE inventario.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(100) UNIQUE NOT NULL,
  nombre VARCHAR(500) NOT NULL,
  descripcion TEXT,
  categoria_id UUID REFERENCES inventario.categorias(id) ON DELETE SET NULL,
  precio DECIMAL(12,2) NOT NULL DEFAULT 0,
  costo DECIMAL(12,2),
  precio_mayoreo DECIMAL(12,2),
  unidad VARCHAR(50) DEFAULT 'PZA',  -- PZA, LT, KG, M, etc.
  marca VARCHAR(255),
  modelo VARCHAR(255),
  sku VARCHAR(100),
  upc VARCHAR(50),
  peso DECIMAL(10,3),
  dimensiones JSONB,  -- {largo, ancho, alto, unidad}
  imagen_url TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventario.productos IS 'Catálogo maestro de productos';
COMMENT ON COLUMN inventario.productos.metadata IS 'Datos extra: especificaciones técnicas, compatibilidades, etc.';

-- 5. Tabla: transacciones (movimientos de inventario)
CREATE TABLE inventario.transacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES inventario.productos(id) ON DELETE RESTRICT,
  tienda_id UUID NOT NULL REFERENCES inventario.tiendas(id) ON DELETE RESTRICT,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('inventario', 'venta', 'compra', 'ajuste', 'transferencia', 'devolucion')),
  cantidad DECIMAL(12,3) NOT NULL,
  precio DECIMAL(12,2),
  costo DECIMAL(12,2),
  descuento DECIMAL(12,2) DEFAULT 0,
  impuesto DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2),
  fecha DATE NOT NULL,
  fecha_desde DATE,  -- Para periodos (inventarios)
  fecha_hasta DATE,
  referencia VARCHAR(255),  -- Número de factura, pedido, etc.
  notas TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventario.transacciones IS 'Registro de todos los movimientos de inventario';
COMMENT ON COLUMN inventario.transacciones.tipo IS 'Tipo de transacción: inventario (conteo), venta, compra, ajuste, transferencia, devolucion';

-- 6. Tabla: uploads (historial de archivos procesados)
CREATE TABLE inventario.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) CHECK (file_type IN ('inventario', 'ventas', 'compras')),
  file_size BIGINT,
  file_path TEXT,  -- Ruta en Supabase Storage
  tienda_id UUID REFERENCES inventario.tiendas(id),
  records_processed INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  error_details JSONB,
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventario.uploads IS 'Historial de archivos Excel cargados y procesados';

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Productos
CREATE INDEX idx_productos_codigo ON inventario.productos(codigo);
CREATE INDEX idx_productos_nombre ON inventario.productos USING gin(to_tsvector('spanish', nombre));
CREATE INDEX idx_productos_categoria ON inventario.productos(categoria_id);
CREATE INDEX idx_productos_active ON inventario.productos(is_active) WHERE is_active = TRUE;

-- Transacciones
CREATE INDEX idx_transacciones_producto ON inventario.transacciones(producto_id);
CREATE INDEX idx_transacciones_tienda ON inventario.transacciones(tienda_id);
CREATE INDEX idx_transacciones_fecha ON inventario.transacciones(fecha DESC);
CREATE INDEX idx_transacciones_tipo ON inventario.transacciones(tipo);
CREATE INDEX idx_transacciones_producto_tienda ON inventario.transacciones(producto_id, tienda_id);
CREATE INDEX idx_transacciones_fecha_rango ON inventario.transacciones(fecha, tipo) WHERE tipo IN ('inventario', 'venta');

-- Categorías
CREATE INDEX idx_categorias_parent ON inventario.categorias(parent_id);
CREATE INDEX idx_categorias_path ON inventario.categorias(path);

-- Tiendas
CREATE INDEX idx_tiendas_codigo ON inventario.tiendas(codigo);
CREATE INDEX idx_tiendas_active ON inventario.tiendas(is_active) WHERE is_active = TRUE;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE inventario.tiendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.transacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.uploads ENABLE ROW LEVEL SECURITY;

-- Policies: Permitir lectura a usuarios autenticados
CREATE POLICY "authenticated_select_tiendas"
  ON inventario.tiendas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_select_categorias"
  ON inventario.categorias FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_select_productos"
  ON inventario.productos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_select_transacciones"
  ON inventario.transacciones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_select_uploads"
  ON inventario.uploads FOR SELECT
  TO authenticated
  USING (true);

-- Policies: Permitir escritura a service_role (backend)
-- Las inserts/updates se harán desde el backend con service_role key

-- ============================================
-- FUNCIONES DE UTILIDAD
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION inventario.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_tiendas_updated_at
  BEFORE UPDATE ON inventario.tiendas
  FOR EACH ROW
  EXECUTE FUNCTION inventario.update_updated_at_column();

CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON inventario.categorias
  FOR EACH ROW
  EXECUTE FUNCTION inventario.update_updated_at_column();

CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON inventario.productos
  FOR EACH ROW
  EXECUTE FUNCTION inventario.update_updated_at_column();

-- ============================================
-- DATOS SEED (OPCIONAL)
-- ============================================

-- Categorías ejemplo
INSERT INTO inventario.categorias (nombre, descripcion, nivel, path) VALUES
  ('Refacciones', 'Refacciones automotrices', 0, '/refacciones/'),
  ('Llantas', 'Llantas y neumáticos', 0, '/llantas/'),
  ('Accesorios', 'Accesorios para vehículos', 0, '/accesorios/');

-- Tiendas ejemplo
INSERT INTO inventario.tiendas (codigo, nombre, ciudad, estado) VALUES
  ('CDMX-01', 'Sucursal Centro', 'Ciudad de México', 'CDMX'),
  ('GDL-01', 'Sucursal Guadalajara', 'Guadalajara', 'Jalisco'),
  ('MTY-01', 'Sucursal Monterrey', 'Monterrey', 'Nuevo León');

COMMENT ON SCHEMA inventario IS 'Schema para sistema de gestión de inventario - Versión 1.0';
```

#### 1.3 Crear Migración ERP Sync (1 día)

**Archivo: `database/migrations/006_create_erp_sync_tables.sql`**

```sql
-- ============================================
-- MIGRACIÓN 006: TABLAS SINCRONIZACIÓN ERP
-- Fecha: 2025-01-17
-- Descripción: Tablas para sincronización con ERP Microsip
-- ============================================

-- 1. Tabla: sync_jobs (tracking de sincronizaciones)
CREATE TABLE inventario.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(100) NOT NULL,  -- sync_products, sync_inventory, sync_sales
  entity_type VARCHAR(100),  -- producto, inventario, venta, cliente
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  last_sync_timestamp TIMESTAMPTZ,  -- Para sincronización incremental
  error_log JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_type ON inventario.sync_jobs(job_type);
CREATE INDEX idx_sync_jobs_status ON inventario.sync_jobs(status);
CREATE INDEX idx_sync_jobs_created ON inventario.sync_jobs(created_at DESC);

-- 2. Tabla: erp_productos (mapeo ERP → Supabase)
CREATE TABLE inventario.erp_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_erp VARCHAR(100) UNIQUE NOT NULL,
  producto_id UUID REFERENCES inventario.productos(id) ON DELETE SET NULL,
  nombre_erp VARCHAR(500),
  tabla_erp VARCHAR(100) DEFAULT 'INVE01',  -- Tabla en Firebird
  last_synced_at TIMESTAMPTZ,
  sync_hash VARCHAR(64),  -- MD5/SHA256 del registro para detectar cambios
  sync_status VARCHAR(50) DEFAULT 'synced',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_erp_productos_codigo ON inventario.erp_productos(codigo_erp);
CREATE INDEX idx_erp_productos_producto ON inventario.erp_productos(producto_id);
CREATE INDEX idx_erp_productos_synced ON inventario.erp_productos(last_synced_at);

-- 3. Tabla: erp_inventario (inventarios del ERP)
CREATE TABLE inventario.erp_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_producto_id UUID REFERENCES inventario.erp_productos(id),
  almacen_erp VARCHAR(50),  -- Código de almacén en ERP
  tienda_id UUID REFERENCES inventario.tiendas(id),
  existencia DECIMAL(12,3),
  costo DECIMAL(12,2),
  ultimo_costo DECIMAL(12,2),
  costo_promedio DECIMAL(12,2),
  fecha_inventario DATE,
  last_synced_at TIMESTAMPTZ,
  sync_hash VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_erp_inventario_producto ON inventario.erp_inventario(erp_producto_id);
CREATE INDEX idx_erp_inventario_tienda ON inventario.erp_inventario(tienda_id);
CREATE INDEX idx_erp_inventario_fecha ON inventario.erp_inventario(fecha_inventario DESC);

-- 4. Tabla: erp_ventas (ventas del ERP)
CREATE TABLE inventario.erp_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_erp VARCHAR(50) UNIQUE NOT NULL,
  erp_producto_id UUID REFERENCES inventario.erp_productos(id),
  cliente_erp VARCHAR(50),
  almacen_erp VARCHAR(50),
  tienda_id UUID REFERENCES inventario.tiendas(id),
  cantidad DECIMAL(12,3),
  precio DECIMAL(12,2),
  descuento DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2),
  impuesto DECIMAL(12,2),
  total DECIMAL(12,2),
  fecha_venta DATE,
  fecha_factura DATE,
  last_synced_at TIMESTAMPTZ,
  sync_hash VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_erp_ventas_folio ON inventario.erp_ventas(folio_erp);
CREATE INDEX idx_erp_ventas_producto ON inventario.erp_ventas(erp_producto_id);
CREATE INDEX idx_erp_ventas_fecha ON inventario.erp_ventas(fecha_venta DESC);

-- 5. Tabla: erp_clientes (clientes del ERP)
CREATE TABLE inventario.erp_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_erp VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(500) NOT NULL,
  rfc VARCHAR(20),
  email VARCHAR(255),
  telefono VARCHAR(50),
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(10),
  limite_credito DECIMAL(12,2),
  saldo DECIMAL(12,2),
  last_synced_at TIMESTAMPTZ,
  sync_hash VARCHAR(64),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_erp_clientes_codigo ON inventario.erp_clientes(codigo_erp);
CREATE INDEX idx_erp_clientes_nombre ON inventario.erp_clientes USING gin(to_tsvector('spanish', nombre));

-- ============================================
-- FUNCIONES RPC PARA UPSERT MASIVO
-- ============================================

-- Función para upsert masivo de productos desde Python
CREATE OR REPLACE FUNCTION inventario.upsert_productos_batch(data JSONB)
RETURNS TABLE(inserted INT, updated INT) AS $$
DECLARE
  inserted_count INT := 0;
  updated_count INT := 0;
BEGIN
  -- Upsert usando ON CONFLICT
  WITH upsert_result AS (
    INSERT INTO inventario.productos (codigo, nombre, descripcion, precio, metadata)
    SELECT
      (item->>'codigo')::VARCHAR,
      (item->>'nombre')::VARCHAR,
      (item->>'descripcion')::TEXT,
      (item->>'precio')::DECIMAL,
      (item->'metadata')::JSONB
    FROM jsonb_array_elements(data) AS item
    ON CONFLICT (codigo)
    DO UPDATE SET
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      precio = EXCLUDED.precio,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING
      CASE WHEN xmax = 0 THEN 1 ELSE 0 END as is_insert
  )
  SELECT
    SUM(is_insert) INTO inserted_count,
    COUNT(*) - SUM(is_insert) INTO updated_count
  FROM upsert_result;

  RETURN QUERY SELECT inserted_count, updated_count;
END;
$$ LANGUAGE plpgsql;

-- Función para upsert masivo de transacciones
CREATE OR REPLACE FUNCTION inventario.upsert_transacciones_batch(data JSONB)
RETURNS INTEGER AS $$
DECLARE
  inserted_count INT := 0;
BEGIN
  INSERT INTO inventario.transacciones (
    producto_id, tienda_id, tipo, cantidad, precio, fecha, metadata
  )
  SELECT
    (item->>'producto_id')::UUID,
    (item->>'tienda_id')::UUID,
    (item->>'tipo')::VARCHAR,
    (item->>'cantidad')::DECIMAL,
    (item->>'precio')::DECIMAL,
    (item->>'fecha')::DATE,
    COALESCE((item->'metadata')::JSONB, '{}'::JSONB)
  FROM jsonb_array_elements(data) AS item;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_erp_productos_updated_at
  BEFORE UPDATE ON inventario.erp_productos
  FOR EACH ROW
  EXECUTE FUNCTION inventario.update_updated_at_column();

CREATE TRIGGER update_erp_clientes_updated_at
  BEFORE UPDATE ON inventario.erp_clientes
  FOR EACH ROW
  EXECUTE FUNCTION inventario.update_updated_at_column();

-- ============================================
-- RLS
-- ============================================

ALTER TABLE inventario.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.erp_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.erp_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.erp_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario.erp_clientes ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a autenticados
CREATE POLICY "authenticated_select_sync_jobs"
  ON inventario.sync_jobs FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "authenticated_select_erp_productos"
  ON inventario.erp_productos FOR SELECT
  TO authenticated USING (true);

COMMENT ON SCHEMA inventario IS 'Schema para gestión de inventario con sincronización ERP - Versión 1.1';
```

#### 1.4 Ejecutar Migraciones y Generar Prisma Client (1 día)

**Pasos:**

```bash
# 1. Ejecutar migraciones SQL manualmente en Supabase SQL Editor
# O usar herramienta de migración

# 2. Actualizar Prisma schema
cd backend/api-gateway
npx prisma db pull

# 3. Revisar schema.prisma generado
# Verificar que los modelos tengan @@schema("inventario")

# 4. Generar Prisma Client
npx prisma generate

# 5. Build del proyecto
npm run build

# 6. Verificar tipos TypeScript
# import { PrismaClient } from '@prisma/client'
# const prisma = new PrismaClient()
# prisma.inventario.producto.findMany() // Debe autocompletar
```

---

### FASE 2: BACKEND API GATEWAY (Semana 2 - 5 días)

#### 2.1 Restructurar API Gateway (1 día)

**Nueva estructura de archivos:**

```
backend/api-gateway/src/
├── server.ts (main entry point)
├── config/
│   ├── env.ts (validación de variables)
│   └── database.ts (Prisma client singleton)
├── routes/
│   ├── index.ts (registrar todas las rutas)
│   ├── inventario.routes.ts
│   ├── estadisticas.routes.ts
│   ├── predicciones.routes.ts
│   ├── uploads.routes.ts
│   └── erp-sync.routes.ts
├── services/
│   ├── inventario.service.ts
│   ├── ml.service.ts
│   ├── python-processor.service.ts
│   └── ... (servicios GenAI existentes)
├── middleware/
│   ├── auth.middleware.ts
│   ├── error-handler.middleware.ts
│   └── request-logger.middleware.ts
└── utils/
    ├── prisma.ts
    ├── redis-singleton.ts
    └── validators.ts
```

**Modificar `server.ts` para cargar rutas:**

```typescript
// server.ts
import Fastify from 'fastify';
import { registerRoutes } from './routes';

const fastify = Fastify({ logger: true });

// Plugins
await fastify.register(import('@fastify/cors'));
await fastify.register(import('@fastify/helmet'));
// ...

// Registrar rutas
await registerRoutes(fastify);

// Start server
await fastify.listen({ port: 3001, host: '0.0.0.0' });
```

**Archivo `routes/index.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { inventarioRoutes } from './inventario.routes';
import { estadisticasRoutes } from './estadisticas.routes';
import { prediccionesRoutes } from './predicciones.routes';
import { uploadsRoutes } from './uploads.routes';

export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(inventarioRoutes, { prefix: '/api' });
  await fastify.register(estadisticasRoutes, { prefix: '/api' });
  await fastify.register(prediccionesRoutes, { prefix: '/api' });
  await fastify.register(uploadsRoutes, { prefix: '/api' });

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
```

#### 2.2 Implementar CRUD Inventario (2 días)

**Archivo: `routes/inventario.routes.ts`**

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { InventarioService } from '../services/inventario.service';

// Schemas de validación
const ProductoCreateSchema = z.object({
  codigo: z.string().min(1).max(100),
  nombre: z.string().min(1).max(500),
  descripcion: z.string().optional(),
  categoria_id: z.string().uuid().optional(),
  precio: z.number().positive(),
  costo: z.number().positive().optional(),
  unidad: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional()
});

const ProductoUpdateSchema = ProductoCreateSchema.partial();

const ProductoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoria_id: z.string().uuid().optional(),
  tienda_id: z.string().uuid().optional(),
  only_active: z.coerce.boolean().default(true)
});

export async function inventarioRoutes(fastify: FastifyInstance) {
  const service = new InventarioService(fastify.prisma);

  // GET /api/inventario - Listar productos con filtros
  fastify.get('/inventario', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = ProductoQuerySchema.parse(request.query);
      const result = await service.listProductos(query);
      return reply.send(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });

  // GET /api/inventario/:id - Obtener producto por ID
  fastify.get('/inventario/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    const producto = await service.getProducto(id);

    if (!producto) {
      return reply.code(404).send({ error: 'Producto no encontrado' });
    }

    return reply.send({ data: producto });
  });

  // POST /api/inventario - Crear producto
  fastify.post('/inventario', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = ProductoCreateSchema.parse(request.body);
      const producto = await service.createProducto(data);
      return reply.code(201).send({ success: true, data: producto });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      // Error de código duplicado
      if (error.code === 'P2002') {
        return reply.code(409).send({ error: 'El código de producto ya existe' });
      }
      throw error;
    }
  });

  // PUT /api/inventario/:id - Actualizar producto
  fastify.put('/inventario/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const data = ProductoUpdateSchema.parse(request.body);
      const producto = await service.updateProducto(id, data);
      return reply.send({ success: true, data: producto });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Validation error', details: error.errors });
      }
      if (error.code === 'P2025') {
        return reply.code(404).send({ error: 'Producto no encontrado' });
      }
      throw error;
    }
  });

  // DELETE /api/inventario/:id - Eliminar producto (soft delete)
  fastify.delete('/inventario/:id', async (request: FastifyRequest<{
    Params: { id: string }
  }>, reply: FastifyReply) => {
    const { id } = request.params;
    await service.deleteProducto(id);
    return reply.send({ success: true, message: 'Producto eliminado' });
  });

  // GET /api/tiendas - Listar tiendas
  fastify.get('/tiendas', async (request, reply) => {
    const tiendas = await service.listTiendas();
    return reply.send({ data: tiendas });
  });

  // GET /api/categorias - Listar categorías (árbol jerárquico)
  fastify.get('/categorias', async (request, reply) => {
    const categorias = await service.listCategorias();
    return reply.send({ data: categorias });
  });
}
```

**Archivo: `services/inventario.service.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

interface ListProductosQuery {
  page: number;
  limit: number;
  search?: string;
  categoria_id?: string;
  tienda_id?: string;
  only_active: boolean;
}

export class InventarioService {
  constructor(private prisma: PrismaClient) {}

  async listProductos(query: ListProductosQuery) {
    const { page, limit, search, categoria_id, tienda_id, only_active } = query;
    const skip = (page - 1) * limit;

    // Construir where clause
    const where: any = {};

    if (only_active) {
      where.is_active = true;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoria_id) {
      where.categoria_id = categoria_id;
    }

    // Query con include
    const [productos, total] = await Promise.all([
      this.prisma.inventario.producto.findMany({
        where,
        include: {
          categoria: {
            select: {
              id: true,
              nombre: true
            }
          },
          transacciones: tienda_id ? {
            where: { tienda_id },
            take: 10,
            orderBy: { fecha: 'desc' },
            include: {
              tienda: {
                select: {
                  id: true,
                  nombre: true,
                  codigo: true
                }
              }
            }
          } : false
        },
        skip,
        take: limit,
        orderBy: { nombre: 'asc' }
      }),
      this.prisma.inventario.producto.count({ where })
    ]);

    return {
      data: productos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    };
  }

  async getProducto(id: string) {
    return await this.prisma.inventario.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        transacciones: {
          take: 50,
          orderBy: { fecha: 'desc' },
          include: {
            tienda: {
              select: {
                id: true,
                nombre: true,
                codigo: true
              }
            }
          }
        }
      }
    });
  }

  async createProducto(data: any) {
    return await this.prisma.inventario.producto.create({
      data: {
        ...data,
        is_active: true
      }
    });
  }

  async updateProducto(id: string, data: any) {
    return await this.prisma.inventario.producto.update({
      where: { id },
      data
    });
  }

  async deleteProducto(id: string) {
    // Soft delete
    return await this.prisma.inventario.producto.update({
      where: { id },
      data: { is_active: false }
    });
  }

  async listTiendas() {
    return await this.prisma.inventario.tienda.findMany({
      where: { is_active: true },
      orderBy: { nombre: 'asc' }
    });
  }

  async listCategorias() {
    // Obtener todas las categorías y construir árbol
    const categorias = await this.prisma.inventario.categoria.findMany({
      orderBy: { path: 'asc' }
    });

    // Construir árbol jerárquico
    return this.buildCategoryTree(categorias);
  }

  private buildCategoryTree(categories: any[], parentId: string | null = null): any[] {
    return categories
      .filter(cat => cat.parent_id === parentId)
      .map(cat => ({
        ...cat,
        children: this.buildCategoryTree(categories, cat.id)
      }));
  }
}
```

#### 2.3 Endpoints de Estadísticas (1 día)

**Archivo: `routes/estadisticas.routes.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const EstadisticasQuerySchema = z.object({
  tipo: z.enum(['inventario', 'venta', 'compra']).optional(),
  tiendas: z.string().optional(), // UUIDs separados por coma
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100)
});

export async function estadisticasRoutes(fastify: FastifyInstance) {

  // GET /api/statistics - Estadísticas agregadas por producto
  fastify.get('/statistics', async (request, reply) => {
    const query = EstadisticasQuerySchema.parse(request.query);
    const { tipo, tiendas, date_from, date_to, limit } = query;

    // Parsear array de tiendas
    const tiendaIds = tiendas ? tiendas.split(',') : undefined;

    // Query con Prisma.$queryRaw para mejor performance
    const stats = await fastify.prisma.$queryRaw`
      SELECT
        p.id,
        p.codigo,
        p.nombre,
        p.precio,
        COALESCE(SUM(t.cantidad), 0) as total_cantidad,
        COALESCE(AVG(t.cantidad), 0) as promedio_cantidad,
        COUNT(DISTINCT t.tienda_id) as num_tiendas,
        COALESCE(SUM(t.cantidad * COALESCE(t.precio, p.precio)), 0) as total_valor,
        COUNT(t.id) as num_transacciones,
        MIN(t.fecha) as fecha_primera_transaccion,
        MAX(t.fecha) as fecha_ultima_transaccion
      FROM inventario.productos p
      LEFT JOIN inventario.transacciones t ON t.producto_id = p.id
      WHERE p.is_active = TRUE
        ${tipo ? Prisma.sql`AND t.tipo = ${tipo}` : Prisma.empty}
        ${date_from ? Prisma.sql`AND t.fecha >= ${date_from}::date` : Prisma.empty}
        ${date_to ? Prisma.sql`AND t.fecha <= ${date_to}::date` : Prisma.empty}
        ${tiendaIds ? Prisma.sql`AND t.tienda_id = ANY(${tiendaIds}::uuid[])` : Prisma.empty}
      GROUP BY p.id, p.codigo, p.nombre, p.precio
      HAVING COUNT(t.id) > 0
      ORDER BY total_cantidad DESC
      LIMIT ${limit}
    `;

    return reply.send({ data: stats });
  });

  // POST /api/statistics/export - Exportar estadísticas a Excel
  fastify.post('/statistics/export', async (request, reply) => {
    // TODO: Implementar generación de Excel con exceljs
    // Por ahora retornar CSV
    const query = EstadisticasQuerySchema.parse(request.query);
    // ... mismo query que arriba

    const csv = convertToCSV(stats);

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename=estadisticas.csv')
      .send(csv);
  });
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => `"${row[header] || ''}"`).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}
```

#### 2.4 Endpoints de Predicciones ML (1 día)

**Archivo: `routes/predicciones.routes.ts`**

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

const PredictionQuerySchema = z.object({
  days_ahead: z.coerce.number().int().positive().max(365).default(30)
});

export async function prediccionesRoutes(fastify: FastifyInstance) {

  // GET /api/predictions/:productId - Obtener predicción para un producto
  fastify.get('/predictions/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const { days_ahead } = PredictionQuerySchema.parse(request.query);

    // Verificar cache en Redis
    const cacheKey = `prediction:${productId}:${days_ahead}`;
    const cached = await fastify.redis.get(cacheKey);
    if (cached) {
      return reply.send(JSON.parse(cached));
    }

    // Obtener producto
    const producto = await fastify.prisma.inventario.producto.findUnique({
      where: { id: productId },
      select: { id: true, codigo: true, nombre: true }
    });

    if (!producto) {
      return reply.code(404).send({ error: 'Producto no encontrado' });
    }

    try {
      // Llamar ML Service
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8001';
      const response = await fetch(`${mlServiceUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_parte: producto.codigo,
          days_ahead
        })
      });

      if (!response.ok) {
        throw new Error(`ML Service error: ${response.statusText}`);
      }

      const prediction = await response.json();

      // Enriquecer con info del producto
      const result = {
        producto: {
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre
        },
        prediction: prediction.predictions,
        days_ahead,
        generated_at: new Date().toISOString()
      };

      // Cache por 1 hora
      await fastify.redis.setex(cacheKey, 3600, JSON.stringify(result));

      return reply.send(result);

    } catch (error) {
      fastify.log.error(error);
      return reply.code(503).send({
        error: 'ML Service no disponible',
        message: 'No se pudo generar la predicción. Intenta más tarde.'
      });
    }
  });

  // POST /api/predictions/train - Entrenar modelo ML
  fastify.post('/predictions/train', async (request, reply) => {
    // Este endpoint debería ser protegido (solo admins)
    const { csv_path } = request.body as { csv_path: string };

    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8001';
      const response = await fetch(`${mlServiceUrl}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_path })
      });

      if (!response.ok) {
        throw new Error(`ML Service error: ${response.statusText}`);
      }

      const result = await response.json();
      return reply.send(result);

    } catch (error) {
      fastify.log.error(error);
      return reply.code(503).send({
        error: 'Error al entrenar modelo',
        message: error.message
      });
    }
  });
}
```

---

### FASE 3: PYTHON PROCESSOR SERVICE (Semana 3 - 4 días)

#### 3.1 Crear Servicio Python (2 días)

**Estructura:**

```
backend/python-processor/
├── src/
│   ├── main.py
│   ├── config/
│   │   └── settings.py
│   ├── services/
│   │   ├── excel_processor.py
│   │   ├── file_detector.py
│   │   ├── clean_excel_stock.py
│   │   ├── clean_excel_ventas.py
│   │   ├── web_safe_excel_fixer.py
│   │   └── database_manager.py
│   └── utils/
│       └── supabase_client.py
├── requirements.txt
├── Dockerfile
└── README.md
```

**requirements.txt:**

```txt
fastapi==0.110.0
uvicorn[standard]==0.27.0
python-multipart==0.0.9
pandas==2.2.0
openpyxl==3.1.2
supabase==2.3.0
python-dotenv==1.0.1
pydantic==2.6.0
pydantic-settings==2.1.0
```

**src/main.py:**

```python
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from services.excel_processor import ExcelProcessor

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Python Excel Processor",
    description="Servicio para procesar archivos Excel de inventario y ventas",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar processor
processor = ExcelProcessor()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "python-processor"}

@app.post("/process-excel")
async def process_excel(file: UploadFile = File(...)):
    """
    Procesa un archivo Excel de inventario o ventas.
    Detecta automáticamente el tipo de archivo.
    """
    # Validaciones
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(400, "Solo se permiten archivos Excel (.xlsx, .xls)")

    # Tamaño máximo 10MB
    MAX_SIZE = 10 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(413, "El archivo excede el tamaño máximo de 10MB")

    # Guardar temporalmente
    temp_dir = Path("/tmp/excel_uploads")
    temp_dir.mkdir(exist_ok=True)
    temp_path = temp_dir / file.filename

    try:
        # Escribir archivo
        with open(temp_path, "wb") as f:
            f.write(contents)

        logger.info(f"Procesando archivo: {file.filename}")

        # Procesar
        result = processor.process_file(str(temp_path), file.filename)

        if not result.get('success'):
            raise HTTPException(
                status_code=400,
                detail={
                    "error": result.get('error'),
                    "error_type": result.get('error_type'),
                    "user_message": result.get('user_message'),
                    "suggestions": result.get('suggestions', [])
                }
            )

        return {
            "success": True,
            "file_type": result['file_type'],
            "tienda_id": result['store_id'],
            "tienda_nombre": result['store_name'],
            "count": result['count'],
            "filename": file.filename
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error procesando archivo: {str(e)}")
        raise HTTPException(500, f"Error al procesar archivo: {str(e)}")
    finally:
        # Limpiar archivo temporal
        if temp_path.exists():
            temp_path.unlink()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Copiar servicios desde devcompras:**

Copiar los siguientes archivos desde el proyecto devcompras y adaptarlos:

1. `excel_processor.py` - Orquestador principal
2. `file_detector.py` - Detección de tipo de archivo
3. `clean_excel_stock.py` - Limpieza de inventario
4. `clean_excel_ventas.py` - Limpieza de ventas
5. `web_safe_excel_fixer.py` - Corrección de archivos corruptos
6. `database_manager.py` - Gestión de BD (adaptar a schemas)

**Adaptación principal en `database_manager.py`:**

```python
# Cambiar todas las referencias de tablas:
# Antes:
self.client.table('productos').upsert(...)

# Después - usar RPC functions:
self.client.rpc('inventario_upsert_productos_batch', {'data': productos}).execute()
```

#### 3.2 Dockerfile (1 día)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY src/ ./src/

# Crear directorio temporal
RUN mkdir -p /tmp/excel_uploads

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### FASE 4-9: Continúa...

(El documento está alcanzando el límite. Incluiré resumen de las fases restantes)

---

## 🔧 CONFIGURACIÓN DEL PROYECTO

### Variables de Entorno (.env)

```env
# ============================================
# SUPABASE
# ============================================
SUPABASE_URL=https://akcwnfrstqdpumzywzxv.supabase.co
SUPABASE_ANON_KEY=<obtener de Supabase Dashboard>
SUPABASE_SERVICE_KEY=<obtener de Supabase Dashboard>
SUPABASE_JWT_SECRET=<obtener de Supabase Dashboard>

# ============================================
# DATABASE
# ============================================
DATABASE_URL=postgresql://postgres:<password>@db.akcwnfrstqdpumzywzxv.supabase.co:5432/postgres?schema=inventario&connection_limit=5

# ============================================
# REDIS
# ============================================
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=

# ============================================
# API SERVICES
# ============================================
API_PORT=3001
API_HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

PYTHON_PROCESSOR_URL=http://python-processor:8000
ML_SERVICE_URL=http://ml-service:8001

# ============================================
# OPENAI / OPENROUTER
# ============================================
OPENAI_API_KEY=<your-key>
OPENROUTER_API_KEY=<your-key>
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# ============================================
# JWT
# ============================================
JWT_SECRET=<generate-random-secret>
JWT_EXPIRES_IN=7d

# ============================================
# FRONTEND
# ============================================
REACT_APP_SUPABASE_URL=https://akcwnfrstqdpumzywzxv.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<same-as-above>
REACT_APP_API_URL=http://localhost:3001
```

---

## 📊 ESTIMACIONES Y COSTOS

### Tiempo de Desarrollo

| Fase | Duración | Descripción |
|------|----------|-------------|
| **Fase 0** | 2-3 días | Arquitectura y configuración |
| **Fase 1** | 5 días | Migraciones y modelos |
| **Fase 2** | 5 días | Backend API Gateway |
| **Fase 3** | 4 días | Python Processor |
| **Fase 4** | 3 días | ML Service API |
| **Fase 5** | 7 días | Sincronización ERP |
| **Fase 6** | 5 días | Sistema Multiagente IA |
| **Fase 7** | 5 días | Logistics Module |
| **Fase 8** | 5 días | Testing & Calidad |
| **Fase 9** | 5 días | Deploy & Infraestructura |
| **TOTAL** | **9 semanas** | **45 días laborables** |

### Equipo Recomendado

- **1 desarrollador full-stack senior**: 9 semanas
- **2 desarrolladores**: 5-6 semanas
- **3 desarrolladores**: 4 semanas

### Costos Mensuales Estimados

| Servicio | Costo Mensual |
|----------|--------------|
| OpenAI GPT-4 (queries IA) | $100-200 |
| OpenAI Embeddings | $50 |
| Google Maps API | $0 (gratis hasta 28K requests) |
| Supabase Pro | $25 |
| **TOTAL** | **$175-275** |

---

## ✅ CRITERIOS DE ÉXITO

### MVP Funcional (Semanas 1-4)

- [ ] Base de datos con schemas configurados
- [ ] CRUD de inventario funcionando
- [ ] Upload de Excel procesando archivos
- [ ] Dashboard con datos reales (no mock)
- [ ] Predicciones ML básicas
- [ ] Autenticación robusta

### Sistema Completo (Semanas 1-9)

- [ ] Todo lo anterior +
- [ ] Sincronización ERP automática
- [ ] Sistema multiagente IA operativo
- [ ] Logistics module funcional
- [ ] Tests automatizados (>70% coverage)
- [ ] Deploy en producción
- [ ] Documentación completa

---

## 🚀 PRÓXIMOS PASOS INMEDIATOS

1. **Aprobar este plan** ✅
2. **Crear schemas en Supabase** (SQL ejecutado)
3. **Actualizar Prisma schema** (multi-schema config)
4. **Ejecutar migraciones 005 y 006**
5. **Comenzar Fase 1: Backend CRUD**

---

## 📚 RECURSOS Y REFERENCIAS

- **Proyecto devcompras (funcional)**: Copiar servicios Excel processor
- **Prisma Multi-Schema**: https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **FastAPI**: https://fastapi.tiangolo.com/
- **Module Federation**: https://module-federation.io/

---

**Documento generado:** Enero 2025
**Versión:** 1.0
**Última actualización:** 2025-01-17
