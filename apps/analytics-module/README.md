# Analytics Module

Módulo de analytics con LLM para realizar consultas en lenguaje natural sobre datos de Microsip/Firebird.

Powered by **Claude 3.5 Sonnet** via OpenRouter.

## 🚀 Características

- **Consultas en lenguaje natural**: Pregunta sobre tus datos en español
- **SQL automático**: El LLM genera y valida SQL de forma segura
- **Insights inteligentes**: Análisis y recomendaciones automáticas
- **Caché inteligente**: Respuestas rápidas con Redis (70%+ hit rate esperado)
- **Rate limiting**: Control de costos y uso
- **Historial**: Guarda tus consultas recientes
- **Exportación**: Descarga resultados en CSV
- **Seguridad**: Validación AST, whitelist de tablas, solo SELECT

## 📦 Instalación

```bash
# En el directorio del analytics-module
npm install @tanstack/react-query lucide-react
```

## 🔧 Configuración

### 1. Backend (api-gateway)

Crea `.env` basado en `.env.example`:

```env
# OpenRouter API
OPENROUTER_API_KEY=sk-or-v1-tu-key-aqui
OPENROUTER_ANALYTICS_MODEL=anthropic/claude-3.5-sonnet

# Microsip Connector
MICROSIP_CONNECTOR_URL=http://localhost:3001
MICROSIP_API_KEY=tu-api-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Límites
ANALYTICS_USER_RATE_LIMIT=50
ANALYTICS_MAX_COST_PER_USER_DAY=10.00
```

### 2. Frontend (analytics-module)

Crea `.env.local`:

```env
VITE_API_URL=http://localhost:3001
```

### 3. React Query Provider

Envuelve tu app con `QueryClientProvider`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

## 💻 Uso

### Opción 1: Dashboard Completo (Recomendado)

```tsx
import { AnalyticsDashboard } from '@analytics-module';

function MyPage() {
  return (
    <AnalyticsDashboard
      defaultCategory="sales"
      showHistory={true}
      showHealth={true}
    />
  );
}
```

### Opción 2: Componentes Individuales

```tsx
import {
  NaturalLanguageQuery,
  ResultsTable,
  InsightsCard,
  useAnalyticsQuery,
} from '@analytics-module';

function CustomAnalyticsPage() {
  const [result, setResult] = useState(null);

  return (
    <div>
      {/* Query input */}
      <NaturalLanguageQuery
        onResult={setResult}
        placeholder="¿Cuáles son los productos más vendidos?"
        showSuggestions={true}
      />

      {/* Results */}
      {result && (
        <>
          <ResultsTable result={result} showExport={true} />
          <InsightsCard result={result} />
        </>
      )}
    </div>
  );
}
```

### Opción 3: Hook Directo

```tsx
import { useAnalyticsQuery } from '@analytics-module';

function MyComponent() {
  const { mutate, data, isLoading, error } = useAnalyticsQuery();

  const handleQuery = () => {
    mutate({
      question: '¿Cuáles son los 10 productos más vendidos este mes?',
      includeInsights: true,
      format: 'json',
    });
  };

  return (
    <div>
      <button onClick={handleQuery} disabled={isLoading}>
        Consultar
      </button>

      {isLoading && <p>Analizando...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
```

## 📚 API de Componentes

### `<AnalyticsDashboard />`

Dashboard completo con todas las funcionalidades.

**Props:**
- `defaultCategory?: 'sales' | 'inventory' | 'products' | 'clients' | 'general'` - Categoría por defecto
- `showHistory?: boolean` - Mostrar panel de historial (default: true)
- `showHealth?: boolean` - Mostrar estado del sistema (default: true)

### `<NaturalLanguageQuery />`

Input principal para consultas en lenguaje natural.

**Props:**
- `onResult?: (result: AnalyticsResult) => void` - Callback cuando hay resultado
- `defaultCategory?: string` - Categoría de sugerencias por defecto
- `placeholder?: string` - Placeholder del input
- `showSuggestions?: boolean` - Mostrar sugerencias (default: true)

### `<ResultsTable />`

Tabla de resultados con paginación, ordenamiento y export.

**Props:**
- `result: AnalyticsResult` - Resultado de la query (requerido)
- `maxRows?: number` - Máximo de filas a mostrar (default: 100)
- `showExport?: boolean` - Botón de export a CSV (default: true)

### `<InsightsCard />`

Card con insights y recomendaciones generados por IA.

**Props:**
- `result: AnalyticsResult` - Resultado de la query (requerido)
- `className?: string` - Clases CSS adicionales

## 🎣 Hooks

### `useAnalyticsQuery()`

Hook principal para ejecutar queries.

```tsx
const { mutate, data, isLoading, error, reset } = useAnalyticsQuery();

mutate({
  question: 'Tu pregunta aquí',
  includeInsights: true,
  format: 'json'
});
```

**Returns:**
- `mutate(query)` - Función para ejecutar query
- `data` - Resultado de la query
- `isLoading` - Estado de carga
- `error` - Error si ocurrió
- `reset()` - Limpiar estado

### `useAnalyticsSuggestions(category?, limit?)`

Hook para obtener sugerencias de preguntas.

```tsx
const { data, isLoading } = useAnalyticsSuggestions('sales', 5);

// data.suggestions: Suggestion[]
```

### `useAnalyticsHistory(limit?, offset?)`

Hook para obtener historial de queries.

```tsx
const { data, refetch } = useAnalyticsHistory(20, 0);

// data.history: HistoryItem[]
// data.total: number
```

### `useAnalyticsHealth()`

Hook para verificar estado del servicio.

```tsx
const { data, isError } = useAnalyticsHealth();

// data.status: 'healthy' | 'degraded' | 'unhealthy'
// data.checks: { redis, openrouter, firebird, ... }
```

## 🔍 Ejemplos de Preguntas

### Ventas
- "¿Cuáles son los 10 productos más vendidos este mes?"
- "¿Qué cliente ha comprado más en el último año?"
- "Muéstrame las ventas totales por mes del 2024"

### Inventario
- "¿Qué productos tienen stock bajo?"
- "Dame el valor total del inventario actual"
- "¿Cuáles son los productos con mayor rotación?"

### Productos
- "Lista los 20 productos más caros"
- "¿Qué productos no se han vendido en 6 meses?"
- "Muéstrame productos con precio entre $100 y $500"

### Clientes
- "¿Cuántos clientes nuevos tenemos este mes?"
- "Muéstrame los clientes con mayor facturación"
- "¿Qué cliente tiene más órdenes pendientes?"

## 🛡️ Seguridad

El sistema implementa múltiples capas de seguridad:

1. **Validación AST**: Parser SQL valida estructura antes de ejecutar
2. **Whitelist de tablas**: Solo tablas permitidas
3. **Blacklist de keywords**: Bloquea DROP, DELETE, UPDATE, INSERT, etc.
4. **Solo SELECT**: Operaciones de lectura únicamente
5. **Rate limiting**: 50 queries/hora por usuario
6. **Cost tracking**: $10/día máximo por usuario
7. **Timeouts**: 30 segundos máximo por query
8. **Límite de filas**: Máximo 10,000 resultados

## ⚡ Performance

- **Caché de resultados**: 1 hora (Redis)
- **Caché de SQL**: 7 días (Redis)
- **Expected cache hit rate**: 70%+
- **Query timeout**: 30 segundos
- **Retry logic**: 2 reintentos en errores de red

## 🐛 Troubleshooting

### Error: "Rate limit exceeded"
**Solución**: Espera 1 hora o contacta al admin para aumentar límite

### Error: "Cost limit exceeded"
**Solución**: Se resetea cada 24 horas. Espera o contacta admin.

### Error: "Query timeout"
**Solución**: Simplifica tu pregunta o agrega filtros más específicos

### Error: "Network error"
**Solución**: Verifica que api-gateway y microsip-connector estén corriendo

### No aparecen sugerencias
**Solución**: Verifica que el endpoint `/api/analytics/suggestions` responda

## 📊 Estructura de Respuesta

```typescript
interface AnalyticsResult {
  success: boolean;
  sql?: string;                    // SQL generado
  explanation?: string;            // Explicación del SQL
  results?: any[];                 // Datos retornados
  insights?: string;               // Insights generados por IA
  visualization?: {                // Sugerencia de visualización
    type: 'bar' | 'line' | 'pie' | 'table';
    title: string;
    xAxis?: string;
    yAxis?: string;
  };
  metadata?: {
    model: string;                 // Modelo LLM usado
    tokensUsed: number;           // Tokens consumidos
    cached: boolean;              // Si vino de caché
    queryTime?: number;           // Tiempo de ejecución (ms)
    rowCount?: number;            // Número de resultados
  };
  error?: string;
}
```

## 🚀 Deployment

### Desarrollo

```bash
# Backend (api-gateway)
cd backend/api-gateway
npm run dev

# Backend (microsip-connector)
cd backend/microsip-connector
npm run dev

# Frontend (analytics-module)
cd apps/analytics-module
npm run dev
```

### Producción

1. Configurar Redis en producción
2. Configurar variables de entorno
3. Build del frontend: `npm run build`
4. Deploy con PM2, Docker o tu plataforma preferida

## 📝 Notas

- **Modelo recomendado**: `anthropic/claude-3.5-sonnet` para SQL generation
- **Modelo para insights**: `anthropic/claude-3-haiku` (más barato)
- **Costo aproximado**: $0.003-0.015 por 1000 tokens
- **Cache hit rate esperado**: 70%+ con uso normal

## 🤝 Contribuir

1. Fork el repo
2. Crea tu feature branch
3. Commit tus cambios
4. Push al branch
5. Crea un Pull Request

## 📄 Licencia

Propietario - AOVA/Embler

---

**¿Preguntas?** Contacta al equipo de desarrollo.
