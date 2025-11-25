/**
 * Analytics Dashboard Component
 *
 * Componente principal que integra toda la funcionalidad de LLM Analytics.
 * Combina input de lenguaje natural, resultados, insights y historial.
 */

import { useState } from 'react';
import { NaturalLanguageQuery } from './NaturalLanguageQuery';
import { ResultsTable } from './ResultsTable';
import { InsightsCard } from './InsightsCard';
import { useAnalyticsHistory, useAnalyticsHealth, type AnalyticsResult } from '../hooks/useAnalytics';
import {
  BarChart3,
  History,
  Activity,
  ChevronRight,
  Clock,
  Database,
} from 'lucide-react';

// ========================
// INTERFACES
// ========================

interface AnalyticsDashboardProps {
  defaultCategory?: 'sales' | 'inventory' | 'products' | 'clients' | 'general';
  showHistory?: boolean;
  showHealth?: boolean;
}

// ========================
// MAIN COMPONENT
// ========================

export function AnalyticsDashboard({
  defaultCategory,
  showHistory = true,
  showHealth = true,
}: AnalyticsDashboardProps) {
  // ===========================
  // STATE
  // ===========================

  const [currentResult, setCurrentResult] = useState<AnalyticsResult | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // ===========================
  // HOOKS
  // ===========================

  const { data: historyData } = useAnalyticsHistory(10, 0);
  const { data: healthData, isError: healthError } = useAnalyticsHealth();

  // ===========================
  // DATA
  // ===========================

  const hasResult = !!currentResult;
  const hasInsights = !!currentResult?.insights;
  const history = historyData?.history || [];

  // ===========================
  // HANDLERS
  // ===========================

  const handleQueryResult = (result: AnalyticsResult) => {
    setCurrentResult(result);
  };

  const handleHistoryItemClick = (item: any) => {
    // Here you could re-execute the query or just display the question
    console.log('History item clicked:', item);
    setShowHistoryPanel(false);
  };

  // ===========================
  // RENDER
  // ===========================

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Analytics con IA</h1>
          </div>
          <p className="text-gray-600">
            Haz preguntas sobre tus datos en lenguaje natural y obtén análisis automáticos
          </p>
        </div>

        {/* Health Status Banner */}
        {showHealth && healthData && (
          <div className="mb-6">
            {healthData.status === 'healthy' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <Activity className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-green-900">
                    Sistema operativo
                  </span>
                  <p className="text-xs text-green-700 mt-0.5">
                    Todos los servicios funcionando correctamente
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-green-700">
                  {healthData.checks.redis && <span>Redis ✓</span>}
                  {healthData.checks.openrouter && <span>OpenRouter ✓</span>}
                  {healthData.checks.firebird && <span>Firebird ✓</span>}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                <Activity className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-yellow-900">
                    Sistema degradado
                  </span>
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Algunos servicios no están disponibles
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {healthError && showHealth && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <span className="text-sm font-medium text-red-900">
                No se puede verificar el estado del sistema
              </span>
              <p className="text-xs text-red-700 mt-0.5">
                El servicio de analytics no responde. Contacta al administrador.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Query input */}
            <NaturalLanguageQuery
              onResult={handleQueryResult}
              defaultCategory={defaultCategory}
              showSuggestions={!hasResult}
            />

            {/* Results */}
            {hasResult && currentResult.success && (
              <>
                {/* Results table */}
                {currentResult.results && currentResult.results.length > 0 && (
                  <ResultsTable result={currentResult} />
                )}

                {/* Insights card */}
                {hasInsights && <InsightsCard result={currentResult} />}

                {/* Visualization (if provided) */}
                {currentResult.visualization && (
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      {currentResult.visualization.title}
                    </h3>
                    <div className="text-sm text-gray-600">
                      <p>Tipo: {currentResult.visualization.type}</p>
                      {currentResult.visualization.xAxis && (
                        <p>Eje X: {currentResult.visualization.xAxis}</p>
                      )}
                      {currentResult.visualization.yAxis && (
                        <p>Eje Y: {currentResult.visualization.yAxis}</p>
                      )}
                      <p className="mt-2 text-xs italic">
                        La visualización de gráficos se implementará en una versión futura
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          {showHistory && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 sticky top-8">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Historial Reciente</h3>
                  </div>
                </div>

                {/* History list */}
                <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="p-8 text-center">
                      <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        No hay consultas recientes
                      </p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleHistoryItemClick(item)}
                        className="w-full p-4 text-left hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 group-hover:text-purple-700">
                            {item.question}
                          </p>
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0 group-hover:text-purple-600" />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.timestamp).toLocaleDateString('es-MX', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {item.rowCount} resultados
                          </span>
                          {item.cached && (
                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                              Caché
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                {history.length > 0 && (
                  <div className="p-3 border-t border-gray-200">
                    <button className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium">
                      Ver todo el historial →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Powered by Claude 3.5 Sonnet via OpenRouter •{' '}
            <a href="#" className="text-purple-600 hover:underline">
              Ver documentación
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
