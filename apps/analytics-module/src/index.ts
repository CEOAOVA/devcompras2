/**
 * Analytics Module - Main Exports
 *
 * Módulo de Analytics con LLM para consultas en lenguaje natural.
 * Powered by Claude 3.5 Sonnet via OpenRouter.
 */

// ========================
// COMPONENTS
// ========================

export { AnalyticsDashboard } from './components/AnalyticsDashboard';
export { NaturalLanguageQuery } from './components/NaturalLanguageQuery';
export { ResultsTable } from './components/ResultsTable';
export { InsightsCard } from './components/InsightsCard';

// ========================
// HOOKS
// ========================

export {
  useAnalyticsQuery,
  useAnalyticsSuggestions,
  useAnalyticsHistory,
  useAnalyticsHealth,
  formatAnalyticsError,
  hasResults,
  getRowCount,
  isFromCache,
} from './hooks/useAnalytics';

// ========================
// TYPES
// ========================

export type {
  AnalyticsQuery,
  AnalyticsResult,
  Suggestion,
  HistoryItem,
} from './hooks/useAnalytics';
