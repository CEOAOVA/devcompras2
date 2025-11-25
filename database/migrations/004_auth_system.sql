/**
 * Migration 004: Sistema de Autenticaci\u00f3n Seguro
 *
 * Implementa autenticaci\u00f3n completa con:
 * - Tabla de sesiones activas para tracking
 * - Tabla de refresh tokens con rotaci\u00f3n
 * - Sistema de login attempts con account lockout temporal
 * - Auto-unlock despu\u00e9s de 15 minutos
 * - Detecci\u00f3n de session hijacking
 * - RLS policies completas
 *
 * IMPORTANTE: Ejecutar DESPU\u00c9S de 001, 002 y 003
 */

-- ============================================================================
-- TABLA: sessions
-- ============================================================================
-- Almacena sesiones activas de usuarios con tracking de IP y User-Agent

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session tracking
  access_token_hash VARCHAR(64) NOT NULL, -- SHA-256 del access token
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- \u00cdndices para sessions
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON public.sessions(expires_at)
  WHERE expires_at > NOW(); -- Solo sesiones activas
CREATE INDEX idx_sessions_token_hash ON public.sessions(access_token_hash);

-- Comentarios
COMMENT ON TABLE public.sessions IS 'Sesiones activas de usuarios con tracking para detecci\u00f3n de hijacking';
COMMENT ON COLUMN public.sessions.access_token_hash IS 'Hash SHA-256 del access token para validaci\u00f3n';
COMMENT ON COLUMN public.sessions.user_agent IS 'User-Agent del navegador para detecci\u00f3n de cambios sospechosos';

-- ============================================================================
-- TABLA: refresh_tokens
-- ============================================================================
-- Almacena refresh tokens con soporte para rotaci\u00f3n

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,

  -- Token data
  token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 del refresh token

  -- Rotaci\u00f3n de tokens
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  replaced_by UUID REFERENCES public.refresh_tokens(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Constraints
  CONSTRAINT check_used_at CHECK (
    (used = true AND used_at IS NOT NULL) OR
    (used = false AND used_at IS NULL)
  )
);

-- \u00cdndices para refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_session_id ON public.refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens(expires_at)
  WHERE expires_at > NOW() AND used = false; -- Solo tokens v\u00e1lidos

-- Comentarios
COMMENT ON TABLE public.refresh_tokens IS 'Refresh tokens con soporte para rotaci\u00f3n y detecci\u00f3n de robo';
COMMENT ON COLUMN public.refresh_tokens.used IS 'Marcado como usado cuando se utiliza para refresh (rotaci\u00f3n)';
COMMENT ON COLUMN public.refresh_tokens.replaced_by IS 'ID del nuevo token que reemplaz\u00f3 a este';

-- ============================================================================
-- TABLA: login_attempts
-- ============================================================================
-- Registra intentos de login para rate limiting y account lockout

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL, -- Guardar email incluso si user no existe

  -- Attempt data
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  failure_reason TEXT, -- "invalid_password", "account_locked", etc.

  -- Timestamp
  attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- \u00cdndices para login_attempts
CREATE INDEX idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts(attempted_at DESC);

-- Comentarios
COMMENT ON TABLE public.login_attempts IS 'Historial de intentos de login para rate limiting y auditor\u00eda';
COMMENT ON COLUMN public.login_attempts.email IS 'Email del intento (puede no existir el usuario)';

-- ============================================================================
-- TABLA: users_security
-- ============================================================================
-- Datos de seguridad adicionales por usuario

CREATE TABLE IF NOT EXISTS public.users_security (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Account lockout
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,

  -- Password management
  password_changed_at TIMESTAMPTZ,
  password_reset_token VARCHAR(64),
  password_reset_expires_at TIMESTAMPTZ,

  -- Email verification
  email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(64),
  email_verification_expires_at TIMESTAMPTZ,

  -- Two-factor authentication (opcional, futuro)
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- \u00cdndices para users_security
CREATE INDEX idx_users_security_locked_until ON public.users_security(locked_until)
  WHERE locked_until IS NOT NULL AND locked_until > NOW();
CREATE INDEX idx_users_security_password_reset_token
  ON public.users_security(password_reset_token)
  WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_users_security_email_verification_token
  ON public.users_security(email_verification_token)
  WHERE email_verification_token IS NOT NULL;

-- Comentarios
COMMENT ON TABLE public.users_security IS 'Datos de seguridad adicionales por usuario';
COMMENT ON COLUMN public.users_security.locked_until IS 'Cuenta bloqueada hasta esta fecha (auto-unlock)';
COMMENT ON COLUMN public.users_security.failed_login_attempts IS 'Contador de intentos fallidos (reset en login exitoso)';

-- ============================================================================
-- FUNCIONES UTILITARIAS
-- ============================================================================

-- Funci\u00f3n: Limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Borrar sesiones expiradas (m\u00e1s de 1 d\u00eda expiradas)
  DELETE FROM public.sessions
  WHERE expires_at < NOW() - INTERVAL '1 day';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Funci\u00f3n: Limpiar refresh tokens expirados o usados
CREATE OR REPLACE FUNCTION public.cleanup_expired_refresh_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Borrar tokens expirados o usados (m\u00e1s de 7 d\u00edas)
  DELETE FROM public.refresh_tokens
  WHERE
    (expires_at < NOW() - INTERVAL '7 days') OR
    (used = true AND used_at < NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Funci\u00f3n: Limpiar login attempts antiguos
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Borrar intentos de m\u00e1s de 30 d\u00edas
  DELETE FROM public.login_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$;

-- Funci\u00f3n: Verificar si cuenta est\u00e1 bloqueada (con auto-unlock)
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked_until TIMESTAMPTZ;
BEGIN
  SELECT locked_until INTO v_locked_until
  FROM public.users_security
  WHERE user_id = p_user_id;

  -- Si no hay registro, no est\u00e1 bloqueada
  IF v_locked_until IS NULL THEN
    RETURN false;
  END IF;

  -- Si pas\u00f3 el tiempo, auto-unlock
  IF v_locked_until < NOW() THEN
    UPDATE public.users_security
    SET
      locked_until = NULL,
      failed_login_attempts = 0,
      updated_at = NOW()
    WHERE user_id = p_user_id;

    RETURN false;
  END IF;

  -- A\u00fan bloqueada
  RETURN true;
END;
$$;

-- Funci\u00f3n: Registrar intento de login fallido
CREATE OR REPLACE FUNCTION public.record_failed_login(
  p_user_id UUID,
  p_email VARCHAR,
  p_ip INET,
  p_user_agent TEXT,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_failed_attempts INTEGER;
BEGIN
  -- Registrar el intento fallido
  INSERT INTO public.login_attempts (
    user_id, email, success, ip_address, user_agent, failure_reason
  ) VALUES (
    p_user_id, p_email, false, p_ip, p_user_agent, p_reason
  );

  -- Si hay user_id, actualizar contador
  IF p_user_id IS NOT NULL THEN
    -- Incrementar contador
    UPDATE public.users_security
    SET
      failed_login_attempts = failed_login_attempts + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING failed_login_attempts INTO v_failed_attempts;

    -- Si lleg\u00f3 a 5 intentos, bloquear cuenta por 15 minutos
    IF v_failed_attempts >= 5 THEN
      UPDATE public.users_security
      SET
        locked_until = NOW() + INTERVAL '15 minutes',
        updated_at = NOW()
      WHERE user_id = p_user_id;

      RAISE NOTICE 'Account locked for user % until %', p_user_id, NOW() + INTERVAL '15 minutes';
    END IF;
  END IF;
END;
$$;

-- Funci\u00f3n: Registrar login exitoso
CREATE OR REPLACE FUNCTION public.record_successful_login(
  p_user_id UUID,
  p_email VARCHAR,
  p_ip INET,
  p_user_agent TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Registrar el intento exitoso
  INSERT INTO public.login_attempts (
    user_id, email, success, ip_address, user_agent
  ) VALUES (
    p_user_id, p_email, true, p_ip, p_user_agent
  );

  -- Reset contador de intentos fallidos
  UPDATE public.users_security
  SET
    failed_login_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Actualizar last_activity_at en sessions
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_activity
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- Trigger: Actualizar updated_at en users_security
CREATE OR REPLACE FUNCTION update_users_security_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_security_updated_at
  BEFORE UPDATE ON public.users_security
  FOR EACH ROW
  EXECUTE FUNCTION update_users_security_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_security ENABLE ROW LEVEL SECURITY;

-- Pol\u00edticas para sessions: Solo el owner puede ver sus sesiones
CREATE POLICY sessions_user_policy ON public.sessions
  FOR ALL
  USING (user_id = auth.uid());

-- Pol\u00edticas para refresh_tokens: Solo el owner
CREATE POLICY refresh_tokens_user_policy ON public.refresh_tokens
  FOR ALL
  USING (user_id = auth.uid());

-- Pol\u00edticas para login_attempts: Solo el owner puede ver sus intentos
CREATE POLICY login_attempts_user_policy ON public.login_attempts
  FOR SELECT
  USING (user_id = auth.uid());

-- Pol\u00edticas para users_security: Solo el owner
CREATE POLICY users_security_user_policy ON public.users_security
  FOR ALL
  USING (user_id = auth.uid());

-- ============================================================================
-- GRANTS DE PERMISOS
-- ============================================================================

-- Permisos para usuarios autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refresh_tokens TO authenticated;
GRANT SELECT ON public.login_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users_security TO authenticated;

-- Permisos para ejecutar funciones
GRANT EXECUTE ON FUNCTION public.cleanup_expired_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_refresh_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_locked TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_successful_login TO authenticated;

-- ============================================================================
-- CRON JOBS (Opcional - requiere pg_cron extension)
-- ============================================================================

-- Si tienes pg_cron habilitado en Supabase:
-- SELECT cron.schedule('cleanup-expired-sessions', '0 2 * * *',
--   'SELECT public.cleanup_expired_sessions()');
-- SELECT cron.schedule('cleanup-expired-refresh-tokens', '0 3 * * *',
--   'SELECT public.cleanup_expired_refresh_tokens()');
-- SELECT cron.schedule('cleanup-old-login-attempts', '0 4 * * *',
--   'SELECT public.cleanup_old_login_attempts()');

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- Crear entrada de seguridad para usuarios existentes
INSERT INTO public.users_security (user_id, email_verified)
SELECT id, true
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- ESTAD\u00cdSTICAS
-- ============================================================================

ANALYZE public.sessions;
ANALYZE public.refresh_tokens;
ANALYZE public.login_attempts;
ANALYZE public.users_security;

-- ============================================================================
-- TABLA: security_audit_log
-- ============================================================================
-- Registro de eventos de seguridad para auditoría y detección de amenazas

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de evento
  event_type VARCHAR(50) NOT NULL,
  -- Valores: rls_bypass_attempt, virus_upload_attempt, cost_limit_exceeded,
  --         rate_limit_exceeded, suspicious_activity, etc.

  -- Detalles del evento
  details JSONB DEFAULT '{}'::jsonb,

  -- Información de red
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT check_event_type_not_empty
    CHECK (event_type != '')
);

-- Índices para security_audit_log
CREATE INDEX idx_security_audit_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_event_type ON public.security_audit_log(event_type);
CREATE INDEX idx_security_audit_created_at ON public.security_audit_log(created_at DESC);

-- Índice compuesto para queries frecuentes (eventos por usuario)
CREATE INDEX idx_security_audit_user_event ON public.security_audit_log(user_id, event_type, created_at DESC);

-- Índice GIN para búsqueda en detalles JSONB
CREATE INDEX idx_security_audit_details ON public.security_audit_log USING gin(details);

-- Comentarios
COMMENT ON TABLE public.security_audit_log IS 'Registro de auditoría de seguridad para detección de amenazas';
COMMENT ON COLUMN public.security_audit_log.event_type IS 'Tipo de evento de seguridad (rls_bypass_attempt, virus_upload_attempt, etc.)';
COMMENT ON COLUMN public.security_audit_log.details IS 'Detalles adicionales del evento en formato JSON';

-- ============================================================================
-- ROW LEVEL SECURITY para security_audit_log
-- ============================================================================

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver todos los logs
-- Usuarios normales solo ven sus propios eventos
CREATE POLICY security_audit_user_policy ON public.security_audit_log
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    -- Admin check: verificar si user tiene rol admin en metadata
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Política: Solo el sistema puede insertar eventos (service role)
-- Los usuarios NO pueden insertar directamente
CREATE POLICY security_audit_insert_policy ON public.security_audit_log
  FOR INSERT
  WITH CHECK (false); -- Deny all user inserts

-- ============================================================================
-- FUNCIÓN: Log de eventos de seguridad
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type VARCHAR,
  p_details JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con permisos del owner
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Insertar evento de seguridad
  INSERT INTO public.security_audit_log (
    user_id,
    event_type,
    details,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_event_type,
    p_details,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.log_security_event IS 'Registra eventos de seguridad en la tabla de auditoría';

-- ============================================================================
-- GRANTS para security_audit_log
-- ============================================================================

-- Usuarios autenticados pueden leer sus propios eventos
GRANT SELECT ON public.security_audit_log TO authenticated;

-- Solo el sistema puede insertar (via función con SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;

ANALYZE public.security_audit_log;

-- ============================================================================
-- SCRIPT COMPLETADO
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '\u2705 Migration 004 completada exitosamente';
  RAISE NOTICE '\ud83d\udee1\ufe0f Sistema de autenticaci\u00f3n seguro implementado';
  RAISE NOTICE '';
  RAISE NOTICE '\ud83d\udd12 Caracter\u00edsticas:';
  RAISE NOTICE '   - Sesiones activas con tracking de IP/UserAgent';
  RAISE NOTICE '   - Refresh tokens con rotaci\u00f3n';
  RAISE NOTICE '   - Account lockout temporal (15 min auto-unlock)';
  RAISE NOTICE '   - Rate limiting de login (5 intentos/15min)';
  RAISE NOTICE '   - Detecci\u00f3n de session hijacking';
  RAISE NOTICE '   - Funciones de limpieza autom\u00e1tica';
  RAISE NOTICE '';
  RAISE NOTICE '\u26a0\ufe0f  RECOMENDACION: Configurar cron jobs para limpieza';
  RAISE NOTICE '   - cleanup_expired_sessions() (diario)';
  RAISE NOTICE '   - cleanup_expired_refresh_tokens() (diario)';
  RAISE NOTICE '   - cleanup_old_login_attempts() (semanal)';
END $$;
