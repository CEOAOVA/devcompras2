/**
 * Auth Middleware
 *
 * Middlewares de autenticación con:
 * - Verificación de JWT desde Authorization header
 * - Validación de sesión activa
 * - CSRF protection para refresh endpoint
 * - Rate limiting granular por endpoint/usuario
 * - Extracción de IP y User-Agent para tracking
 *
 * SEGURIDAD:
 * - Access tokens SOLO en Authorization header (nunca cookies)
 * - Refresh tokens SOLO en HttpOnly cookies (CSRF safe)
 * - CSRF token validation para operaciones sensibles
 * - Rate limiting adaptativo por endpoint
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../services/auth-service';

// Tipos
export interface AuthenticatedRequest extends FastifyRequest {
  authUser?: {
    userId: string;
    sessionId: string;
    email: string;
  };
}

/**
 * Middleware: Verificar JWT y sesión activa
 *
 * Uso:
 * ```typescript
 * fastify.get('/api/protected',
 *   { preHandler: requireAuth },
 *   async (request, reply) => { ... }
 * );
 * ```
 */
export async function requireAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // 1. Extraer token del header Authorization
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
        code: 'AUTH_TOKEN_MISSING',
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    // 2. Verificar token y sesión
    const verification = await authService.verifyAccessToken(token);

    if (!verification.valid) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: verification.error || 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID',
      });
    }

    // 3. Adjuntar datos de usuario al request
    request.authUser = {
      userId: verification.payload!.userId,
      sessionId: verification.payload!.sessionId,
      email: verification.payload!.email,
    };

    // 4. Continuar con el siguiente handler
  } catch (error: any) {
    console.error('❌ Auth middleware error:', error.message);

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication verification failed',
      code: 'AUTH_VERIFICATION_ERROR',
    });
  }
}

/**
 * Middleware: Opcional - verificar auth si existe token
 *
 * Uso para endpoints públicos que pueden tener funcionalidad extra si el usuario está autenticado
 */
export async function optionalAuth(
  request: AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token - continuar sin autenticación
      return;
    }

    const token = authHeader.substring(7);
    const verification = await authService.verifyAccessToken(token);

    if (verification.valid) {
      request.authUser = {
        userId: verification.payload!.userId,
        sessionId: verification.payload!.sessionId,
        email: verification.payload!.email,
      };
    }

    // Continuar independientemente del resultado
  } catch (error) {
    // Ignorar errores - endpoint es opcional auth
  }
}

/**
 * Middleware: CSRF Protection para refresh token endpoint
 *
 * Previene CSRF attacks en el endpoint /auth/refresh que usa cookies.
 * Requiere header X-CSRF-Token o custom header X-Requested-With.
 */
export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // 1. Solo aplicar CSRF protection a métodos que modifican estado
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(request.method)) {
    return;
  }

  // 2. Verificar presencia de header CSRF
  const csrfToken = request.headers['x-csrf-token'] as string;
  const requestedWith = request.headers['x-requested-with'] as string;

  // Aceptar si tiene X-Requested-With (usado por AJAX/fetch)
  if (requestedWith === 'XMLHttpRequest' || requestedWith === 'fetch') {
    return;
  }

  // Aceptar si tiene CSRF token válido
  if (csrfToken) {
    // TODO: Validar CSRF token contra sesión
    // Por ahora, solo verificar que existe
    return;
  }

  // 3. Rechazar si no tiene protección CSRF
  return reply.status(403).send({
    error: 'Forbidden',
    message: 'CSRF token missing or invalid',
    code: 'CSRF_TOKEN_MISSING',
  });
}

/**
 * Middleware: Extraer IP y User-Agent
 *
 * Extrae información de la request para tracking de sesiones
 */
export function extractRequestInfo(request: FastifyRequest): {
  ip?: string;
  userAgent?: string;
} {
  // IP address (considerar proxy headers)
  const ip =
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (request.headers['x-real-ip'] as string) ||
    request.ip;

  // User-Agent
  const userAgent = request.headers['user-agent'];

  return { ip, userAgent };
}

/**
 * Decorator para extraer info de request automáticamente
 */
export function decorateRequest(request: FastifyRequest): void {
  const info = extractRequestInfo(request);
  (request as any).clientIp = info.ip;
  (request as any).clientUserAgent = info.userAgent;
}

/**
 * Middleware: Rate Limiting Granular
 *
 * Factory function para crear rate limiters específicos por endpoint
 *
 * Ejemplos:
 * - Login: 5 intentos / 15 minutos por IP
 * - Password Reset: 3 intentos / hora por email
 * - File Upload: 10 archivos / día por usuario
 * - API Queries: 100 requests / minuto por usuario
 */
export function createRateLimiter(config: {
  max: number;
  window: string; // '1m', '15m', '1h', '1d'
  keyGenerator?: (request: FastifyRequest) => string;
  errorMessage?: string;
}) {
  // Convertir window a milisegundos
  const windowMs = parseWindowToMs(config.window);

  // Storage en memoria (para producción usar Redis)
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // 1. Generar key única
      const key = config.keyGenerator
        ? config.keyGenerator(request)
        : extractRequestInfo(request).ip || 'unknown';

      const now = Date.now();

      // 2. Obtener contador actual
      let record = requests.get(key);

      // 3. Reset si la ventana expiró
      if (!record || record.resetAt < now) {
        record = { count: 0, resetAt: now + windowMs };
        requests.set(key, record);
      }

      // 4. Incrementar contador
      record.count++;

      // 5. Verificar límite
      if (record.count > config.max) {
        const retryAfter = Math.ceil((record.resetAt - now) / 1000);

        return reply
          .status(429)
          .header('Retry-After', retryAfter.toString())
          .send({
            error: 'Too Many Requests',
            message:
              config.errorMessage ||
              `Rate limit exceeded. Try again in ${retryAfter} seconds`,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter,
          });
      }

      // 6. Headers informativos
      reply.header('X-RateLimit-Limit', config.max.toString());
      reply.header('X-RateLimit-Remaining', (config.max - record.count).toString());
      reply.header('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());

      // Cleanup periódico (eliminar registros expirados cada 5 minutos)
      if (Math.random() < 0.01) {
        // 1% de probabilidad
        for (const [k, v] of requests.entries()) {
          if (v.resetAt < now) {
            requests.delete(k);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Rate limiter error:', error.message);
      // No bloquear en caso de error
    }
  };
}

/**
 * Helper: Convertir window string a milisegundos
 */
function parseWindowToMs(window: string): number {
  const match = window.match(/^(\d+)(s|m|h|d)$/);

  if (!match) {
    throw new Error(`Invalid window format: ${window}. Use format like '1m', '15m', '1h', '1d'`);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * Rate Limiters Pre-configurados
 */

// Login endpoint: 5 intentos / 15 minutos por IP
export const loginRateLimiter = createRateLimiter({
  max: 5,
  window: '15m',
  keyGenerator: (req) => {
    const ip = extractRequestInfo(req).ip || 'unknown';
    // Incluir email en la key si está disponible
    const email = (req.body as any)?.email;
    return email ? `login:${ip}:${email}` : `login:${ip}`;
  },
  errorMessage: 'Too many login attempts. Please try again in 15 minutes.',
});

// Password reset: 3 intentos / hora por email
export const passwordResetRateLimiter = createRateLimiter({
  max: 3,
  window: '1h',
  keyGenerator: (req) => {
    const email = (req.body as any)?.email || 'unknown';
    return `password-reset:${email}`;
  },
  errorMessage: 'Too many password reset attempts. Please try again in 1 hour.',
});

// File upload: 20 archivos / hora por usuario
export const fileUploadRateLimiter = createRateLimiter({
  max: 20,
  window: '1h',
  keyGenerator: (req) => {
    const userId = (req as AuthenticatedRequest).authUser?.userId || extractRequestInfo(req).ip || 'unknown';
    return `file-upload:${userId}`;
  },
  errorMessage: 'Upload limit exceeded. Please try again in 1 hour.',
});

// API general: 100 requests / minuto por usuario
export const apiRateLimiter = createRateLimiter({
  max: 100,
  window: '1m',
  keyGenerator: (req) => {
    const userId = (req as AuthenticatedRequest).authUser?.userId || extractRequestInfo(req).ip || 'unknown';
    return `api:${userId}`;
  },
  errorMessage: 'API rate limit exceeded. Please slow down.',
});

// Refresh token: 10 intentos / hora por IP (prevenir abuse)
export const refreshTokenRateLimiter = createRateLimiter({
  max: 10,
  window: '1h',
  keyGenerator: (req) => {
    const ip = extractRequestInfo(req).ip || 'unknown';
    return `refresh:${ip}`;
  },
  errorMessage: 'Too many token refresh attempts.',
});
