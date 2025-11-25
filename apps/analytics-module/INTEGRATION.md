# Guía de Integración - Analytics Module

Esta guía explica cómo integrar el módulo de Analytics con LLM en tu aplicación principal.

## 📋 Pre-requisitos

1. ✅ Backend `api-gateway` corriendo en puerto 3001
2. ✅ Backend `microsip-connector` corriendo en puerto 3002
3. ✅ Redis corriendo (localhost:6379)
4. ✅ OpenRouter API Key configurada
5. ✅ React Query instalado en la app principal

## 🔌 Integración Paso a Paso

### 1. Instalar Dependencias

Si no están instaladas en tu app principal:

```bash
npm install @tanstack/react-query lucide-react
```

### 2. Configurar React Query Provider

En tu archivo raíz (por ejemplo `main.tsx` o `App.tsx`):

```tsx
// main.tsx o App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Tu app aquí */}
      <YourRoutes />

      {/* Devtools solo en desarrollo */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

### 3. Agregar Ruta de Analytics

#### Opción A: React Router (v6+)

```tsx
// routes.tsx
import { AnalyticsDashboard } from '@analytics-module';

export const routes = [
  // ... tus otras rutas
  {
    path: '/analytics',
    element: <AnalyticsDashboard />,
  },
];
```

#### Opción B: Manual

```tsx
// App.tsx
import { AnalyticsDashboard } from '@analytics-module';

function App() {
  const [currentView, setCurrentView] = useState('home');

  return (
    <div>
      <Navigation onNavigate={setCurrentView} />

      {currentView === 'analytics' && <AnalyticsDashboard />}
      {currentView === 'home' && <Home />}
      {/* ... otras vistas */}
    </div>
  );
}
```

### 4. Agregar al Menú de Navegación

```tsx
// Navigation.tsx
import { BarChart3 } from 'lucide-react';

const navigationItems = [
  { name: 'Inicio', path: '/', icon: Home },
  { name: 'Productos', path: '/productos', icon: Package },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 }, // ← NUEVO
  { name: 'Configuración', path: '/settings', icon: Settings },
];
```

### 5. Configurar Variables de Entorno

Crea o actualiza `.env.local`:

```env
# API Gateway URL
VITE_API_URL=http://localhost:3001

# Opcional: Habilitar logs de desarrollo
VITE_DEBUG=true
```

## 🎨 Personalización

### Tema y Estilos

El módulo usa Tailwind CSS. Si quieres personalizar colores:

```tsx
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Sobrescribe colores purple-* si quieres usar tu brand
        'brand': {
          50: '#faf5ff',
          100: '#f3e8ff',
          // ... más tonos
          600: '#9333ea', // Color principal
          700: '#7e22ce',
        }
      }
    }
  }
}
```

Luego reemplaza `purple-` por `brand-` en los componentes.

### Categoría por Defecto

```tsx
<AnalyticsDashboard
  defaultCategory="sales"  // ← Cambia según tu caso de uso
  showHistory={true}
  showHealth={true}
/>
```

### Ocultar Elementos

```tsx
<AnalyticsDashboard
  showHistory={false}    // Ocultar historial
  showHealth={false}     // Ocultar health check
/>
```

## 🔐 Autenticación (Opcional)

Si tu app tiene autenticación, puedes pasar el user ID al hook:

```tsx
// Modifica useAnalytics.ts si necesitas pasar auth headers
const { mutate } = useAnalyticsQuery();

// Opción 1: Agregar headers en el hook
mutationFn: async (query: AnalyticsQuery) => {
  const response = await fetch(`${API_BASE_URL}/api/analytics/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`, // ← Agrega tu token
    },
    body: JSON.stringify(query),
  });
  return response.json();
}
```

O mejor aún, usa un HTTP client global:

```tsx
// api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor para agregar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## 📊 Uso Avanzado

### 1. Dashboard Personalizado con Widgets

```tsx
import {
  NaturalLanguageQuery,
  ResultsTable,
  InsightsCard,
  useAnalyticsQuery,
} from '@analytics-module';

function CustomDashboard() {
  const [salesResult, setSalesResult] = useState(null);
  const [inventoryResult, setInventoryResult] = useState(null);

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Widget de Ventas */}
      <div>
        <h2>Análisis de Ventas</h2>
        <NaturalLanguageQuery
          defaultCategory="sales"
          onResult={setSalesResult}
          showSuggestions={true}
        />
        {salesResult && <ResultsTable result={salesResult} />}
      </div>

      {/* Widget de Inventario */}
      <div>
        <h2>Análisis de Inventario</h2>
        <NaturalLanguageQuery
          defaultCategory="inventory"
          onResult={setInventoryResult}
          showSuggestions={true}
        />
        {inventoryResult && <ResultsTable result={inventoryResult} />}
      </div>
    </div>
  );
}
```

### 2. Queries Programáticas

```tsx
import { useAnalyticsQuery } from '@analytics-module';

function AutoReports() {
  const { mutate, data } = useAnalyticsQuery();

  useEffect(() => {
    // Ejecutar query automáticamente al montar
    mutate({
      question: '¿Cuáles son los productos con stock bajo?',
      includeInsights: true,
    });
  }, []);

  return (
    <div>
      <h2>Reporte Automático: Stock Bajo</h2>
      {data && <ResultsTable result={data} />}
    </div>
  );
}
```

### 3. Export Programático

```tsx
import { useAnalyticsQuery } from '@analytics-module';

function ExportButton() {
  const { mutate, data } = useAnalyticsQuery();

  const handleExport = async () => {
    mutate(
      {
        question: 'Dame todos los productos',
        format: 'csv', // ← Especifica formato
      },
      {
        onSuccess: (result) => {
          // Descarga automáticamente
          const csvContent = convertToCSV(result.results);
          downloadCSV(csvContent, 'productos.csv');
        },
      }
    );
  };

  return <button onClick={handleExport}>Exportar Productos</button>;
}
```

## 🧪 Testing de Integración

### 1. Verificar Backend

```bash
# Health check
curl http://localhost:3001/api/analytics/health

# Test query
curl -X POST http://localhost:3001/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Dame los primeros 5 productos",
    "includeInsights": false
  }'
```

### 2. Verificar Frontend

```tsx
// TestAnalytics.tsx
import { useAnalyticsHealth } from '@analytics-module';

function TestAnalytics() {
  const { data, isError, isLoading } = useAnalyticsHealth();

  if (isLoading) return <div>Verificando...</div>;
  if (isError) return <div>❌ Error: Backend no disponible</div>;
  if (data?.status === 'healthy') return <div>✅ Todo funcionando</div>;

  return (
    <div>
      <h3>Estado de Servicios:</h3>
      <ul>
        <li>Redis: {data?.checks.redis ? '✅' : '❌'}</li>
        <li>OpenRouter: {data?.checks.openrouter ? '✅' : '❌'}</li>
        <li>Firebird: {data?.checks.firebird ? '✅' : '❌'}</li>
      </ul>
    </div>
  );
}
```

## 🚨 Troubleshooting

### Error: "Cannot find module '@analytics-module'"

**Solución**: Verifica el path alias en tu `tsconfig.json` o `vite.config.ts`:

```typescript
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@analytics-module': path.resolve(__dirname, './apps/analytics-module/src'),
    },
  },
});
```

### Error: CORS

**Solución**: En `api-gateway`, verifica configuración CORS:

```typescript
// api-gateway/src/server.ts
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // ← Agrega tu frontend
  credentials: true,
}));
```

### Analytics no carga

1. ✅ Verifica que `api-gateway` esté corriendo
2. ✅ Verifica `VITE_API_URL` en `.env.local`
3. ✅ Abre DevTools → Network y busca errores
4. ✅ Verifica React Query DevTools

### Queries muy lentas

1. ✅ Verifica que Redis esté corriendo
2. ✅ Mira logs de `api-gateway` para ver cache hits
3. ✅ Considera aumentar `ANALYTICS_RESULTS_CACHE_TTL`

## 📱 Responsive Design

Los componentes son responsive por defecto. Para móviles:

```tsx
// En móvil, oculta el historial
import { useMediaQuery } from '@/hooks/useMediaQuery';

function ResponsiveAnalytics() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <AnalyticsDashboard
      showHistory={!isMobile}  // ← Ocultar en móvil
      showHealth={true}
    />
  );
}
```

## ✅ Checklist de Integración

- [ ] React Query instalado y configurado
- [ ] `@analytics-module` importable (alias configurado)
- [ ] Ruta `/analytics` agregada
- [ ] Ítem en menú de navegación
- [ ] `.env.local` con `VITE_API_URL`
- [ ] Backend `api-gateway` corriendo
- [ ] Backend `microsip-connector` corriendo
- [ ] Redis corriendo
- [ ] OpenRouter API Key configurada
- [ ] Health check pasando (`/api/analytics/health`)
- [ ] Query de prueba funciona

## 🎉 ¡Listo!

Ahora puedes navegar a `/analytics` y empezar a hacer consultas en lenguaje natural.

### Ejemplos para probar:

1. "¿Cuáles son los 10 productos más caros?"
2. "Dame el total de ventas del mes actual"
3. "¿Qué clientes han comprado más de 5 veces?"
4. "Muéstrame productos con stock menor a 10 unidades"

---

**¿Problemas?** Revisa la sección de Troubleshooting o contacta al equipo de desarrollo.
