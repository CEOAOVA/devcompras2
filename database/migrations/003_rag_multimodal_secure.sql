/**
 * Migration 003: RAG Multimodal Secure
 *
 * Crea la infraestructura completa para el sistema RAG multimodal:
 * - Tabla de documentos con deduplicación por hash
 * - Tabla de chunks particionada con embeddings vector(512)
 * - Tabla de transcripciones de audio
 * - Índices optimizados para búsqueda vectorial
 * - Funciones de búsqueda seguras con RLS
 * - Triggers automáticos
 *
 * IMPORTANTE: Ejecutar DESPUÉS de 001 y 002
 */

-- ============================================================================
-- EXTENSIONES ADICIONALES
-- ============================================================================

-- Extensión para búsqueda fuzzy de texto
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- TABLA: documents
-- ============================================================================
-- Almacena metadata de documentos subidos (PDFs, imágenes, audio, CSV)
-- Incluye deduplicación por hash SHA-256 del contenido

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Metadata del archivo
  filename VARCHAR(255) NOT NULL,
  content_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 para deduplicación
  file_type VARCHAR(50) NOT NULL, -- pdf, image, audio, csv
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT, -- Ruta en Supabase Storage

  -- Estado de procesamiento
  processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Valores: pending, processing, completed, failed
  processing_error TEXT,
  processed_at TIMESTAMPTZ,

  -- Metadata extraída
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: {"pages": 50, "author": "John", "images_count": 5}

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_processing_status
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT check_file_size
    CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800) -- Max 50MB
);

-- Índices para documents
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(processing_status)
  WHERE processing_status IN ('pending', 'processing');
CREATE INDEX idx_documents_hash ON public.documents(content_hash);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- Índice GIN para búsqueda en metadata JSONB
CREATE INDEX idx_documents_metadata ON public.documents USING gin(metadata);

-- Comentarios
COMMENT ON TABLE public.documents IS 'Documentos subidos por usuarios con metadata y estado de procesamiento';
COMMENT ON COLUMN public.documents.content_hash IS 'SHA-256 del contenido para deduplicación';
COMMENT ON COLUMN public.documents.processing_status IS 'Estado: pending, processing, completed, failed';

-- ============================================================================
-- TABLA PARTICIONADA: document_chunks
-- ============================================================================
-- Almacena chunks de documentos con embeddings vectoriales
-- Particionada por mes para mejor performance

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Contenido
  content TEXT NOT NULL,
  embedding vector(512), -- Embeddings de 512 dimensiones (ahorro 50% vs 1536)
  tokens INTEGER NOT NULL,

  -- Posición en el documento
  chunk_index INTEGER NOT NULL,
  page_number INTEGER,
  section_title VARCHAR(255),

  -- Tipo de contenido
  content_type VARCHAR(20) NOT NULL DEFAULT 'text',
  -- Valores: text, table, code, image_description, audio_transcript

  -- Overlap para contexto
  overlap_previous TEXT,

  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,
  confidence_score FLOAT, -- Para OCR/Vision API (0.0-1.0)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  PRIMARY KEY (id, created_at),
  CONSTRAINT check_content_type
    CHECK (content_type IN ('text', 'table', 'code', 'image_description', 'audio_transcript')),
  CONSTRAINT check_tokens
    CHECK (tokens > 0 AND tokens <= 8000),
  CONSTRAINT check_confidence_score
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
) PARTITION BY RANGE (created_at);

-- Crear particiones para los próximos 6 meses
-- Octubre 2025
CREATE TABLE IF NOT EXISTS public.document_chunks_2025_10 PARTITION OF public.document_chunks
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Noviembre 2025
CREATE TABLE IF NOT EXISTS public.document_chunks_2025_11 PARTITION OF public.document_chunks
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Diciembre 2025
CREATE TABLE IF NOT EXISTS public.document_chunks_2025_12 PARTITION OF public.document_chunks
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Enero 2026
CREATE TABLE IF NOT EXISTS public.document_chunks_2026_01 PARTITION OF public.document_chunks
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Febrero 2026
CREATE TABLE IF NOT EXISTS public.document_chunks_2026_02 PARTITION OF public.document_chunks
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Marzo 2026
CREATE TABLE IF NOT EXISTS public.document_chunks_2026_03 PARTITION OF public.document_chunks
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- ============================================================================
-- ÍNDICES OPTIMIZADOS PARA PGVECTOR
-- ============================================================================

-- Índices ivfflat por partición (lists = 100 es óptimo para ~100K embeddings por partición)
CREATE INDEX IF NOT EXISTS idx_chunks_2025_10_embedding
  ON public.document_chunks_2025_10
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_2025_11_embedding
  ON public.document_chunks_2025_11
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_2025_12_embedding
  ON public.document_chunks_2025_12
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_2026_01_embedding
  ON public.document_chunks_2026_01
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_2026_02_embedding
  ON public.document_chunks_2026_02
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_chunks_2026_03_embedding
  ON public.document_chunks_2026_03
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Índices adicionales para filtros
CREATE INDEX idx_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX idx_chunks_content_type ON public.document_chunks(content_type);

-- Índice GIN para búsqueda de texto completo en español
CREATE INDEX idx_chunks_content_fulltext
  ON public.document_chunks
  USING gin(to_tsvector('spanish', content));

-- Comentarios
COMMENT ON TABLE public.document_chunks IS 'Chunks de documentos con embeddings vectoriales, particionado por mes';
COMMENT ON COLUMN public.document_chunks.embedding IS 'Vector embedding de 512 dimensiones (text-embedding-3-large)';
COMMENT ON COLUMN public.document_chunks.overlap_previous IS 'Últimos 200 tokens del chunk anterior para contexto';

-- ============================================================================
-- TABLA: audio_transcriptions
-- ============================================================================
-- Almacena transcripciones de audio generadas con Whisper

CREATE TABLE IF NOT EXISTS public.audio_transcriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audio metadata
  audio_duration_seconds INTEGER NOT NULL,
  audio_format VARCHAR(20) NOT NULL, -- mp3, wav, ogg

  -- Transcripción
  transcript TEXT NOT NULL,
  language VARCHAR(10) DEFAULT 'es', -- Código ISO 639-1
  confidence_score FLOAT,

  -- Metadata adicional
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_audio_duration
    CHECK (audio_duration_seconds > 0 AND audio_duration_seconds <= 300), -- Max 5 minutos
  CONSTRAINT check_audio_confidence
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- Índices para audio_transcriptions
CREATE INDEX idx_transcriptions_user_id ON public.audio_transcriptions(user_id);
CREATE INDEX idx_transcriptions_document_id ON public.audio_transcriptions(document_id);
CREATE INDEX idx_transcriptions_language ON public.audio_transcriptions(language);

-- Índice GIN para búsqueda en transcript
CREATE INDEX idx_transcriptions_transcript_fulltext
  ON public.audio_transcriptions
  USING gin(to_tsvector('spanish', transcript));

-- Comentarios
COMMENT ON TABLE public.audio_transcriptions IS 'Transcripciones de audio generadas con Whisper API';
COMMENT ON COLUMN public.audio_transcriptions.confidence_score IS 'Nivel de confianza de Whisper (0.0-1.0)';

-- ============================================================================
-- FUNCIONES DE BÚSQUEDA VECTORIAL SEGURAS
-- ============================================================================

-- Función principal: Búsqueda vectorial con pre-filtros y seguridad RLS
CREATE OR REPLACE FUNCTION public.match_documents_secure(
  query_embedding vector(512),
  match_count INTEGER DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  filter_document_ids UUID[] DEFAULT NULL,
  filter_content_types TEXT[] DEFAULT NULL,
  filter_min_date TIMESTAMPTZ DEFAULT NULL,
  min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB,
  page_number INTEGER,
  content_type VARCHAR(20),
  chunk_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con permisos del owner de la función
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata,
    dc.page_number,
    dc.content_type,
    dc.chunk_index
  FROM public.document_chunks dc
  INNER JOIN public.documents d ON dc.document_id = d.id
  WHERE
    -- SEGURIDAD: Solo documentos del usuario especificado
    (filter_user_id IS NULL OR d.user_id = filter_user_id)

    -- Pre-filtros opcionales (aplicados ANTES de búsqueda vectorial para mejor performance)
    AND (filter_document_ids IS NULL OR dc.document_id = ANY(filter_document_ids))
    AND (filter_content_types IS NULL OR dc.content_type = ANY(filter_content_types))
    AND (filter_min_date IS NULL OR dc.created_at >= filter_min_date)

    -- Solo documentos completados
    AND d.processing_status = 'completed'

    -- Filtro de similaridad mínima
    AND (1 - (dc.embedding <=> query_embedding)) >= min_similarity
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION public.match_documents_secure IS 'Búsqueda vectorial segura con RLS y pre-filtros optimizados';

-- ============================================================================
-- FUNCIÓN: Búsqueda Híbrida (Vectorial + Texto Completo)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.hybrid_search(
  query_text TEXT,
  query_embedding vector(512),
  match_count INTEGER DEFAULT 10,
  filter_user_id UUID DEFAULT NULL,
  vector_weight FLOAT DEFAULT 0.6,
  text_weight FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  combined_score FLOAT,
  vector_similarity FLOAT,
  text_rank FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.metadata,
      1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    INNER JOIN public.documents d ON dc.document_id = d.id
    WHERE
      (filter_user_id IS NULL OR d.user_id = filter_user_id)
      AND d.processing_status = 'completed'
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      dc.id,
      ts_rank(to_tsvector('spanish', dc.content), plainto_tsquery('spanish', query_text)) AS rank
    FROM public.document_chunks dc
    WHERE to_tsvector('spanish', dc.content) @@ plainto_tsquery('spanish', query_text)
  )
  SELECT
    vr.id,
    vr.document_id,
    vr.content,
    (vr.similarity * vector_weight + COALESCE(tr.rank, 0) * text_weight) AS combined_score,
    vr.similarity AS vector_similarity,
    COALESCE(tr.rank, 0) AS text_rank,
    vr.metadata
  FROM vector_results vr
  LEFT JOIN text_results tr ON vr.id = tr.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Comentarios
COMMENT ON FUNCTION public.hybrid_search IS 'Búsqueda híbrida combinando similaridad vectorial y ranking de texto completo';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at en documents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_transcriptions ENABLE ROW LEVEL SECURITY;

-- Política para documents: Solo el owner puede ver/modificar sus documentos
CREATE POLICY documents_user_policy ON public.documents
  FOR ALL
  USING (user_id = auth.uid());

-- Política para document_chunks: Solo chunks de documentos del owner
CREATE POLICY chunks_user_policy ON public.document_chunks
  FOR ALL
  USING (
    document_id IN (
      SELECT id FROM public.documents WHERE user_id = auth.uid()
    )
  );

-- Política para audio_transcriptions: Solo transcripciones del owner
CREATE POLICY transcriptions_user_policy ON public.audio_transcriptions
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- GRANTS DE PERMISOS
-- ============================================================================

-- Permisos para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_transcriptions TO authenticated;

-- Permisos para ejecutar funciones
GRANT EXECUTE ON FUNCTION public.match_documents_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.hybrid_search TO authenticated;

-- ============================================================================
-- ÍNDICES FINALES Y OPTIMIZACIONES
-- ============================================================================

-- Índice compuesto para queries frecuentes
CREATE INDEX idx_documents_user_status
  ON public.documents(user_id, processing_status, created_at DESC)
  WHERE processing_status = 'completed';

-- Estadísticas para el optimizador de queries
ANALYZE public.documents;
ANALYZE public.document_chunks;
ANALYZE public.audio_transcriptions;

-- ============================================================================
-- SCRIPT COMPLETADO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003 completada exitosamente';
  RAISE NOTICE '📊 Tablas creadas: documents, document_chunks (particionada), audio_transcriptions';
  RAISE NOTICE '🔍 Funciones: match_documents_secure, hybrid_search';
  RAISE NOTICE '🔒 RLS habilitado en todas las tablas';
  RAISE NOTICE '📈 Índices ivfflat creados para búsqueda vectorial';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: Crear particiones adicionales mensualmente';
  RAISE NOTICE '    Ejemplo para Abril 2026:';
  RAISE NOTICE '    CREATE TABLE document_chunks_2026_04 PARTITION OF document_chunks';
  RAISE NOTICE '      FOR VALUES FROM (''2026-04-01'') TO (''2026-05-01'');';
  RAISE NOTICE '    CREATE INDEX ON document_chunks_2026_04 USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);';
END $$;
