# Database Migrations - Embler GenAI Platform

## Descripción

Este directorio contiene las migraciones SQL necesarias para configurar la base de datos de Supabase PostgreSQL para la plataforma Embler GenAI Analytics.

## Estructura

```
database/
├── migrations/
│   ├── 001_create_genai_tables.sql    # Crea todas las tablas y configuraciones
│   ├── 002_setup_storage.sql           # Configura Supabase Storage y Realtime
│   └── ...                             # Futuras migraciones
└── README.md                           # Este archivo
```

## Pre-requisitos

1. **Proyecto Supabase creado**: Visita [https://supabase.com](https://supabase.com) y crea un nuevo proyecto
2. **Credenciales obtenidas**:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`

## Cómo ejecutar las migraciones

### Opción 1: Desde el Dashboard de Supabase (RECOMENDADO)

1. Abre tu proyecto en [https://app.supabase.com](https://app.supabase.com)
2. Ve a la sección **SQL Editor** en el menú lateral
3. Abre el archivo `001_create_genai_tables.sql`
4. Copia todo el contenido
5. Pégalo en el editor SQL
6. Haz clic en **Run** para ejecutar
7. Repite los pasos 3-6 para `002_setup_storage.sql`

### Opción 2: Usando Supabase CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login a Supabase
supabase login

# Conectar al proyecto remoto
supabase link --project-ref tu-project-ref

# Ejecutar migraciones
supabase db push --file database/migrations/001_create_genai_tables.sql
supabase db push --file database/migrations/002_setup_storage.sql
```

### Opción 3: Usando psql

```bash
# Conectar a Supabase PostgreSQL
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Ejecutar migraciones
\i database/migrations/001_create_genai_tables.sql
\i database/migrations/002_setup_storage.sql
```

## Verificación

Después de ejecutar las migraciones, verifica que todo está correcto:

### Verificar tablas creadas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'profiles',
  'datasets',
  'insights',
  'chat_conversations',
  'chat_messages',
  'data_embeddings',
  'analysis_cache',
  'ml_models',
  'api_usage'
)
ORDER BY table_name;
```

Deberías ver las 9 tablas listadas.

### Verificar Storage Buckets

```sql
SELECT id, name, public
FROM storage.buckets
WHERE id IN (
  'csv-uploads',
  'excel-files',
  'pdf-reports',
  'ml-models',
  'user-exports'
)
ORDER BY id;
```

Deberías ver los 5 buckets creados.

### Verificar extensiones

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgvector', 'pg_cron');
```

Deberías ver las 3 extensiones instaladas.

### Verificar Realtime

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('chat_messages', 'insights', 'datasets');
```

Deberías ver las 3 tablas habilitadas para Realtime.

## Tablas Creadas

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario (extiende auth.users) |
| `datasets` | Metadatos de datasets subidos (CSV, Excel, JSON) |
| `insights` | Insights generados automáticamente por GenAI |
| `chat_conversations` | Conversaciones de chat con IA |
| `chat_messages` | Mensajes individuales de chat |
| `data_embeddings` | Embeddings de vectores para RAG (pgvector) |
| `analysis_cache` | Caché de análisis pesados |
| `ml_models` | Modelos de Machine Learning entrenados |
| `api_usage` | Tracking de uso de API y costos |

## Funciones Útiles

### `match_embeddings()`

Busca embeddings similares usando similitud de coseno (para RAG).

```sql
-- Ejemplo de uso
SELECT *
FROM match_embeddings(
  query_embedding := '[0.1, 0.2, ...]'::vector,
  match_threshold := 0.8,
  match_count := 10,
  target_dataset_id := 'uuid-del-dataset'
);
```

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Los usuarios solo pueden:
- Ver sus propios datos
- Crear registros asociados a su user_id
- Actualizar/eliminar sus propios registros
- Ver datos públicos (cuando is_public = true)

## Realtime

Las siguientes tablas tienen Realtime habilitado:
- `chat_messages` - Para chat en tiempo real
- `insights` - Para notificaciones de nuevos insights
- `datasets` - Para updates de status de procesamiento

## Soporte

Si encuentras problemas:
1. Verifica que las extensiones están instaladas (`uuid-ossp`, `pgvector`, `pg_cron`)
2. Verifica que tu usuario tiene permisos suficientes
3. Revisa los logs de Supabase en el Dashboard
4. Consulta la documentación de Supabase: [https://supabase.com/docs](https://supabase.com/docs)

## Próximos Pasos

Después de ejecutar las migraciones:
1. Actualiza el archivo `.env` con tus credenciales de Supabase
2. Ejecuta `npm install` en el backend
3. Inicia el servidor con `npm run dev`
4. Verifica que la conexión a Supabase funciona correctamente
