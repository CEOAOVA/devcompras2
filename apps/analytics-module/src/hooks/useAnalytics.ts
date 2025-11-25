/**
 * TanStack Query Hooks for LLM Analytics
 *
 * Hooks para interactuar con el servicio de analytics usando lenguaje natural.
 */

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';

// ========================
// TIPOS
// ========================

export interface AnalyticsQuery {
  question: string;
  includeInsights?: boolean;
  format?: 'json' | 'markdown' | 'csv';
}

export interface AnalyticsResult {
  success: boolean;
  sql?: string;
  explanation?: string;
  results?: any[];
  insights?: string;
  visualization?: {
    type: 'bar' | 'line' | 'pie' | 'table';
    title: string;
    xAxis?: string;
    yAxis?: string;
    data?: any[];
  };
  metadata?: {
    model: string;
    tokensUsed: number;
    cached: boolean;
    queryTime?: number;
    rowCount?: number;
    duration?: number;
  };
  error?: string;
  cached?: boolean;
}

export interface Suggestion {
  question: string;
  category: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
}

export interface HistoryItem {
  id: string;
  question: string;
  timestamp: string;
  rowCount: number;
  cached: boolean;
}

// ========================
// API BASE URL
// ========================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ========================
// QUERY HOOK
// ========================

/**
 * Hook para ejecutar queries de analytics en lenguaje natural
 *
 * @example
 * ```tsx
 * const { mutate, data, isLoading, error } = useAnalyticsQuery();
 *
 * const handleSubmit = () => {
 *   mutate({
 *     question: "¿Cuáles son los 10 productos más vendidos?",
 *     includeInsights: true
 *   });
 * };
 * ```
 */
export function useAnalyticsQuery(): UseMutationResult<
  AnalyticsResult,
  Error,
  AnalyticsQuery,
  unknown
> {
  return useMutation({
    mutationFn: async (query: AnalyticsQuery) => {
      const response = await fetch(`${API_BASE_URL}/api/analytics/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: 'Network error',
          code: 'NETWORK_ERROR',
        }));
        throw new Error(error.error || 'Query failed');
      }

      return response.json();
    },
    retry: (failureCount, error) => {
      // Retry solo en errores de red, no en errores de validación
      if (error.message.includes('Network error')) {
        return failureCount < 2;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// ========================
// SUGGESTIONS HOOK
// ========================

/**
 * Hook para obtener sugerencias de preguntas
 *
 * @example
 * ```tsx
 * const { data: suggestions, isLoading } = useAnalyticsSuggestions('sales');
 * ```
 */
export function useAnalyticsSuggestions(
  category?: 'sales' | 'inventory' | 'products' | 'clients' | 'general',
  limit: number = 5
): UseQueryResult<{ suggestions: Suggestion[] }, Error> {
  return useQuery({
    queryKey: ['analytics-suggestions', category, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('limit', limit.toString());

      const url = `${API_BASE_URL}/api/analytics/suggestions?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 10, // 10 minutos (las sugerencias no cambian frecuentemente)
    gcTime: 1000 * 60 * 30, // 30 minutos
  });
}

// ========================
// HISTORY HOOK
// ========================

/**
 * Hook para obtener historial de queries
 *
 * @example
 * ```tsx
 * const { data: history, refetch } = useAnalyticsHistory(20, 0);
 * ```
 */
export function useAnalyticsHistory(
  limit: number = 20,
  offset: number = 0
): UseQueryResult<{
  history: HistoryItem[];
  total: number;
  limit: number;
  offset: number;
}, Error> {
  return useQuery({
    queryKey: ['analytics-history', limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const url = `${API_BASE_URL}/api/analytics/history?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 1, // 1 minuto
    gcTime: 1000 * 60 * 5, // 5 minutos
  });
}

// ========================
// HEALTH CHECK HOOK
// ========================

/**
 * Hook para verificar el estado del servicio de analytics
 *
 * @example
 * ```tsx
 * const { data: health, isError } = useAnalyticsHealth();
 * ```
 */
export function useAnalyticsHealth(): UseQueryResult<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    redis: boolean;
    openrouter: boolean;
    rateLimit: boolean;
    circuitBreaker: boolean;
    firebird: boolean;
  };
  timestamp: string;
}, Error> {
  return useQuery({
    queryKey: ['analytics-health'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/analytics/health`);

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return response.json();
    },
    refetchInterval: 1000 * 60 * 2, // Refetch cada 2 minutos
    retry: 3,
    staleTime: 1000 * 30, // 30 segundos
  });
}

// ========================
// UTILITY FUNCTIONS
// ========================

/**
 * Formatear error de analytics para mostrar al usuario
 */
export function formatAnalyticsError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('rate limit')) {
    return 'Has excedido el límite de consultas por hora. Por favor, espera un momento.';
  }

  if (message.includes('cost limit')) {
    return 'Has alcanzado el límite de presupuesto diario. Intenta mañana.';
  }

  if (message.includes('timeout')) {
    return 'La consulta tardó demasiado. Intenta simplificar tu pregunta.';
  }

  if (message.includes('network')) {
    return 'Error de conexión. Verifica tu internet e intenta nuevamente.';
  }

  if (message.includes('invalid')) {
    return 'Pregunta no válida. Asegúrate de hacer una pregunta sobre tus datos.';
  }

  return error.message || 'Error desconocido. Por favor, intenta nuevamente.';
}

/**
 * Verificar si el resultado tiene datos
 */
export function hasResults(result?: AnalyticsResult): boolean {
  return !!(result?.results && result.results.length > 0);
}

/**
 * Obtener el número de filas del resultado
 */
export function getRowCount(result?: AnalyticsResult): number {
  return result?.results?.length || 0;
}

/**
 * Verificar si el resultado viene de caché
 */
export function isFromCache(result?: AnalyticsResult): boolean {
  return result?.cached === true || result?.metadata?.cached === true;
}
