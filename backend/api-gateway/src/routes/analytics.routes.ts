/**
 * Analytics Routes
 *
 * Endpoints para análisis de datos con LLM:
 * - POST /api/analytics/query - Consulta en lenguaje natural
 * - GET /api/analytics/history - Historial de consultas
 * - GET /api/analytics/suggestions - Preguntas sugeridas
 * - GET /api/analytics/health - Health check del servicio
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  llmAnalyticsService,
  type AnalyticsQuery,
  type AnalyticsResult,
} from '../services/llm-analytics.service';

// ========================
// SCHEMAS DE VALIDACIÓN
// ========================

/**
 * Schema para query analytics
 */
const QuerySchema = z.object({
  question: z
    .string()
    .min(5, 'La pregunta debe tener al menos 5 caracteres')
    .max(500, 'La pregunta no puede exceder 500 caracteres')
    .regex(/[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/, 'La pregunta debe contener caracteres alfanuméricos'),
  includeInsights: z.boolean().optional().default(true),
  format: z.enum(['json', 'markdown', 'csv']).optional().default('json'),
});

type QueryRequest = z.infer<typeof QuerySchema>;

/**
 * Schema para sugerencias
 */
const SuggestionsQuerySchema = z.object({
  category: z.enum(['sales', 'inventory', 'products', 'clients', 'general']).optional(),
  limit: z.number().min(1).max(20).optional().default(5),
});

/**
 * Schema para historial
 */
const HistoryQuerySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  userId: z.string().optional(),
});

// ========================
// ROUTES
// ========================

export default async function analyticsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/analytics/query
   * Consulta en lenguaje natural
   */
  fastify.post<{
    Body: QueryRequest;
  }>(
    '/api/analytics/query',
    {
      schema: {
        description: 'Analizar datos con pregunta en lenguaje natural',
        tags: ['analytics'],
        body: {
          type: 'object',
          required: ['question'],
          properties: {
            question: {
              type: 'string',
              minLength: 5,
              maxLength: 500,
              description: 'Pregunta en lenguaje natural sobre los datos'
            },
            includeInsights: {
              type: 'boolean',
              default: true,
              description: 'Incluir insights automáticos generados por IA'
            },
            format: {
              type: 'string',
              enum: ['json', 'markdown', 'csv'],
              default: 'json',
              description: 'Formato de respuesta'
            },
          },
        },
        response: {
          200: {
            description: 'Análisis completado exitosamente',
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              sql: { type: 'string' },
              explanation: { type: 'string' },
              results: { type: 'array' },
              insights: { type: 'string' },
              visualization: { type: 'object' },
              metadata: { type: 'object' },
              cached: { type: 'boolean' },
            },
          },
          400: {
            description: 'Solicitud inválida',
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
          429: {
            description: 'Rate limit excedido',
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
          500: {
            description: 'Error interno del servidor',
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: QueryRequest }>, reply: FastifyReply) => {
      const requestId = request.id;
      const startTime = Date.now();

      try {
        // Validar request body
        const validated = QuerySchema.parse(request.body);

        // Extraer userId del token de autenticación (si existe)
        // TODO: Implementar autenticación JWT
        const userId = (request.user as any)?.id || request.ip;

        // Construir query
        const query: AnalyticsQuery = {
          question: validated.question,
          userId,
          includeInsights: validated.includeInsights,
          format: validated.format,
        };

        // Ejecutar análisis
        const result: AnalyticsResult = await llmAnalyticsService.analyzeData(query);

        // Formatear resultado según formato solicitado
        let formattedResult: any = result;

        if (validated.format === 'markdown') {
          formattedResult = {
            ...result,
            resultsFormatted: formatAsMarkdown(result),
          };
        } else if (validated.format === 'csv') {
          formattedResult = {
            ...result,
            resultsFormatted: formatAsCSV(result),
          };
        }

        const duration = Date.now() - startTime;

        fastify.log.info({
          requestId,
          userId,
          question: validated.question.substring(0, 50),
          cached: result.cached,
          duration,
        }, '📊 Analytics query completed');

        return reply.code(200).send(formattedResult);
      } catch (error) {
        return handleError(error, reply, fastify, requestId);
      }
    }
  );

  /**
   * GET /api/analytics/suggestions
   * Obtener preguntas sugeridas
   */
  fastify.get<{
    Querystring: z.infer<typeof SuggestionsQuerySchema>;
  }>(
    '/api/analytics/suggestions',
    {
      schema: {
        description: 'Obtener preguntas sugeridas para análisis',
        tags: ['analytics'],
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['sales', 'inventory', 'products', 'clients', 'general'],
              description: 'Categoría de sugerencias'
            },
            limit: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              default: 5,
              description: 'Número de sugerencias a retornar'
            },
          },
        },
        response: {
          200: {
            description: 'Sugerencias obtenidas exitosamente',
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    complexity: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof SuggestionsQuerySchema> }>, reply: FastifyReply) => {
      try {
        const { category, limit } = SuggestionsQuerySchema.parse(request.query);

        const suggestions = getSuggestions(category, limit);

        return reply.code(200).send({ suggestions });
      } catch (error) {
        return handleError(error, reply, fastify, request.id);
      }
    }
  );

  /**
   * GET /api/analytics/history
   * Obtener historial de consultas
   */
  fastify.get<{
    Querystring: z.infer<typeof HistoryQuerySchema>;
  }>(
    '/api/analytics/history',
    {
      schema: {
        description: 'Obtener historial de consultas analytics del usuario',
        tags: ['analytics'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'number', minimum: 0, default: 0 },
            userId: { type: 'string', description: 'ID del usuario (opcional)' },
          },
        },
        response: {
          200: {
            description: 'Historial obtenido exitosamente',
            type: 'object',
            properties: {
              history: { type: 'array' },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: z.infer<typeof HistoryQuerySchema> }>, reply: FastifyReply) => {
      try {
        const { limit, offset, userId } = HistoryQuerySchema.parse(request.query);

        // TODO: Implementar storage de historial en Redis o DB
        // Por ahora retornamos array vacío
        const history: any[] = [];

        return reply.code(200).send({
          history,
          total: history.length,
          limit,
          offset,
        });
      } catch (error) {
        return handleError(error, reply, fastify, request.id);
      }
    }
  );

  /**
   * GET /api/analytics/health
   * Health check del servicio de analytics
   */
  fastify.get(
    '/api/analytics/health',
    {
      schema: {
        description: 'Verificar estado del servicio de analytics',
        tags: ['analytics', 'health'],
        response: {
          200: {
            description: 'Servicio saludable',
            type: 'object',
            properties: {
              status: { type: 'string' },
              checks: { type: 'object' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await llmAnalyticsService.healthCheck();

        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

        return reply.code(statusCode).send({
          ...health,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        fastify.log.error(error, '❌ Health check failed');
        return reply.code(503).send({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}

// ========================
// FUNCIONES AUXILIARES
// ========================

/**
 * Formatear resultados como Markdown
 */
function formatAsMarkdown(result: AnalyticsResult): string {
  if (!result.results || result.results.length === 0) {
    return '## Sin resultados\n\nNo se encontraron datos para esta consulta.';
  }

  let markdown = `## ${result.explanation || 'Resultados'}\n\n`;

  // Crear tabla
  const keys = Object.keys(result.results[0]);
  markdown += `| ${keys.join(' | ')} |\n`;
  markdown += `| ${keys.map(() => '---').join(' | ')} |\n`;

  result.results.forEach(row => {
    markdown += `| ${keys.map(k => row[k]).join(' | ')} |\n`;
  });

  // Añadir insights si existen
  if (result.insights) {
    markdown += `\n### 💡 Insights\n\n${result.insights}\n`;
  }

  // Añadir metadata
  markdown += `\n---\n`;
  markdown += `**SQL ejecutado:**\n\`\`\`sql\n${result.sql}\n\`\`\`\n`;
  markdown += `\n**Filas:** ${result.results.length} | **Tiempo:** ${result.metadata?.queryTime}ms\n`;

  return markdown;
}

/**
 * Formatear resultados como CSV
 */
function formatAsCSV(result: AnalyticsResult): string {
  if (!result.results || result.results.length === 0) {
    return '';
  }

  const keys = Object.keys(result.results[0]);
  let csv = keys.join(',') + '\n';

  result.results.forEach(row => {
    csv += keys.map(k => {
      const value = row[k];
      // Escapar comillas y valores con comas
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',') + '\n';
  });

  return csv;
}

/**
 * Obtener sugerencias de preguntas
 */
function getSuggestions(category?: string, limit: number = 5): any[] {
  const allSuggestions = {
    sales: [
      {
        question: '¿Cuáles son los 10 productos más vendidos este mes?',
        category: 'sales',
        description: 'Top productos por volumen de ventas',
        complexity: 'low',
      },
      {
        question: 'Muéstrame las ventas totales por sucursal del último trimestre',
        category: 'sales',
        description: 'Análisis de ventas por ubicación',
        complexity: 'medium',
      },
      {
        question: '¿Qué días de la semana vendemos más?',
        category: 'sales',
        description: 'Patrón de ventas por día',
        complexity: 'low',
      },
      {
        question: 'Compara las ventas de este mes vs el mes pasado',
        category: 'sales',
        description: 'Análisis comparativo mensual',
        complexity: 'medium',
      },
    ],
    inventory: [
      {
        question: '¿Qué productos tienen stock bajo y alta rotación?',
        category: 'inventory',
        description: 'Identificar productos críticos',
        complexity: 'medium',
      },
      {
        question: 'Productos con stock por debajo del mínimo',
        category: 'inventory',
        description: 'Lista de productos para reabastecer',
        complexity: 'low',
      },
      {
        question: 'Muéstrame el inventario valorizado por categoría',
        category: 'inventory',
        description: 'Valor de inventario por categoría',
        complexity: 'medium',
      },
    ],
    products: [
      {
        question: '¿Cuáles son los 5 productos más caros?',
        category: 'products',
        description: 'Top productos por precio',
        complexity: 'low',
      },
      {
        question: 'Productos que no se han vendido en los últimos 90 días',
        category: 'products',
        description: 'Identificar inventario muerto',
        complexity: 'medium',
      },
      {
        question: 'Lista de productos con mayor margen de ganancia',
        category: 'products',
        description: 'Rentabilidad por producto',
        complexity: 'medium',
      },
    ],
    clients: [
      {
        question: '¿Quiénes son mis mejores 10 clientes por volumen de compra?',
        category: 'clients',
        description: 'Top clientes VIP',
        complexity: 'low',
      },
      {
        question: 'Clientes que no han comprado en los últimos 6 meses',
        category: 'clients',
        description: 'Identificar clientes inactivos',
        complexity: 'medium',
      },
    ],
    general: [
      {
        question: 'Resumen ejecutivo de ventas del último mes',
        category: 'general',
        description: 'Dashboard general',
        complexity: 'medium',
      },
      {
        question: 'Tendencia de ventas de los últimos 6 meses',
        category: 'general',
        description: 'Análisis de tendencias',
        complexity: 'medium',
      },
    ],
  };

  let suggestions: any[] = [];

  if (category && category in allSuggestions) {
    suggestions = allSuggestions[category as keyof typeof allSuggestions];
  } else {
    // Combinar todas las categorías
    suggestions = Object.values(allSuggestions).flat();
  }

  // Shuffle y limitar
  suggestions = suggestions.sort(() => Math.random() - 0.5).slice(0, limit);

  return suggestions;
}

/**
 * Manejar errores
 */
function handleError(error: any, reply: FastifyReply, fastify: FastifyInstance, requestId: string) {
  fastify.log.error({
    requestId,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  }, '❌ Analytics error');

  // Determinar código de error y mensaje
  let statusCode = 500;
  let errorCode = 'ANALYTICS_ERROR';
  let errorMessage = 'Error interno del servidor';

  if (error instanceof z.ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = error.errors.map(e => e.message).join(', ');
  } else if (error.code) {
    // Error de nuestro servicio
    errorCode = error.code;
    errorMessage = error.message;

    switch (error.code) {
      case 'RATE_LIMIT_EXCEEDED':
      case 'COST_LIMIT_EXCEEDED':
        statusCode = 429;
        break;
      case 'INVALID_INPUT':
      case 'INVALID_SQL':
        statusCode = 400;
        break;
      case 'CIRCUIT_BREAKER_OPEN':
        statusCode = 503;
        break;
      default:
        statusCode = error.statusCode || 500;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return reply.code(statusCode).send({
    error: errorMessage,
    code: errorCode,
    requestId,
  });
}
