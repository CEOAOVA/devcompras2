# 📊 Sistema de Análisis de Datos con LLM - DevCompras2

## Resumen Ejecutivo

Se ha implementado exitosamente un sistema de análisis de datos que permite hacer consultas en **lenguaje natural** sobre la base de datos Microsip/Firebird usando **Claude 3.5 Sonnet** para generar SQL automáticamente.

---

## ✅ Funcionalidades Implementadas

### 1. **LLM Analytics Service** ✅
**Archivo:** `src/services/llm-analytics.service.ts` (800+ líneas)

**Características:**
- ✅ Generación de SQL a partir de lenguaje natural usando Claude 3.5 Sonnet
- ✅ Validación de SQL con whitelist de tablas/operaciones
- ✅ Caché Redis (1 hora para resultados, 7 días para SQL)
- ✅ Rate limiting (50 queries/hora por usuario)
- ✅ Cost tracking ($10/día por usuario)
- ✅ Circuit breaker pattern
- ✅ Request deduplication
- ✅ Generación automática de insights con Claude Haiku
- ✅ Sugerencias de visualización (gráficas)
- ✅ Model fallback (Claude → GPT-4 → Llama 3)

### 2. **SQL Validator** ✅
**Archivo:** `src/utils/sql-validator.ts` (650+ líneas)

**Características:**
- ✅ AST parsing con node-sql-parser
- ✅ Whitelist de tablas: PRODUCTOS, VENTAS, CLIENTES, TIENDAS
- ✅ Blacklist de keywords peligrosos (DROP, DELETE, UPDATE, etc.)
- ✅ Validación de complejidad (max JOINs, subqueries, condiciones)
- ✅ Detección de SQL injection patterns
- ✅ Añade límites automáticos (FIRST 10000)
- ✅ Soporte para Firebird SQL syntax

### 3. **Analytics API Routes** ✅
**Archivo:** `src/routes/analytics.routes.ts` (550+ líneas)

**Endpoints:**
- ✅ `POST /api/analytics/query` - Consulta en lenguaje natural
- ✅ `GET /api/analytics/suggestions` - Preguntas sugeridas
- ✅ `GET /api/analytics/history` - Historial de consultas
- ✅ `GET /api/analytics/health` - Health check

### 4. **Seguridad** ✅
- ✅ Prevención de SQL injection (AST validation)
- ✅ Prevención de prompt injection (sanitización)
- ✅ Prevención de cache poisoning (integrity checks)
- ✅ Rate limiting por usuario e IP
- ✅ Cost limits por usuario/día
- ✅ Timeout handling (30s)
- ✅ Error handling robusto

### 5. **Base de Datos Schema** ✅
Configurado para trabajar con tablas:
- `PRODUCTOS` - Catálogo de productos (código, nombre, precio, stock)
- `VENTAS` - Transacciones de venta (fecha, cliente, total)
- `CLIENTES` - Información de clientes (RFC, email, teléfono)
- `TIENDAS` - Sucursales/tiendas (código, nombre, ciudad)

---

## 🚧 Pendiente de Implementación

### 1. **Integración con Microsip Connector** ⚠️
**Estado:** Parcialmente implementado (placeholder)

**Qué falta:**
```typescript
// Archivo: src/services/llm-analytics.service.ts
// Línea: ~450

private async executeQuery(sql: string): Promise<any[]> {
  // TODO: Integrar con el Firebird connector real

  // Opción 1: Usar el microsip-connector existente via HTTP
  const response = await fetch('http://localhost:8003/api/custom-query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.MICROSIP_API_KEY
    },
    body: JSON.stringify({ sql })
  });

  const data = await response.json();
  return data.results;

  // Opción 2: Conexión directa a Firebird (requiere librerías adicionales)
  // ... implementación directa
}
```

**Pasos para completar:**
1. Añadir endpoint `/api/custom-query` al microsip-connector
2. O crear cliente HTTP en llm-analytics.service.ts
3. Probar con queries reales
4. Actualizar nombres de tablas según esquema real de Microsip

### 2. **Descubrimiento de Schema Real** ⚠️
**Problema:** No se pudo conectar a Firebird (192.65.134.78:3050)

**Solución:**
```bash
# Cuando tengas acceso a la BD, ejecutar:
cd backend/microsip-connector
node test/list-tables.js    # Lista todas las tablas
node test/list-views.js     # Lista todas las vistas
node test/explore-table.js  # Explora estructura de tabla

# Actualizar DATABASE_SCHEMA en:
# backend/api-gateway/src/services/llm-analytics.service.ts
# Línea 140
```

### 3. **Componente Frontend** ⚠️
**Estado:** No iniciado

**Template propuesto:**
```tsx
// apps/analytics-module/src/components/NaturalLanguageQuery.tsx

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export function NaturalLanguageQuery() {
  const [question, setQuestion] = useState('');

  const { mutate, data, isLoading } = useMutation({
    mutationFn: async (q: string) => {
      const res = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      return res.json();
    }
  });

  return (
    <div className="analytics-query">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Pregunta sobre tus datos..."
        onKeyPress={(e) => e.key === 'Enter' && mutate(question)}
      />

      {isLoading && <Spinner />}

      {data?.results && (
        <ResultsTable data={data.results} />
      )}

      {data?.insights && (
        <InsightsCard insights={data.insights} />
      )}
    </div>
  );
}
```

---

## 📖 Guía de Uso

### Instalación

```bash
cd backend/api-gateway

# Instalar dependencias
npm install

# Verificar que node-sql-parser esté instalado
npm list node-sql-parser
```

### Configuración

**Archivo:** `.env`

```env
# OpenRouter API (para Claude 3.5 Sonnet)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_ANALYTICS_MODEL=anthropic/claude-3.5-sonnet
ANALYTICS_INSIGHTS_MODEL=anthropic/claude-3-haiku

# Rate Limiting
ANALYTICS_USER_RATE_LIMIT=50  # queries por hora
ANALYTICS_RATE_WINDOW_MS=3600000  # 1 hora

# Cost Tracking
ANALYTICS_MAX_COST_PER_USER_DAY=10.00  # dólares
ANALYTICS_COST_PER_1K_TOKENS=0.003

# Cache
ANALYTICS_RESULTS_CACHE_TTL=3600  # 1 hora
ANALYTICS_SQL_CACHE_TTL=604800  # 7 días

# Límites de Seguridad
ANALYTICS_MAX_QUESTION_LENGTH=500
ANALYTICS_MAX_QUERY_ROWS=10000
ANALYTICS_TIMEOUT_MS=30000

# Redis
REDIS_URL=redis://localhost:6379
```

### Uso de la API

#### 1. Consulta en Lenguaje Natural

```bash
curl -X POST http://localhost:3001/api/analytics/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "¿Cuáles son los 10 productos más vendidos este mes?",
    "includeInsights": true,
    "format": "json"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "sql": "SELECT FIRST 10 p.NOMBRE, SUM(v.CANTIDAD) as TOTAL_VENDIDO FROM PRODUCTOS p LEFT JOIN VENTAS v ON v.PRODUCTO_ID = p.ID WHERE v.FECHA >= '2024-01-01' GROUP BY p.NOMBRE ORDER BY TOTAL_VENDIDO DESC",
  "explanation": "Esta consulta obtiene los 10 productos con mayor volumen de ventas en el mes actual",
  "results": [
    {
      "NOMBRE": "Filtro de aire",
      "TOTAL_VENDIDO": 145
    },
    {
      "NOMBRE": "Aceite motor",
      "TOTAL_VENDIDO": 120
    }
  ],
  "insights": "Los filtros lideran las ventas con 145 unidades, representando el 28% del total. Se recomienda aumentar el stock de filtros antes de fin de mes debido a la alta demanda.",
  "visualization": {
    "type": "bar",
    "title": "Top 10 productos más vendidos",
    "xAxis": "NOMBRE",
    "yAxis": "TOTAL_VENDIDO"
  },
  "metadata": {
    "model": "anthropic/claude-3.5-sonnet",
    "tokensUsed": 450,
    "cached": false,
    "queryTime": 85,
    "rowCount": 10,
    "duration": 1250
  },
  "cached": false
}
```

#### 2. Obtener Sugerencias

```bash
curl http://localhost:3001/api/analytics/suggestions?category=sales&limit=5
```

**Respuesta:**
```json
{
  "suggestions": [
    {
      "question": "¿Cuáles son los 10 productos más vendidos este mes?",
      "category": "sales",
      "description": "Top productos por volumen de ventas",
      "complexity": "low"
    },
    {
      "question": "Muéstrame las ventas totales por sucursal del último trimestre",
      "category": "sales",
      "description": "Análisis de ventas por ubicación",
      "complexity": "medium"
    }
  ]
}
```

#### 3. Health Check

```bash
curl http://localhost:3001/api/analytics/health
```

**Respuesta:**
```json
{
  "status": "healthy",
  "checks": {
    "redis": true,
    "openrouter": true,
    "rateLimit": true,
    "circuitBreaker": true,
    "firebird": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 💡 Ejemplos de Preguntas

### Ventas

```
✅ "¿Cuáles productos se vendieron más en enero?"
✅ "Ventas totales por sucursal del último trimestre"
✅ "Compara las ventas de este mes vs el mes pasado"
✅ "¿Qué días de la semana vendemos más?"
✅ "Top 5 clientes por volumen de compra"
```

### Inventario

```
✅ "Productos con stock bajo y alta rotación"
✅ "¿Qué productos tienen stock por debajo del mínimo?"
✅ "Inventario valorizado por categoría"
✅ "Productos que no se han vendido en 90 días"
```

### Clientes

```
✅ "¿Quiénes son mis mejores 10 clientes?"
✅ "Clientes que no han comprado en 6 meses"
✅ "Distribución de clientes por ciudad"
```

### Análisis Avanzado

```
✅ "Tendencia de ventas de los últimos 6 meses"
✅ "Margen de ganancia promedio por categoría"
✅ "Productos con mayor rotación vs menor rotación"
✅ "Análisis ABC de productos"
```

---

## 🔒 Seguridad

### Validaciones Implementadas

#### 1. SQL Injection Prevention
```typescript
// Whitelist de tablas
ALLOWED_TABLES = ['PRODUCTOS', 'VENTAS', 'CLIENTES', 'TIENDAS']

// Blacklist de keywords
BLOCKED_KEYWORDS = ['DROP', 'DELETE', 'UPDATE', 'INSERT', ...]

// AST Parsing
validateSQL(sql) {
  const ast = parser.astify(sql);
  if (ast.type !== 'select') throw Error('Only SELECT allowed');
  // ... más validaciones
}
```

#### 2. Prompt Injection Prevention
```typescript
sanitizeQuestion(question) {
  // Detectar patrones de inyección
  const patterns = [
    /ignore\s+previous\s+instructions/i,
    /system\s*:/i,
    /you\s+are\s+now/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(question)) {
      throw new InvalidInputError('Unsafe content');
    }
  }
}
```

#### 3. Rate Limiting
```typescript
// 50 queries por hora por usuario
USER_RATE_LIMIT = 50
RATE_WINDOW_MS = 3600000

// Cost limiting
MAX_COST_PER_USER_DAY = $10.00
```

---

## 📊 Métricas y Monitoreo

### Logs Estructurados

```typescript
fastify.log.info({
  requestId: '123abc',
  userId: 'user_456',
  question: '¿Cuáles productos...',
  cached: false,
  duration: 1250,
  tokensUsed: 450,
  cost: 0.00135
}, '📊 Analytics query completed');
```

### Métricas Clave

- **Cache Hit Rate:** % de queries servidas desde caché
- **Average Query Time:** Tiempo promedio de ejecución
- **Token Usage:** Tokens consumidos por día/usuario
- **Error Rate:** % de queries que fallan
- **Cost per Query:** Costo promedio por query

---

## 🚀 Próximos Pasos

### Corto Plazo (1 semana)

1. **✅ Completado:** LLM Analytics Service
2. **✅ Completado:** SQL Validator
3. **✅ Completado:** Analytics Routes
4. **⚠️ Pendiente:** Integrar con Firebird connector real
5. **⚠️ Pendiente:** Crear componente frontend React

### Mediano Plazo (2-4 semanas)

1. **Conversaciones Multi-turno:**
   - Mantener contexto de queries anteriores
   - Permitir refinamiento de preguntas

2. **Exportación:**
   - Excel con formato
   - PDF con gráficas
   - Scheduled queries

3. **Visualizaciones Avanzadas:**
   - Integración con Recharts
   - Dashboards personalizables
   - Recomendaciones automáticas de charts

### Largo Plazo (1-3 meses)

1. **Machine Learning Integration:**
   - Predicción de demanda automática
   - Detección de anomalías
   - Clustering de productos/clientes

2. **Natural Language to Dashboard:**
   - "Crea un dashboard de ventas para la región Norte"
   - Generación automática de visualizaciones

3. **Multi-tenancy:**
   - Soporte para múltiples empresas
   - Isolation de datos
   - Custom schemas por tenant

---

## 📝 Notas Técnicas

### Limitaciones Conocidas

1. **Firebird Connection:** Mock data actualmente (pendiente integración real)
2. **Schema Discovery:** Nombres de tablas genéricos (actualizar cuando haya acceso a BD)
3. **Frontend:** No implementado aún
4. **History Storage:** Pendiente persistencia en DB

### Optimizaciones Futuras

1. **Query Planning:** Analizar query antes de ejecutar para estimar cost
2. **Semantic Cache:** Usar embeddings para cache semántico (queries similares)
3. **Auto-indexing:** Sugerir índices basado en queries frecuentes
4. **Query Optimization:** Reescribir queries para mejor performance

---

## 🆘 Troubleshooting

### Error: "Rate limit exceeded"

**Causa:** Usuario excedió 50 queries/hora

**Solución:**
```env
# Aumentar límite en .env
ANALYTICS_USER_RATE_LIMIT=100
```

### Error: "Cost limit exceeded"

**Causa:** Usuario gastó más de $10/día en tokens

**Solución:**
```env
# Aumentar budget en .env
ANALYTICS_MAX_COST_PER_USER_DAY=20.00
```

### Error: "SQL validation failed"

**Causa:** Query generada no es segura

**Solución:**
- Revisar pregunta del usuario
- Verificar que tablas existan en whitelist
- Check logs para ver SQL generado

### Error: "Firebird connection failed"

**Causa:** No hay integración real con Firebird

**Solución:**
1. Implementar `executeQuery()` en llm-analytics.service.ts
2. O usar microsip-connector como proxy
3. Verificar credenciales de Firebird

---

## 📚 Referencias

- **OpenRouter Docs:** https://openrouter.ai/docs
- **Claude 3.5 Sonnet:** https://docs.anthropic.com/claude/docs
- **node-sql-parser:** https://github.com/taozhi8833998/node-sql-parser
- **Firebird SQL:** https://firebirdsql.org/file/documentation/
- **Fastify:** https://www.fastify.io/docs/latest/
- **Zod:** https://zod.dev/

---

## 👥 Contacto y Soporte

Para preguntas o issues:
- Revisar logs en `backend/api-gateway/logs/`
- Health check: `GET /api/analytics/health`
- Email: [tu-email]

---

**Estado:** ✅ Backend completado (95%) | ⚠️ Frontend pendiente (0%) | ⚠️ Firebird integration pendiente

**Última actualización:** 2024-01-15
