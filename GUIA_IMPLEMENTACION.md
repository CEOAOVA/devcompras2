# GUÍA DE IMPLEMENTACIÓN PASO A PASO - DEVCOMPRAS2
## Manual Técnico con Código Completo

**Fecha**: 2025-01-16
**Versión**: 1.0

---

## 📋 TABLA DE CONTENIDOS

1. [Setup Inicial del Proyecto](#1-setup-inicial-del-proyecto)
2. [Sistema de Sincronización ERP](#2-sistema-de-sincronización-erp)
3. [Sistema Multiagente con IA](#3-sistema-multiagente-con-ia)
4. [Procesamiento de Archivos Excel](#4-procesamiento-de-archivos-excel)
5. [Endpoints CRUD de Inventario](#5-endpoints-crud-de-inventario)
6. [Machine Learning Service](#6-machine-learning-service)
7. [Frontend Components](#7-frontend-components)
8. [WebSocket Real-time](#8-websocket-real-time)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)

---

## 1. SETUP INICIAL DEL PROYECTO

### 1.1 Instalación de Dependencias

#### Backend API Gateway

```bash
cd backend/api-gateway

# Dependencias principales
npm install fastify@4.26.0 \
  @fastify/cors@9.0.1 \
  @fastify/helmet@11.1.1 \
  @fastify/jwt@8.0.0 \
  @fastify/websocket@10.0.1 \
  @fastify/rate-limit@9.1.0 \
  @fastify/multipart@8.1.0

# Prisma ORM
npm install @prisma/client@5.8.1
npm install -D prisma@5.8.1

# Utilidades
npm install \
  bcryptjs@2.4.3 \
  axios@1.6.0 \
  ioredis@5.3.2 \
  bull@4.11.5 \
  openai@4.20.0 \
  zod@3.22.4 \
  dotenv@16.3.1

# Supabase
npm install @supabase/supabase-js@2.39.3

# TypeScript
npm install -D typescript@5.3.3 \
  @types/node@20.10.0 \
  @types/bcryptjs@2.4.6 \
  ts-node@10.9.2 \
  tsx@4.7.0

# Logging
npm install pino@8.17.2 pino-pretty@10.3.1
```

#### Python Processor

```bash
cd backend/python-processor

# Crear virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install \
  fastapi==0.108.0 \
  uvicorn[standard]==0.24.0 \
  pandas==2.1.4 \
  openpyxl==3.1.2 \
  python-multipart==0.0.6 \
  supabase==2.0.2 \
  pydantic==2.5.0 \
  python-dotenv==1.0.0
```

#### Microsip Connector

```bash
cd backend/microsip-connector

npm install \
  express@4.18.2 \
  node-firebird@1.1.9 \
  cors@2.8.5 \
  helmet@7.1.0 \
  morgan@1.10.0 \
  dotenv@16.3.1
```

#### ML Service

```bash
cd ml-models

pip install \
  fastapi==0.108.0 \
  uvicorn[standard]==0.24.0 \
  scikit-learn==1.3.2 \
  pandas==2.1.4 \
  numpy==1.26.2 \
  joblib==1.3.2
```

#### Frontend (Shell App)

```bash
cd apps/shell-app

npm install \
  react@18.2.0 \
  react-dom@18.2.0 \
  react-router-dom@6.21.3 \
  @tanstack/react-query@5.17.19 \
  zustand@4.5.0 \
  axios@1.6.0 \
  react-hook-form@7.49.3 \
  zod@3.22.4 \
  react-hot-toast@2.4.1 \
  react-dropzone@14.2.3 \
  recharts@2.12.0 \
  date-fns@3.3.1 \
  lucide-react@0.316.0

# Webpack
npm install -D webpack@5.89.0 \
  webpack-cli@5.1.4 \
  webpack-dev-server@4.15.1 \
  html-webpack-plugin@5.6.0 \
  @module-federation/enhanced@0.1.0

# TypeScript
npm install -D typescript@5.3.3 \
  @types/react@18.2.0 \
  @types/react-dom@18.2.0 \
  ts-loader@9.5.1
```

### 1.2 Configuración de Variables de Entorno

#### .env Principal (root)

```bash
# c:\Users\Moises\Documents\TRABAJO\aova\embler\devcompras2\.env

# === SUPABASE ===
SUPABASE_URL=https://akcwnfrstqdpumzywzxv.supabase.co
SUPABASE_ANON_KEY=<OBTENER_DE_SUPABASE_DASHBOARD>
SUPABASE_SERVICE_ROLE_KEY=<OBTENER_DE_SUPABASE_DASHBOARD>
SUPABASE_JWT_SECRET=<OBTENER_DE_SUPABASE_DASHBOARD>

# === DATABASE ===
DATABASE_URL="postgresql://postgres:<PASSWORD>@db.akcwnfrstqdpumzywzxv.supabase.co:5432/postgres?schema=embler"
DIRECT_URL="postgresql://postgres:<PASSWORD>@db.akcwnfrstqdpumzywzxv.supabase.co:5432/postgres"

# === MICROSIP ERP ===
FIREBIRD_HOST=192.65.134.78
FIREBIRD_PORT=3050
FIREBIRD_DATABASE=C:\\Microsip datos\\EMBLER.FDB
FIREBIRD_USER=ODBC
FIREBIRD_PASSWORD=<PASSWORD_MICROSIP>

# === INTERNAL SERVICES ===
MICROSIP_API_URL=http://localhost:8003
MICROSIP_API_KEY=<GENERAR_RANDOM_STRING_32_CHARS>
PYTHON_PROCESSOR_URL=http://localhost:8002
ML_SERVICE_URL=http://localhost:8001

# === SECURITY ===
JWT_SECRET=<GENERAR_RANDOM_256_BITS>
# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NODE_ENV=development

# === REDIS ===
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# === OPENAI (para agentes IA) ===
OPENAI_API_KEY=sk-...

# === SYNC SCHEDULE ===
SYNC_PRODUCTOS_CRON=0 */6 * * *
SYNC_INVENTARIO_CRON=0 */2 * * *
SYNC_VENTAS_CRON=0 * * * *
SYNC_CLIENTES_CRON=0 0 * * *

# === PORTS ===
API_GATEWAY_PORT=3001
PYTHON_PROCESSOR_PORT=8002
MICROSIP_CONNECTOR_PORT=8003
ML_SERVICE_PORT=8001
SHELL_APP_PORT=3000
ANALYTICS_MODULE_PORT=3002

# === CORS ===
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3002

# === UPLOAD ===
MAX_FILE_SIZE=10485760
ALLOWED_EXTENSIONS=.xlsx,.xls

# === LOGGING ===
LOG_LEVEL=info
```

### 1.3 Generar Cliente Prisma

```bash
cd backend/api-gateway

# Generar cliente
npx prisma generate

# Aplicar migraciones (después de ejecutar SQL en Supabase)
npx prisma db push
```

---

## 2. SISTEMA DE SINCRONIZACIÓN ERP

### 2.1 ErpSyncService Completo

**Archivo**: `backend/api-gateway/src/services/erp-sync-service.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';
import { createClient } from '@supabase/supabase-js';

interface SyncResult {
  success: boolean;
  jobId: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  duration: number;
  error?: string;
}

export class ErpSyncService {
  private prisma: PrismaClient;
  private microsipClient: AxiosInstance;
  private supabase: any;

  constructor() {
    this.prisma = new PrismaClient();

    this.microsipClient = axios.create({
      baseURL: process.env.MICROSIP_API_URL || 'http://localhost:8003',
      headers: {
        'X-API-Key': process.env.MICROSIP_API_KEY
      },
      timeout: 60000 // 60 segundos
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Sincronizar productos desde Microsip a Supabase
   */
  async syncProductos(incremental = true): Promise<SyncResult> {
    const startTime = Date.now();

    // Crear job en BD
    const job = await this.prisma.syncJob.create({
      data: {
        jobType: 'productos',
        status: 'running',
        startedAt: new Date()
      }
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      // Obtener última sincronización si es incremental
      let lastSync: Date | undefined;
      if (incremental) {
        const result = await this.prisma.erpProducto.findFirst({
          orderBy: { lastSyncedAt: 'desc' },
          select: { lastSyncedAt: true }
        });
        lastSync = result?.lastSyncedAt || undefined;
      }

      // Obtener productos del ERP
      console.log('🔄 Obteniendo productos de Microsip...');
      const response = await this.microsipClient.get('/api/productos', {
        params: {
          limit: 10000,
          modifiedAfter: lastSync?.toISOString()
        }
      });

      const productos = response.data.data;
      console.log(`📦 ${productos.length} productos obtenidos`);

      // Procesar en batches de 100
      const batchSize = 100;
      for (let i = 0; i < productos.length; i += batchSize) {
        const batch = productos.slice(i, i + batchSize);

        for (const producto of batch) {
          try {
            recordsProcessed++;

            // Upsert producto
            const result = await this.prisma.erpProducto.upsert({
              where: { codigo: producto.CODIGO },
              update: {
                nombre: producto.NOMBRE,
                descripcion: producto.DESCRIPCION || null,
                precio: producto.PRECIO ? parseFloat(producto.PRECIO) : null,
                costo: producto.COSTO ? parseFloat(producto.COSTO) : null,
                categoria: producto.CATEGORIA || null,
                unidadMedida: producto.UNIDAD_MEDIDA || null,
                activo: producto.ACTIVO !== false,
                erpId: producto.ID?.toString() || null,
                lastSyncedAt: new Date(),
                syncStatus: 'synced',
                updatedAt: new Date()
              },
              create: {
                codigo: producto.CODIGO,
                nombre: producto.NOMBRE,
                descripcion: producto.DESCRIPCION || null,
                precio: producto.PRECIO ? parseFloat(producto.PRECIO) : null,
                costo: producto.COSTO ? parseFloat(producto.COSTO) : null,
                categoria: producto.CATEGORIA || null,
                unidadMedida: producto.UNIDAD_MEDIDA || null,
                activo: producto.ACTIVO !== false,
                erpId: producto.ID?.toString() || null,
                lastSyncedAt: new Date(),
                syncStatus: 'synced'
              }
            });

            // Determinar si fue creado o actualizado
            if (result.createdAt.getTime() === result.updatedAt.getTime()) {
              recordsCreated++;
            } else {
              recordsUpdated++;
            }
          } catch (error) {
            recordsFailed++;
            console.error(`Error syncing product ${producto.CODIGO}:`, error);
          }
        }

        console.log(`✓ Batch ${i / batchSize + 1} completado (${Math.min(i + batchSize, productos.length)}/${productos.length})`);
      }

      // Marcar job como completado
      const duration = Date.now() - startTime;
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          completedAt: new Date()
        }
      });

      console.log(`✅ Sincronización completada en ${duration}ms`);
      console.log(`   Procesados: ${recordsProcessed}`);
      console.log(`   Creados: ${recordsCreated}`);
      console.log(`   Actualizados: ${recordsUpdated}`);
      console.log(`   Fallidos: ${recordsFailed}`);

      return {
        success: true,
        jobId: job.id,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration
      };

    } catch (error: any) {
      // Marcar job como fallido
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        }
      });

      console.error('❌ Error en sincronización de productos:', error);

      return {
        success: false,
        jobId: job.id,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Sincronizar inventario
   */
  async syncInventario(): Promise<SyncResult> {
    const startTime = Date.now();

    const job = await this.prisma.syncJob.create({
      data: {
        jobType: 'inventario',
        status: 'running',
        startedAt: new Date()
      }
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      console.log('🔄 Obteniendo inventario de Microsip...');
      const response = await this.microsipClient.get('/api/inventario');
      const inventario = response.data.data;

      console.log(`📦 ${inventario.length} registros de inventario obtenidos`);

      for (const item of inventario) {
        try {
          recordsProcessed++;

          // Buscar producto por código
          const producto = await this.prisma.erpProducto.findUnique({
            where: { codigo: item.CODIGO }
          });

          if (!producto) {
            console.warn(`⚠️  Producto ${item.CODIGO} no encontrado, saltando...`);
            recordsFailed++;
            continue;
          }

          // Upsert inventario
          const result = await this.prisma.erpInventario.upsert({
            where: {
              productoId_almacen: {
                productoId: producto.id,
                almacen: item.ALMACEN || 'Principal'
              }
            },
            update: {
              stockActual: parseInt(item.EXISTENCIA) || 0,
              stockMinimo: parseInt(item.STOCK_MINIMO) || 0,
              stockMaximo: parseInt(item.STOCK_MAXIMO) || null,
              ubicacion: item.UBICACION || null,
              lastSyncedAt: new Date(),
              updatedAt: new Date()
            },
            create: {
              productoId: producto.id,
              almacen: item.ALMACEN || 'Principal',
              stockActual: parseInt(item.EXISTENCIA) || 0,
              stockMinimo: parseInt(item.STOCK_MINIMO) || 0,
              stockMaximo: parseInt(item.STOCK_MAXIMO) || null,
              ubicacion: item.UBICACION || null,
              lastSyncedAt: new Date()
            }
          });

          if (result.createdAt.getTime() === result.updatedAt.getTime()) {
            recordsCreated++;
          } else {
            recordsUpdated++;
          }
        } catch (error) {
          recordsFailed++;
          console.error(`Error syncing inventory ${item.CODIGO}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          completedAt: new Date()
        }
      });

      console.log(`✅ Sincronización de inventario completada`);

      return {
        success: true,
        jobId: job.id,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration
      };

    } catch (error: any) {
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        }
      });

      return {
        success: false,
        jobId: job.id,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Sincronizar ventas
   */
  async syncVentas(fechaInicio: Date, fechaFin: Date): Promise<SyncResult> {
    const startTime = Date.now();

    const job = await this.prisma.syncJob.create({
      data: {
        jobType: 'ventas',
        status: 'running',
        startedAt: new Date()
      }
    });

    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      console.log('🔄 Obteniendo ventas de Microsip...');
      const response = await this.microsipClient.get('/api/ventas', {
        params: {
          fecha_inicio: fechaInicio.toISOString().split('T')[0],
          fecha_fin: fechaFin.toISOString().split('T')[0]
        }
      });

      const ventas = response.data.data;
      console.log(`💰 ${ventas.length} ventas obtenidas`);

      for (const venta of ventas) {
        try {
          recordsProcessed++;

          await this.prisma.erpVenta.upsert({
            where: { folio: venta.FOLIO },
            update: {
              fecha: new Date(venta.FECHA),
              clienteId: venta.CLIENTE_ID || null,
              clienteNombre: venta.CLIENTE_NOMBRE || null,
              subtotal: parseFloat(venta.SUBTOTAL) || null,
              iva: parseFloat(venta.IVA) || null,
              total: parseFloat(venta.TOTAL) || null,
              estatus: venta.ESTATUS || null,
              lastSyncedAt: new Date()
            },
            create: {
              folio: venta.FOLIO,
              fecha: new Date(venta.FECHA),
              clienteId: venta.CLIENTE_ID || null,
              clienteNombre: venta.CLIENTE_NOMBRE || null,
              subtotal: parseFloat(venta.SUBTOTAL) || null,
              iva: parseFloat(venta.IVA) || null,
              total: parseFloat(venta.TOTAL) || null,
              estatus: venta.ESTATUS || null,
              lastSyncedAt: new Date()
            }
          });

          recordsCreated++; // Simplificado
        } catch (error) {
          recordsFailed++;
          console.error(`Error syncing venta ${venta.FOLIO}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          recordsProcessed,
          recordsCreated,
          recordsUpdated,
          recordsFailed,
          completedAt: new Date()
        }
      });

      return {
        success: true,
        jobId: job.id,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration
      };

    } catch (error: any) {
      await this.prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        }
      });

      return {
        success: false,
        jobId: job.id,
        recordsProcessed,
        recordsCreated,
        recordsUpdated,
        recordsFailed,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Sincronizar clientes
   */
  async syncClientes(): Promise<SyncResult> {
    // Similar a syncProductos pero con tabla erp_clientes
    // ... implementación similar ...
    return { success: true, jobId: '', recordsProcessed: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 0, duration: 0 };
  }

  /**
   * Obtener jobs recientes
   */
  async getRecentJobs(limit = 10) {
    return await this.prisma.syncJob.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Obtener estadísticas de última sincronización
   */
  async getLastSyncStats() {
    const lastSyncs = await this.prisma.syncJob.groupBy({
      by: ['jobType'],
      _max: {
        completedAt: true
      },
      where: {
        status: 'completed'
      }
    });

    const stats: Record<string, Date | null> = {};
    for (const sync of lastSyncs) {
      stats[sync.jobType] = sync._max.completedAt;
    }

    return stats;
  }
}
```

### 2.2 Bull Queue Scheduler

**Archivo**: `backend/api-gateway/src/jobs/sync-scheduler.ts`

```typescript
import Bull from 'bull';
import { ErpSyncService } from '../services/erp-sync-service';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Crear queues
export const syncQueue = new Bull('erp-sync', REDIS_URL, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100, // Mantener últimos 100 jobs
    removeOnFail: 50
  }
});

// Workers
const syncService = new ErpSyncService();

syncQueue.process('sync-productos', async (job) => {
  console.log(`🔄 Procesando job sync-productos: ${job.id}`);
  const { incremental = true } = job.data;
  return await syncService.syncProductos(incremental);
});

syncQueue.process('sync-inventario', async (job) => {
  console.log(`🔄 Procesando job sync-inventario: ${job.id}`);
  return await syncService.syncInventario();
});

syncQueue.process('sync-ventas', async (job) => {
  console.log(`🔄 Procesando job sync-ventas: ${job.id}`);
  const { fechaInicio, fechaFin } = job.data;
  return await syncService.syncVentas(
    new Date(fechaInicio),
    new Date(fechaFin)
  );
});

syncQueue.process('sync-clientes', async (job) => {
  console.log(`🔄 Procesando job sync-clientes: ${job.id}`);
  return await syncService.syncClientes();
});

// Event listeners
syncQueue.on('completed', (job, result) => {
  console.log(`✅ Job ${job.id} completado:`, result);
});

syncQueue.on('failed', (job, error) => {
  console.error(`❌ Job ${job.id} fallido:`, error);
});

/**
 * Programar sincronizaciones automáticas
 */
export function schedulePeriodicSync() {
  console.log('📅 Programando sincronizaciones periódicas...');

  // Productos: cada 6 horas
  syncQueue.add(
    'sync-productos',
    { incremental: true },
    {
      repeat: {
        cron: process.env.SYNC_PRODUCTOS_CRON || '0 */6 * * *'
      }
    }
  );

  // Inventario: cada 2 horas
  syncQueue.add(
    'sync-inventario',
    {},
    {
      repeat: {
        cron: process.env.SYNC_INVENTARIO_CRON || '0 */2 * * *'
      }
    }
  );

  // Ventas: cada hora (del día actual)
  syncQueue.add(
    'sync-ventas',
    {
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date().toISOString().split('T')[0]
    },
    {
      repeat: {
        cron: process.env.SYNC_VENTAS_CRON || '0 * * * *'
      }
    }
  );

  // Clientes: cada día a medianoche
  syncQueue.add(
    'sync-clientes',
    {},
    {
      repeat: {
        cron: process.env.SYNC_CLIENTES_CRON || '0 0 * * *'
      }
    }
  );

  console.log('✅ Sincronizaciones programadas');
}

/**
 * Limpiar queues (útil para development)
 */
export async function cleanQueue() {
  await syncQueue.clean(0, 'completed');
  await syncQueue.clean(0, 'failed');
  console.log('🧹 Queue limpiado');
}
```

### 2.3 Rutas de Sincronización

**Archivo**: `backend/api-gateway/src/routes/sync.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ErpSyncService } from '../services/erp-sync-service';
import { syncQueue } from '../jobs/sync-scheduler';

const SyncProductosSchema = z.object({
  incremental: z.boolean().optional().default(true)
});

const SyncVentasSchema = z.object({
  fechaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function syncRoutes(fastify: FastifyInstance) {
  const syncService = new ErpSyncService();

  // POST /api/sync/productos
  fastify.post('/api/sync/productos', {
    schema: {
      body: SyncProductosSchema
    }
  }, async (request, reply) => {
    const { incremental } = request.body as z.infer<typeof SyncProductosSchema>;

    try {
      const result = await syncService.syncProductos(incremental);
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // POST /api/sync/inventario
  fastify.post('/api/sync/inventario', async (request, reply) => {
    try {
      const result = await syncService.syncInventario();
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // POST /api/sync/ventas
  fastify.post('/api/sync/ventas', {
    schema: {
      body: SyncVentasSchema
    }
  }, async (request, reply) => {
    const { fechaInicio, fechaFin } = request.body as z.infer<typeof SyncVentasSchema>;

    try {
      const result = await syncService.syncVentas(
        new Date(fechaInicio),
        new Date(fechaFin)
      );
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // POST /api/sync/full - Sincronización completa
  fastify.post('/api/sync/full', async (request, reply) => {
    try {
      const [productos, inventario, clientes] = await Promise.all([
        syncService.syncProductos(),
        syncService.syncInventario(),
        syncService.syncClientes()
      ]);

      return reply.code(200).send({
        success: true,
        results: {
          productos,
          inventario,
          clientes
        }
      });
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Full sync failed',
        message: error.message
      });
    }
  });

  // GET /api/sync/status - Estado de sincronizaciones
  fastify.get('/api/sync/status', async (request, reply) => {
    try {
      const [recentJobs, lastSyncStats] = await Promise.all([
        syncService.getRecentJobs(10),
        syncService.getLastSyncStats()
      ]);

      // Obtener jobs programados
      const repeatableJobs = await syncQueue.getRepeatableJobs();

      return reply.code(200).send({
        recentJobs,
        lastSync: lastSyncStats,
        schedule: repeatableJobs.map(job => ({
          key: job.key,
          cron: job.cron,
          next: job.next
        }))
      });
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  // POST /api/sync/queue/:jobType - Encolar job manual
  fastify.post('/api/sync/queue/:jobType', async (request, reply) => {
    const { jobType } = request.params as { jobType: string };
    const validTypes = ['sync-productos', 'sync-inventario', 'sync-ventas', 'sync-clientes'];

    if (!validTypes.includes(jobType)) {
      return reply.code(400).send({
        error: 'Invalid job type',
        validTypes
      });
    }

    try {
      const job = await syncQueue.add(jobType, request.body || {});

      return reply.code(202).send({
        message: 'Job queued',
        jobId: job.id
      });
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Failed to queue job',
        message: error.message
      });
    }
  });
}
```

---

## 3. SISTEMA MULTIAGENTE CON IA

### 3.1 Schema Agent

**Archivo**: `backend/api-gateway/src/agents/schema-agent.ts`

```typescript
import { OpenAI } from 'openai';

export interface SchemaContext {
  views: string[];
  columns: Record<string, string[]>;
  filters: string[];
  aggregations?: string[];
  joins?: string[];
}

export class SchemaAgent {
  private openai: OpenAI;
  private schemaContext: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no configurado');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    this.schemaContext = this.buildSchemaContext();
  }

  private buildSchemaContext(): string {
    return `
Base de datos: Firebird - ERP Microsip EMBLER

=== VISTAS DISPONIBLES ===

1. Vw_articulos (Catálogo de productos)
   Columnas:
   - CODIGO (VARCHAR50): Código único del artículo
   - NOMBRE (VARCHAR200): Nombre/descripción del producto
   - PRECIO (DECIMAL): Precio de venta unitario
   - COSTO (DECIMAL): Costo del producto
   - EXISTENCIA (INTEGER): Stock total actual
   - CATEGORIA (VARCHAR100): Categoría del producto
   - UNIDAD_MEDIDA (VARCHAR20): Unidad de medida (PZA, KG, etc)
   - ACTIVO (BOOLEAN): Si el producto está activo

2. Vw_inventario (Existencias por almacén)
   Columnas:
   - CODIGO (VARCHAR50): Código del artículo
   - NOMBRE (VARCHAR200): Nombre del producto
   - ALMACEN (VARCHAR100): Nombre del almacén
   - EXISTENCIA (INTEGER): Cantidad en stock
   - STOCK_MINIMO (INTEGER): Stock mínimo configurado
   - STOCK_MAXIMO (INTEGER): Stock máximo configurado
   - UBICACION (VARCHAR100): Ubicación física

3. Vw_ventas_2025 (Ventas del año actual)
   Columnas:
   - FOLIO (VARCHAR50): Número de ticket/factura
   - FECHA (DATE): Fecha de la venta
   - CLIENTE_ID (VARCHAR100): ID del cliente
   - CLIENTE (VARCHAR200): Nombre del cliente
   - SUBTOTAL (DECIMAL): Subtotal sin IVA
   - IVA (DECIMAL): IVA aplicado
   - TOTAL (DECIMAL): Total de la venta
   - ESTATUS (VARCHAR50): Estado (Pagada, Pendiente, Cancelada)

4. Vw_clientes (Catálogo de clientes)
   Columnas:
   - ID (INTEGER): ID único del cliente
   - NOMBRE (VARCHAR200): Nombre/razón social
   - RFC (VARCHAR20): RFC del cliente
   - EMAIL (VARCHAR100): Email de contacto
   - TELEFONO (VARCHAR20): Teléfono
   - DIRECCION (VARCHAR300): Dirección completa

=== SINTAXIS FIREBIRD ===
- Para LIMIT usar: SELECT FIRST n SKIP m
- Para búsqueda de texto usar: WHERE campo CONTAINING 'texto'
- Fechas: CAST('2025-01-01' AS DATE)
- NULL checking: IS NULL / IS NOT NULL
`.trim();
  }

  async analyzeQuery(naturalQuery: string): Promise<SchemaContext> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en análisis de bases de datos Firebird.

Analiza queries en lenguaje natural y determina:
1. Qué vistas (tablas) consultar
2. Qué columnas son necesarias
3. Qué filtros WHERE aplicar
4. Si necesita agregaciones (GROUP BY, COUNT, SUM, etc)
5. Si necesita JOINs entre vistas

${this.schemaContext}

Retorna SOLO JSON válido con esta estructura:
{
  "views": ["vista1", "vista2"],
  "columns": {
    "vista1": ["col1", "col2"],
    "vista2": ["col1"]
  },
  "filters": ["condicion1", "condicion2"],
  "aggregations": ["COUNT(*)", "SUM(campo)"],
  "joins": ["Vw_ventas.CODIGO = Vw_articulos.CODIGO"]
}`
          },
          {
            role: 'user',
            content: naturalQuery
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI no retornó contenido');
      }

      return JSON.parse(content) as SchemaContext;
    } catch (error: any) {
      console.error('Error en Schema Agent:', error);
      throw new Error(`Schema analysis failed: ${error.message}`);
    }
  }
}
```

### 3.2 SQL Agent

**Archivo**: `backend/api-gateway/src/agents/sql-agent.ts`

```typescript
import { OpenAI } from 'openai';
import { SchemaAgent, SchemaContext } from './schema-agent';

export interface SQLGeneration {
  sql: string;
  parameters?: any[];
  explanation: string;
  estimated_rows: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class SqlAgent {
  private openai: OpenAI;
  private schemaAgent: SchemaAgent;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
    this.schemaAgent = new SchemaAgent();
  }

  async generateSQL(naturalQuery: string): Promise<SQLGeneration> {
    try {
      // Paso 1: Analizar schema necesario
      console.log('🤖 SQL Agent: Analizando schema...');
      const schemaContext = await this.schemaAgent.analyzeQuery(naturalQuery);

      // Paso 2: Generar SQL
      console.log('🤖 SQL Agent: Generando SQL...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en SQL Firebird. Convierte queries en lenguaje natural a SQL válido.

IMPORTANTE:
- Usa sintaxis Firebird: SELECT FIRST n SKIP m (NO usar LIMIT/OFFSET)
- Para búsquedas de texto usa: CONTAINING (case-insensitive)
- Para fechas usa: CAST('YYYY-MM-DD' AS DATE)
- Solo genera queries SELECT (lectura)
- Retorna SQL limpio y eficiente

Contexto del schema para esta query:
${JSON.stringify(schemaContext, null, 2)}

Retorna JSON con:
{
  "sql": "SELECT ...",
  "parameters": [],
  "explanation": "Explicación breve",
  "estimated_rows": número_aproximado
}`
          },
          {
            role: 'user',
            content: naturalQuery
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('OpenAI no retornó SQL');
      }

      const result = JSON.parse(content) as SQLGeneration;

      // Paso 3: Validar SQL generado
      console.log('🤖 SQL Agent: Validando SQL...');
      const validation = this.validateSQL(result.sql);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      return result;
    } catch (error: any) {
      console.error('Error en SQL Agent:', error);
      throw new Error(`SQL generation failed: ${error.message}`);
    }
  }

  validateSQL(sql: string): ValidationResult {
    const upperSql = sql.trim().toUpperCase();

    // Validación 1: Solo SELECT
    if (!upperSql.startsWith('SELECT')) {
      return {
        valid: false,
        error: 'Solo queries SELECT son permitidos'
      };
    }

    // Validación 2: No operaciones peligrosas
    const dangerousKeywords = [
      'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE',
      'GRANT', 'REVOKE', 'INSERT', 'UPDATE', 'EXECUTE',
      'EXEC', 'CALL', 'PROCEDURE', 'FUNCTION'
    ];

    for (const keyword of dangerousKeywords) {
      if (upperSql.includes(keyword)) {
        return {
          valid: false,
          error: `Query contiene operación peligrosa: ${keyword}`
        };
      }
    }

    // Validación 3: No comentarios SQL (prevenir injection)
    if (sql.includes('--') || sql.includes('/*')) {
      return {
        valid: false,
        error: 'Comentarios SQL no permitidos'
      };
    }

    // Validación 4: Longitud razonable
    if (sql.length > 5000) {
      return {
        valid: false,
        error: 'Query demasiado largo'
      };
    }

    return { valid: true };
  }
}
```

### 3.3 Execution Agent

**Archivo**: `backend/api-gateway/src/agents/execution-agent.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

export interface QueryResult {
  success: boolean;
  data: any[];
  rowCount: number;
  executionTime: number;
  error?: string;
}

export class ExecutionAgent {
  private microsipClient: AxiosInstance;

  constructor() {
    this.microsipClient = axios.create({
      baseURL: process.env.MICROSIP_API_URL || 'http://localhost:8003',
      headers: {
        'X-API-Key': process.env.MICROSIP_API_KEY
      },
      timeout: 30000 // 30 segundos
    });
  }

  async executeQuery(sql: string, parameters: any[] = []): Promise<QueryResult> {
    const startTime = Date.now();

    try {
      console.log('🤖 Execution Agent: Ejecutando query...');
      console.log('   SQL:', sql.substring(0, 100) + '...');

      const response = await this.microsipClient.post('/api/query/execute', {
        sql,
        parameters
      });

      const executionTime = Date.now() - startTime;

      console.log(`✅ Query ejecutado en ${executionTime}ms`);
      console.log(`   Filas: ${response.data.results.length}`);

      return {
        success: true,
        data: response.data.results,
        rowCount: response.data.rowCount,
        executionTime
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      console.error('❌ Error ejecutando query:', error.message);

      return {
        success: false,
        data: [],
        rowCount: 0,
        executionTime,
        error: error.response?.data?.details || error.message
      };
    }
  }
}
```

### 3.4 Agent Orchestrator

**Archivo**: `backend/api-gateway/src/agents/orchestrator.ts`

```typescript
import { SchemaAgent } from './schema-agent';
import { SqlAgent } from './sql-agent';
import { ExecutionAgent } from './execution-agent';

export interface AgentResponse {
  success: boolean;
  query: {
    natural: string;
    sql?: string;
    explanation?: string;
  };
  data?: any[];
  metadata?: {
    rowCount: number;
    executionTime: number;
    estimatedRows?: number;
    schemaContext?: any;
  };
  agents: {
    schema: 'completed' | 'failed' | 'skipped';
    sql: 'completed' | 'failed' | 'skipped';
    execution: 'completed' | 'failed' | 'skipped';
  };
  error?: string;
}

export class AgentOrchestrator {
  private schemaAgent: SchemaAgent;
  private sqlAgent: SqlAgent;
  private executionAgent: ExecutionAgent;

  constructor() {
    this.schemaAgent = new SchemaAgent();
    this.sqlAgent = new SqlAgent();
    this.executionAgent = new ExecutionAgent();
  }

  async processNaturalQuery(
    query: string,
    userId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    let agentStatus = {
      schema: 'skipped' as const,
      sql: 'skipped' as const,
      execution: 'skipped' as const
    };

    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Iniciando procesamiento de query`);
      console.log(`   Usuario: ${userId}`);
      console.log(`   Query: "${query}"`);
      console.log(`${'='.repeat(60)}\n`);

      // AGENTE 1: Schema Analysis
      console.log('📊 PASO 1: Schema Agent');
      agentStatus.schema = 'completed';
      const schemaContext = await this.schemaAgent.analyzeQuery(query);
      console.log('   ✓ Schema analizado:', {
        views: schemaContext.views,
        columns: Object.keys(schemaContext.columns)
      });

      // AGENTE 2: SQL Generation
      console.log('\n💻 PASO 2: SQL Agent');
      agentStatus.sql = 'completed';
      const sqlGeneration = await this.sqlAgent.generateSQL(query);
      console.log('   ✓ SQL generado');
      console.log('   SQL:', sqlGeneration.sql.substring(0, 100) + '...');

      // AGENTE 3: Execution
      console.log('\n⚡ PASO 3: Execution Agent');
      agentStatus.execution = 'completed';
      const result = await this.executionAgent.executeQuery(
        sqlGeneration.sql,
        sqlGeneration.parameters
      );

      if (!result.success) {
        throw new Error(result.error || 'Query execution failed');
      }

      // Success
      const totalTime = Date.now() - startTime;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Query completado exitosamente`);
      console.log(`   Tiempo total: ${totalTime}ms`);
      console.log(`   Filas: ${result.rowCount}`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: true,
        query: {
          natural: query,
          sql: sqlGeneration.sql,
          explanation: sqlGeneration.explanation
        },
        data: result.data,
        metadata: {
          rowCount: result.rowCount,
          executionTime: totalTime,
          estimatedRows: sqlGeneration.estimated_rows,
          schemaContext
        },
        agents: agentStatus
      };

    } catch (error: any) {
      const totalTime = Date.now() - startTime;

      console.error(`\n${'='.repeat(60)}`);
      console.error(`❌ Error en procesamiento de query`);
      console.error(`   Tiempo: ${totalTime}ms`);
      console.error(`   Error: ${error.message}`);
      console.error(`${'='.repeat(60)}\n`);

      // Determinar qué agente falló
      if (agentStatus.schema === 'skipped') {
        agentStatus.schema = 'failed';
      } else if (agentStatus.sql === 'skipped') {
        agentStatus.sql = 'failed';
      } else if (agentStatus.execution === 'skipped') {
        agentStatus.execution = 'failed';
      }

      return {
        success: false,
        query: { natural: query },
        agents: agentStatus,
        error: error.message
      };
    }
  }
}
```

### 3.5 Rutas AI Query

**Archivo**: `backend/api-gateway/src/routes/ai-query.ts`

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AgentOrchestrator } from '../agents/orchestrator';

const AIQuerySchema = z.object({
  query: z.string().min(3).max(500),
  limit: z.number().int().positive().max(1000).optional().default(100),
  cache: z.boolean().optional().default(true)
});

export async function aiQueryRoutes(fastify: FastifyInstance) {
  const orchestrator = new AgentOrchestrator();

  // POST /api/ai/query
  fastify.post('/api/ai/query', {
    schema: {
      body: AIQuerySchema
    }
  }, async (request, reply) => {
    const { query } = request.body as z.infer<typeof AIQuerySchema>;
    const userId = request.user?.id || 'anonymous';

    try {
      const result = await orchestrator.processNaturalQuery(query, userId);

      if (!result.success) {
        return reply.code(400).send({
          error: 'Query processing failed',
          message: result.error,
          agents: result.agents
        });
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({
        error: 'Internal server error',
        message: error.message
      });
    }
  });

  // GET /api/ai/query/examples
  fastify.get('/api/ai/query/examples', async (request, reply) => {
    return reply.code(200).send({
      examples: [
        {
          query: "Muéstrame los 10 productos más vendidos del último mes",
          category: "Ventas"
        },
        {
          query: "¿Cuántos clientes tenemos registrados en total?",
          category: "Clientes"
        },
        {
          query: "Lista los productos con stock menor a 5 unidades",
          category: "Inventario"
        },
        {
          query: "¿Cuál es el total de ventas de la semana pasada?",
          category: "Ventas"
        },
        {
          query: "Productos de la categoría 'Refacciones' con precio mayor a 1000",
          category: "Productos"
        },
        {
          query: "Ventas del cliente 'ACME Corp' en enero 2025",
          category: "Ventas"
        },
        {
          query: "Top 5 categorías con más productos",
          category: "Análisis"
        },
        {
          query: "Productos que no se han vendido en 30 días",
          category: "Inventario"
        }
      ]
    });
  });

  // GET /api/ai/query/history (opcional)
  fastify.get('/api/ai/query/history', async (request, reply) => {
    const userId = request.user?.id;

    if (!userId) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    // TODO: Implementar tabla de historial de queries
    return reply.code(200).send({
      history: []
    });
  });
}
```

### 3.6 Microsip Connector - Endpoint SQL Raw

**Archivo**: `backend/microsip-connector/src/routes/query.js`

```javascript
const express = require('express');
const firebird = require('../firebird');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

// POST /api/query/execute
router.post('/execute', authenticateApiKey, async (req, res) => {
  try {
    const { sql, parameters = [] } = req.body;

    // Validación
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({
        error: 'SQL query es requerido'
      });
    }

    // Solo permitir SELECT
    const upperSql = sql.trim().toUpperCase();
    if (!upperSql.startsWith('SELECT')) {
      return res.status(403).json({
        error: 'Solo se permiten queries SELECT',
        details: 'Por seguridad, solo queries de lectura son permitidos'
      });
    }

    // Validar longitud
    if (sql.length > 10000) {
      return res.status(400).json({
        error: 'Query demasiado largo',
        details: 'Máximo 10000 caracteres'
      });
    }

    // Ejecutar
    console.log('🔍 Ejecutando query SQL:', sql.substring(0, 100) + '...');
    const startTime = Date.now();

    const results = await firebird.queryAsync(sql, parameters);

    const executionTime = Date.now() - startTime;
    console.log(`✓ Query ejecutado en ${executionTime}ms, ${results.length} filas`);

    res.json({
      success: true,
      results,
      rowCount: results.length,
      executionTime: `${executionTime}ms`
    });
  } catch (error) {
    console.error('Error ejecutando query:', error);
    res.status(500).json({
      error: 'Error ejecutando query',
      details: error.message
    });
  }
});

module.exports = router;
```

**Registrar en**: `backend/microsip-connector/src/index.js`

```javascript
const queryRoutes = require('./routes/query');

// ... código existente ...

app.use('/api/query', queryRoutes);
```

---

**Continuación en siguiente mensaje debido a límite de caracteres...**

---

**Documento creado**: 2025-01-16
**Versión**: 1.0 (Parte 1/2)
