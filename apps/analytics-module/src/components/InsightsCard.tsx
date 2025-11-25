/**
 * Insights Card Component
 *
 * Componente para mostrar insights y recomendaciones generados por IA.
 * Analiza los resultados de las queries y proporciona contexto adicional.
 */

import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import type { AnalyticsResult } from '../hooks/useAnalytics';

// ========================
// INTERFACES
// ========================

interface InsightsCardProps {
  result: AnalyticsResult;
  className?: string;
}

interface ParsedInsight {
  type: 'positive' | 'warning' | 'neutral' | 'recommendation';
  text: string;
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Parse insights text into structured sections
 */
function parseInsights(insightsText: string): ParsedInsight[] {
  if (!insightsText) return [];

  const insights: ParsedInsight[] = [];
  const lines = insightsText.split('\n').filter((line) => line.trim());

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines or headers
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Determine type based on keywords
    let type: ParsedInsight['type'] = 'neutral';

    if (
      trimmedLine.toLowerCase().includes('recomendación') ||
      trimmedLine.toLowerCase().includes('sugerencia') ||
      trimmedLine.toLowerCase().includes('deberías') ||
      trimmedLine.toLowerCase().includes('considera')
    ) {
      type = 'recommendation';
    } else if (
      trimmedLine.toLowerCase().includes('alerta') ||
      trimmedLine.toLowerCase().includes('cuidado') ||
      trimmedLine.toLowerCase().includes('problema') ||
      trimmedLine.toLowerCase().includes('riesgo')
    ) {
      type = 'warning';
    } else if (
      trimmedLine.toLowerCase().includes('bueno') ||
      trimmedLine.toLowerCase().includes('positivo') ||
      trimmedLine.toLowerCase().includes('éxito') ||
      trimmedLine.toLowerCase().includes('crecimiento')
    ) {
      type = 'positive';
    }

    // Remove bullet points and markdown
    const cleanText = trimmedLine
      .replace(/^[-*•]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\*\*/g, '')
      .trim();

    if (cleanText) {
      insights.push({ type, text: cleanText });
    }
  }

  return insights;
}

/**
 * Get icon for insight type
 */
function getInsightIcon(type: ParsedInsight['type']) {
  switch (type) {
    case 'positive':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'recommendation':
      return <TrendingUp className="h-5 w-5 text-blue-600" />;
    default:
      return <Lightbulb className="h-5 w-5 text-purple-600" />;
  }
}

/**
 * Get background color for insight type
 */
function getInsightBgColor(type: ParsedInsight['type']) {
  switch (type) {
    case 'positive':
      return 'bg-green-50 border-green-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'recommendation':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-purple-50 border-purple-200';
  }
}

// ========================
// MAIN COMPONENT
// ========================

export function InsightsCard({ result, className = '' }: InsightsCardProps) {
  // ===========================
  // DATA PROCESSING
  // ===========================

  const hasInsights = !!result?.insights;
  const insights = hasInsights ? parseInsights(result.insights!) : [];
  const hasNoInsights = !hasInsights || insights.length === 0;

  // Calculate some basic stats if insights are missing
  const rowCount = result?.results?.length || 0;
  const executionTime = result?.metadata?.duration || result?.metadata?.queryTime;

  // ===========================
  // RENDER
  // ===========================

  if (hasNoInsights) {
    return (
      <div className={`bg-gray-50 rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700">Insights</h3>
        </div>
        <p className="text-sm text-gray-500">
          No se generaron insights para esta consulta. Activa la opción "Incluir insights" para
          obtener análisis automáticos.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Insights & Recomendaciones</h3>
          {result.metadata?.model && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
              {result.metadata.model.split('/').pop()}
            </span>
          )}
        </div>
      </div>

      {/* Stats bar (if available) */}
      {(rowCount > 0 || executionTime) && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-6 text-xs text-gray-600">
          {rowCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Resultados:</span>
              <span>{rowCount.toLocaleString()}</span>
            </div>
          )}
          {executionTime && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Tiempo:</span>
              <span>{executionTime}ms</span>
            </div>
          )}
          {result.metadata?.tokensUsed && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Tokens:</span>
              <span>{result.metadata.tokensUsed.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Insights list */}
      <div className="p-4 space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getInsightBgColor(insight.type)} transition-all hover:shadow-sm`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">{getInsightIcon(insight.type)}</div>
              <p className="text-sm text-gray-800 flex-1 leading-relaxed">{insight.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Raw insights (development mode) */}
      {process.env.NODE_ENV === 'development' && result.insights && (
        <details className="px-4 pb-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            Ver texto original (desarrollo)
          </summary>
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
            {result.insights}
          </pre>
        </details>
      )}

      {/* Footer with model info */}
      {result.metadata && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Generado con{' '}
            {result.metadata.model?.includes('claude')
              ? 'Claude'
              : result.metadata.model?.includes('gpt')
              ? 'GPT'
              : 'IA'}
          </span>
          {result.metadata.cached && (
            <span className="bg-gray-100 px-2 py-1 rounded">Desde caché</span>
          )}
        </div>
      )}
    </div>
  );
}

export default InsightsCard;
