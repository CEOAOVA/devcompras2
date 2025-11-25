/**
 * Natural Language Query Component
 *
 * Componente principal para realizar consultas de analytics en lenguaje natural.
 * Permite al usuario escribir preguntas sobre sus datos y obtener resultados automáticamente.
 */

import { useState, useRef, useEffect } from 'react';
import {
  useAnalyticsQuery,
  useAnalyticsSuggestions,
  formatAnalyticsError,
  type AnalyticsResult,
  type Suggestion,
} from '../hooks/useAnalytics';
import {
  Search,
  Loader2,
  Send,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Database,
  Zap,
  ChevronRight,
} from 'lucide-react';

// ========================
// INTERFACES
// ========================

interface NaturalLanguageQueryProps {
  onResult?: (result: AnalyticsResult) => void;
  defaultCategory?: 'sales' | 'inventory' | 'products' | 'clients' | 'general';
  placeholder?: string;
  showSuggestions?: boolean;
}

// ========================
// COMPONENTE PRINCIPAL
// ========================

export function NaturalLanguageQuery({
  onResult,
  defaultCategory,
  placeholder = '¿Cuáles son los 10 productos más vendidos este mes?',
  showSuggestions = true,
}: NaturalLanguageQueryProps) {
  // ===========================
  // STATE & REFS
  // ===========================

  const [question, setQuestion] = useState('');
  const [includeInsights, setIncludeInsights] = useState(true);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ===========================
  // HOOKS
  // ===========================

  const { mutate, data, isLoading, error, reset } = useAnalyticsQuery();
  const { data: suggestionsData, isLoading: loadingSuggestions } = useAnalyticsSuggestions(
    defaultCategory,
    6
  );

  // ===========================
  // EFFECTS
  // ===========================

  // Llamar callback cuando hay resultado
  useEffect(() => {
    if (data && onResult) {
      onResult(data);
    }
  }, [data, onResult]);

  // Focus en input al montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ===========================
  // HANDLERS
  // ===========================

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      return;
    }

    // Reset previous results/errors
    reset();

    // Execute query
    mutate({
      question: question.trim(),
      includeInsights,
      format: 'json',
    });
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuestion(suggestion.question);
    setShowSuggestionsList(false);
    inputRef.current?.focus();

    // Auto-submit suggestion
    setTimeout(() => {
      mutate({
        question: suggestion.question,
        includeInsights,
        format: 'json',
      });
    }, 100);
  };

  const handleClear = () => {
    setQuestion('');
    reset();
    setShowSuggestionsList(false);
    inputRef.current?.focus();
  };

  // ===========================
  // RENDER HELPERS
  // ===========================

  const suggestions = suggestionsData?.suggestions || [];
  const hasError = !!error;
  const hasResult = !!data;

  // Complexity badge color
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sales':
        return <TrendingUp className="h-4 w-4" />;
      case 'inventory':
        return <Database className="h-4 w-4" />;
      case 'products':
        return <Sparkles className="h-4 w-4" />;
      case 'clients':
        return <Zap className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  // ===========================
  // RENDER
  // ===========================

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ===========================
          QUERY INPUT FORM
          =========================== */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <form onSubmit={handleSubmit} className="p-6">
          {/* Title */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Consulta en Lenguaje Natural
            </h2>
          </div>

          {/* Input with button */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onFocus={() => setShowSuggestionsList(true)}
                placeholder={placeholder}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 transition-all"
                maxLength={500}
              />
              {question && !isLoading && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Consultar</span>
                </>
              )}
            </button>
          </div>

          {/* Character count */}
          <div className="mt-2 text-xs text-gray-500 text-right">
            {question.length} / 500 caracteres
          </div>

          {/* Insights toggle */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="includeInsights"
              checked={includeInsights}
              onChange={(e) => setIncludeInsights(e.target.checked)}
              className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="includeInsights" className="text-sm text-gray-700 cursor-pointer">
              Incluir insights y recomendaciones automáticas
            </label>
          </div>
        </form>

        {/* ===========================
            ERROR STATE
            =========================== */}
        {hasError && (
          <div className="px-6 pb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900 mb-1">Error en la consulta</h3>
                <p className="text-sm text-red-700">{formatAnalyticsError(error)}</p>
              </div>
              <button
                onClick={reset}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* ===========================
            SUCCESS STATE (METADATA)
            =========================== */}
        {hasResult && !hasError && data.success && (
          <div className="px-6 pb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-green-900">
                    Consulta ejecutada exitosamente
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-green-700">
                  {data.metadata?.rowCount !== undefined && (
                    <span>{data.metadata.rowCount} resultados</span>
                  )}
                  {data.metadata?.queryTime && (
                    <span>{data.metadata.queryTime}ms</span>
                  )}
                  {data.metadata?.cached && (
                    <span className="bg-green-100 px-2 py-1 rounded">
                      Desde caché
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===========================
          SUGGESTIONS
          =========================== */}
      {showSuggestions && showSuggestionsList && suggestions.length > 0 && !isLoading && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Preguntas sugeridas
            </h3>
            <button
              onClick={() => setShowSuggestionsList(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Ocultar
            </button>
          </div>

          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(suggestion.category)}
                      <span className="text-xs font-medium text-gray-600 capitalize">
                        {suggestion.category}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${getComplexityColor(
                        suggestion.complexity
                      )}`}
                    >
                      {suggestion.complexity}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1 group-hover:text-purple-700">
                    {suggestion.question}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {suggestion.description}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium">Usar esta pregunta</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===========================
          SQL PREVIEW (DEBUG)
          =========================== */}
      {hasResult && data.sql && process.env.NODE_ENV === 'development' && (
        <details className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
            Ver SQL generado (desarrollo)
          </summary>
          <pre className="mt-3 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
            {data.sql}
          </pre>
          {data.explanation && (
            <p className="mt-2 text-xs text-gray-600 italic">{data.explanation}</p>
          )}
        </details>
      )}
    </div>
  );
}

export default NaturalLanguageQuery;
