-- ============================================================================
-- EMBLER GenAI PLATFORM - DATABASE SCHEMA
-- Migration: 001_create_genai_tables.sql
-- Description: Creates all tables needed for GenAI analytics platform
-- ============================================================================

-- ============================================================================
-- EXTENSIONES NECESARIAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- TABLA: profiles (Perfiles de usuario mejorados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'analyst', 'user')),
  name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- RLS Policies para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- TABLA: datasets (Almacena metadatos de datasets subidos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'excel', 'json', 'parquet')),
  file_size_bytes BIGINT,
  storage_path TEXT NOT NULL,
  row_count INTEGER,
  column_count INTEGER,
  columns_metadata JSONB,
  sample_data JSONB,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_datasets_user_id ON public.datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON public.datasets(processing_status);
CREATE INDEX IF NOT EXISTS idx_datasets_tags ON public.datasets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_datasets_created_at ON public.datasets(created_at DESC);

-- RLS Policies
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own datasets" ON public.datasets;
CREATE POLICY "Users can view their own datasets" ON public.datasets
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can insert their own datasets" ON public.datasets;
CREATE POLICY "Users can insert their own datasets" ON public.datasets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own datasets" ON public.datasets;
CREATE POLICY "Users can update their own datasets" ON public.datasets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own datasets" ON public.datasets;
CREATE POLICY "Users can delete their own datasets" ON public.datasets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TABLA: insights (Insights generados por GenAI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('summary', 'anomaly', 'prediction', 'recommendation', 'pattern', 'correlation')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  data_reference JSONB,
  visualization_config JSONB,
  ai_model_used TEXT,
  is_actionable BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_insights_dataset_id ON public.insights(dataset_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_priority ON public.insights(priority);
CREATE INDEX IF NOT EXISTS idx_insights_status ON public.insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);

-- RLS Policies
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view insights for their datasets" ON public.insights;
CREATE POLICY "Users can view insights for their datasets" ON public.insights
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.datasets d WHERE d.id = dataset_id AND d.is_public = true)
  );

DROP POLICY IF EXISTS "System can insert insights" ON public.insights;
CREATE POLICY "System can insert insights" ON public.insights
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- TABLA: chat_conversations (Conversaciones con GenAI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  context_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_dataset_id ON public.chat_conversations(dataset_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_at ON public.chat_conversations(created_at DESC);

-- RLS Policies
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.chat_conversations;
CREATE POLICY "Users can manage their own conversations" ON public.chat_conversations
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TABLA: chat_messages (Mensajes individuales del chat)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  model_used TEXT,
  tool_calls JSONB,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON public.chat_messages(role);

-- RLS Policies
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages from their conversations" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.chat_messages;
CREATE POLICY "Users can insert messages to their conversations" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TABLA: data_embeddings (Vectores para RAG con pgvector)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.data_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('row', 'column', 'summary', 'insight')),
  content_text TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_embeddings_dataset_id ON public.data_embeddings(dataset_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.data_embeddings USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_embeddings_content_type ON public.data_embeddings(content_type);

-- RLS Policies
ALTER TABLE public.data_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view embeddings for their datasets" ON public.data_embeddings;
CREATE POLICY "Users can view embeddings for their datasets" ON public.data_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.datasets d
      WHERE d.id = dataset_id AND (d.user_id = auth.uid() OR d.is_public = true)
    )
  );

-- ============================================================================
-- TABLA: analysis_cache (Caché de análisis pesados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.analysis_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  result JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_analysis_cache_key ON public.analysis_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_dataset_id ON public.analysis_cache(dataset_id);
CREATE INDEX IF NOT EXISTS idx_analysis_cache_expires_at ON public.analysis_cache(expires_at);

-- Limpiar caché expirado automáticamente (requiere pg_cron)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'clean-expired-cache',
      '0 * * * *',
      $$DELETE FROM public.analysis_cache WHERE expires_at < NOW()$$
    );
  END IF;
END
$$;

-- ============================================================================
-- TABLA: ml_models (Modelos ML entrenados)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL,
  model_name TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  storage_path TEXT NOT NULL,
  metrics JSONB NOT NULL,
  hyperparameters JSONB,
  feature_importance JSONB,
  training_duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ml_models_dataset_id ON public.ml_models(dataset_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_user_id ON public.ml_models(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_models_is_active ON public.ml_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ml_models_created_at ON public.ml_models(created_at DESC);

-- RLS Policies
ALTER TABLE public.ml_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own models" ON public.ml_models;
CREATE POLICY "Users can view their own models" ON public.ml_models
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own models" ON public.ml_models;
CREATE POLICY "Users can insert their own models" ON public.ml_models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- TABLA: api_usage (Tracking de uso de API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_usd NUMERIC(10, 6) DEFAULT 0,
  duration_ms INTEGER,
  status_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON public.api_usage(endpoint);

-- ============================================================================
-- FUNCIONES ÚTILES
-- ============================================================================

-- Función para buscar embeddings similares (RAG)
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10,
  target_dataset_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content_text text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.content_text,
    1 - (de.embedding <=> query_embedding) AS similarity,
    de.metadata
  FROM public.data_embeddings de
  WHERE
    (target_dataset_id IS NULL OR de.dataset_id = target_dataset_id)
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a tablas con updated_at
DROP TRIGGER IF EXISTS set_timestamp_profiles ON public.profiles;
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_datasets ON public.datasets;
CREATE TRIGGER set_timestamp_datasets
BEFORE UPDATE ON public.datasets
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_insights ON public.insights;
CREATE TRIGGER set_timestamp_insights
BEFORE UPDATE ON public.insights
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_conversations ON public.chat_conversations;
CREATE TRIGGER set_timestamp_conversations
BEFORE UPDATE ON public.chat_conversations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

COMMENT ON TABLE public.datasets IS 'Metadatos de datasets subidos por usuarios';
COMMENT ON TABLE public.insights IS 'Insights generados automáticamente por GenAI';
COMMENT ON TABLE public.chat_conversations IS 'Conversaciones de chat con IA sobre datos';
COMMENT ON TABLE public.chat_messages IS 'Mensajes individuales de conversaciones';
COMMENT ON TABLE public.data_embeddings IS 'Embeddings de vectores para RAG (Retrieval Augmented Generation)';
COMMENT ON TABLE public.analysis_cache IS 'Caché de análisis pesados para optimizar performance';
COMMENT ON TABLE public.ml_models IS 'Modelos de Machine Learning entrenados';
COMMENT ON TABLE public.api_usage IS 'Tracking de uso de API y costos';

-- Verificación
SELECT
  'Migration completed successfully' AS status,
  COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'datasets', 'insights', 'chat_conversations', 'chat_messages', 'data_embeddings', 'analysis_cache', 'ml_models', 'api_usage');
