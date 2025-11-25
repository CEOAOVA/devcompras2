-- ============================================================================
-- EMBLER GenAI PLATFORM - STORAGE CONFIGURATION
-- Migration: 002_setup_storage.sql
-- Description: Configures Supabase Storage buckets and policies
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Bucket para archivos CSV subidos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'csv-uploads',
  'csv-uploads',
  false,
  104857600, -- 100MB
  ARRAY['text/csv', 'application/vnd.ms-excel']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket para archivos Excel
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'excel-files',
  'excel-files',
  false,
  104857600, -- 100MB
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket para reportes PDF generados
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-reports',
  'pdf-reports',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket para modelos ML entrenados
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ml-models',
  'ml-models',
  false,
  524288000, -- 500MB
  ARRAY['application/octet-stream']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket para exportaciones de usuarios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-exports',
  'user-exports',
  false,
  104857600, -- 100MB
  ARRAY['text/csv', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- STORAGE POLICIES: csv-uploads
-- ============================================================================

-- Policy: Usuarios pueden subir sus propios archivos CSV
DROP POLICY IF EXISTS "Users can upload their own CSV files" ON storage.objects;
CREATE POLICY "Users can upload their own CSV files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'csv-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Usuarios pueden leer sus propios archivos CSV
DROP POLICY IF EXISTS "Users can read their own CSV files" ON storage.objects;
CREATE POLICY "Users can read their own CSV files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'csv-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Usuarios pueden actualizar sus propios archivos CSV
DROP POLICY IF EXISTS "Users can update their own CSV files" ON storage.objects;
CREATE POLICY "Users can update their own CSV files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'csv-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Usuarios pueden eliminar sus propios archivos CSV
DROP POLICY IF EXISTS "Users can delete their own CSV files" ON storage.objects;
CREATE POLICY "Users can delete their own CSV files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'csv-uploads'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES: excel-files
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload their own Excel files" ON storage.objects;
CREATE POLICY "Users can upload their own Excel files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'excel-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can read their own Excel files" ON storage.objects;
CREATE POLICY "Users can read their own Excel files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'excel-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update their own Excel files" ON storage.objects;
CREATE POLICY "Users can update their own Excel files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'excel-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own Excel files" ON storage.objects;
CREATE POLICY "Users can delete their own Excel files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'excel-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES: pdf-reports
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload their own PDF reports" ON storage.objects;
CREATE POLICY "Users can upload their own PDF reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdf-reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can read their own PDF reports" ON storage.objects;
CREATE POLICY "Users can read their own PDF reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdf-reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own PDF reports" ON storage.objects;
CREATE POLICY "Users can delete their own PDF reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdf-reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES: ml-models
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload their own ML models" ON storage.objects;
CREATE POLICY "Users can upload their own ML models"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ml-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can read their own ML models" ON storage.objects;
CREATE POLICY "Users can read their own ML models"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ml-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own ML models" ON storage.objects;
CREATE POLICY "Users can delete their own ML models"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ml-models'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- STORAGE POLICIES: user-exports
-- ============================================================================

DROP POLICY IF EXISTS "Users can upload their own exports" ON storage.objects;
CREATE POLICY "Users can upload their own exports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-exports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can read their own exports" ON storage.objects;
CREATE POLICY "Users can read their own exports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-exports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own exports" ON storage.objects;
CREATE POLICY "Users can delete their own exports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-exports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Habilitar Realtime para chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END
$$;

-- Habilitar Realtime para insights
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'insights'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.insights;
  END IF;
END
$$;

-- Habilitar Realtime para datasets (para updates de status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'datasets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.datasets;
  END IF;
END
$$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

COMMENT ON SCHEMA storage IS 'Supabase Storage schema for file management';

-- Verificación
SELECT
  'Storage configuration completed successfully' AS status,
  COUNT(*) AS bucket_count
FROM storage.buckets
WHERE id IN ('csv-uploads', 'excel-files', 'pdf-reports', 'ml-models', 'user-exports');
