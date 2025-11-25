# GUÍA RÁPIDA DE INICIO - EMBLER
## Configuración y Setup en 30 minutos

**Última Actualización:** 31 de Octubre de 2025

---

## PRERREQUISITOS

Asegúrate de tener instalados:

- **Node.js:** 18+ ([nodejs.org](https://nodejs.org))
- **npm:** 9+ (viene con Node)
- **Python:** 3.11+ ([python.org](https://python.org))
- **Docker Desktop:** ([docker.com](https://docker.com))
- **Git:** ([git-scm.com](https://git-scm.com))
- **Supabase CLI:** `npm install -g supabase`

**Verificar instalación:**
```bash
node --version    # v18.x.x o superior
npm --version     # 9.x.x o superior
python --version  # 3.11+
docker --version  # 20.x.x o superior
```

---

## PASO 1: Clonar y Preparar el Proyecto (5 min)

### 1.1 Clonar Repositorio
```bash
cd "C:\Users\Moises\Documents\TRABAJO\aova\embler\devcompras2\emblerecosistema"
cd dev-optimizacionembler
```

### 1.2 Instalar Dependencias
```bash
# En la raíz del proyecto
npm install

# Esto instala dependencias para todos los workspaces:
# - apps/shell-app
# - apps/analytics-module
# - backend/api-gateway
# - mcp-servers
```

**Tiempo esperado:** 2-3 minutos (depende conexión internet)

---

## PASO 2: Configurar Variables de Entorno (10 min)

### 2.1 Crear archivo .env
```bash
# En raíz del proyecto
cp .env.example .env
```

### 2.2 Obtener Credenciales de Supabase

1. Ve a [app.supabase.com](https://app.supabase.com)
2. Crea proyecto nuevo (o usa existente):
   - Nombre: `embler-dev`
   - Región: La más cercana a ti
3. Ve a **Settings** → **API**
4. Copia:
   ```
   Project URL → SUPABASE_URL
   Anon Key → SUPABASE_ANON_KEY
   Service Role Key → SUPABASE_SERVICE_ROLE_KEY
   JWT Secret → SUPABASE_JWT_SECRET
   ```

### 2.3 Editar .env

Abre `.env` en tu editor favorito y completa:

```bash
# SUPABASE (requerido)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...xxxxx
SUPABASE_JWT_SECRET=your-jwt-secret-xxxxx
SUPABASE_SCHEMA=embler

# DATABASE (para desarrollo local)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/embler_db?schema=embler
REDIS_URL=redis://localhost:6379

# JWT (generar: openssl rand -hex 32)
JWT_SECRET=your-random-32-char-secret-here

# API (para desarrollo)
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
ML_API_URL=http://localhost:8001

# MCP SERVERS
MCP_SUPABASE_ENABLED=true
MCP_FILESYSTEM_ENABLED=true
MCP_ANALYTICS_ENABLED=true

# OPCIONAL (para futuro)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_MAPS_API_KEY=AIzaSy...
```

### 2.4 Generar JWT_SECRET Fuerte

```bash
# En PowerShell (Windows)
[System.Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# En Bash (Linux/Mac)
openssl rand -hex 32
```

Reemplaza el valor en `.env`

---

## PASO 3: Configurar Base de Datos (10 min)

### 3.1 Ejecutar Migraciones en Supabase

1. Ve a [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (lado izquierdo)
4. Crea nueva query
5. Copia y pega contenido de `database/migrations/001_create_genai_tables.sql`
6. Haz click **Run**

Repite para:
- `002_setup_storage.sql`
- `003_rag_multimodal_secure.sql`
- `004_auth_system.sql`

### 3.2 Verificar Configuración

Ejecuta script de validación:
```bash
node test-embler-connection.js
```

Debería ver ✅ en cada validación

---

## PASO 4: Iniciar con Docker (5 min) - OPCIÓN A

### 4.1 Usando Docker Compose

```bash
# En la raíz del proyecto
npm run docker:dev
```

Esto iniciará:
- PostgreSQL (Puerto 5432)
- Redis (Puerto 6379)
- API Gateway (Puerto 3001)
- Shell App (Puerto 3000)
- Analytics Module (Puerto 3002)
- Logistics Module (Puerto 3003)
- ML Service (Puerto 8001)
- Nginx (Puerto 80)
- Adminer (Puerto 8080)

**Espera 60-90 segundos** para que todos los servicios se inicien.

### 4.2 Acceder a Aplicación

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **API:** [http://localhost:3001](http://localhost:3001)
- **ML Service:** [http://localhost:8001/docs](http://localhost:8001/docs)
- **Adminer (BD):** [http://localhost:8080](http://localhost:8080)

---

## PASO 4 ALTERNATIVA: Desarrollo Local (5 min) - OPCIÓN B

Si prefieres no usar Docker:

### 4.1 Terminal 1 - Base de Datos
```bash
# Asume PostgreSQL y Redis corriendo localmente
# O configura en Supabase si es remota
```

### 4.2 Terminal 2 - API Gateway
```bash
cd backend/api-gateway
npm run dev

# Espera a ver: "[xxx] Server listening at http://0.0.0.0:3001"
```

### 4.3 Terminal 3 - ML Service
```bash
cd ml-models

# Crear entorno virtual Python
python -m venv venv

# Activar venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor
uvicorn src.main:app --reload --port 8001
```

### 4.4 Terminal 4 - Frontend Shell
```bash
cd apps/shell-app
npm run dev

# Espera a ver: "webpack X.X.X compiled..."
# Abre http://localhost:3000
```

### 4.5 Terminal 5 - Analytics Module (Opcional)
```bash
cd apps/analytics-module
npm run dev

# Debería estar disponible en http://localhost:3002
```

---

## PASO 5: Verificar Funcionamiento (5 min)

### 5.1 Frontend
1. Abre [http://localhost:3000](http://localhost:3000)
2. Deberías ver página de login o dashboard
3. Si error, abre DevTools (F12) y verifica console

### 5.2 API
```bash
# En otra terminal, prueba endpoint
curl -X GET http://localhost:3001/health

# Debería retornar:
# {"status":"ok"}
```

### 5.3 Base de Datos
```bash
node test-embler-connection.js

# Debería mostrar ✅ para todas las validaciones
```

### 5.4 ML Service
1. Abre [http://localhost:8001/docs](http://localhost:8001/docs)
2. Verás Swagger UI con endpoints disponibles

---

## PROBLEMAS COMUNES Y SOLUCIONES

### ❌ "Port already in use"
```bash
# Encontrar qué está usando el puerto
# Windows:
netstat -ano | findstr :3000

# Matar el proceso
taskkill /PID <pid> /F

# O cambiar puerto en .env
PORT=3001  # cambiar a 3002, etc.
```

### ❌ "Database connection refused"
```bash
# Verificar que PostgreSQL está corriendo
psql -U postgres -h localhost

# Si no está en Docker, iniciarlo:
docker-compose up -d postgres redis
```

### ❌ "SUPABASE_URL is not set"
```bash
# Asegurate de:
1. Crear archivo .env (no .env.local)
2. Estar en raíz del proyecto
3. Haber copiado valores correctos
4. Reiniciar terminal para cargar .env
```

### ❌ "Cannot find module '@embler/...'"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
npm run build
```

### ❌ "ML Service 502 Bad Gateway"
```bash
# Python venv no activado:
cd ml-models
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

---

## COMANDOS ÚTILES

### Desarrollo

```bash
# Todos los servicios en paralelo
npm run dev

# Solo frontend
npm run dev:shell

# Solo analytics
npm run dev:analytics

# Solo API
npm run dev:api

# Build para producción
npm run build

# Verificar tipos (TypeScript)
npm run typecheck

# Linting
npm run lint

# Tests
npm run test
```

### Docker

```bash
# Iniciar desarrollo
npm run docker:dev

# Parar servicios
docker-compose down

# Ver logs
docker-compose logs -f api-gateway

# Acceder a contenedor
docker-compose exec api-gateway bash

# Limpiar todo (cuidado)
docker-compose down -v  # Elimina volúmenes también
```

### Base de Datos

```bash
# Acceder a PostgreSQL
psql $DATABASE_URL

# Ejecutar migraciones (si eres dev)
cd backend/api-gateway
npm run prisma migrate dev

# Ver estado de BD
npm run prisma studio
```

---

## FLUJO DE TRABAJO TÍPICO

### 1. Hacer cambios
```bash
# En tu editor favorito
# - Modifica archivos
# - Hot reload automático
```

### 2. Verificar tipos
```bash
npm run typecheck
```

### 3. Verificar código
```bash
npm run lint
```

### 4. Probar en navegador
```bash
# Abre http://localhost:3000
# O tu puerto configurado
```

### 5. Comitear cambios
```bash
git add .
git commit -m "feat: descripción de cambio"
git push
```

---

## ESTRUCTURA DE CARPETAS PRINCIPALES

```
dev-optimizacionembler/
├── apps/
│   ├── shell-app/              # Frontend principal
│   └── analytics-module/       # Módulo analítica
├── backend/
│   └── api-gateway/            # Servidor principal
├── ml-models/                  # ML service
├── database/
│   └── migrations/             # Migraciones SQL
├── docker-compose.dev.yml      # Orquestación
├── package.json                # Root workspace
├── .env                        # Configuración (crear)
└── README.md                   # Documentación
```

---

## CÓMO USAR CADA MODULO

### Shell App (Puerto 3000)

**Propósito:** Aplicación principal, orquesta otros módulos

```bash
# Navega a http://localhost:3000

Estructura:
├─ /dashboard          → Dashboard principal
├─ /analytics          → Micro-frontend analytics
└─ /logistics          → Micro-frontend logística
```

### Analytics Module (Puerto 3002)

**Propósito:** Analítica y predicción de demanda

Acceso desde Shell App → /analytics

### API Gateway (Puerto 3001)

**Propósito:** Backend REST API

```bash
# Ejemplos de uso:

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass"}'

# Obtener inventario
curl -X GET http://localhost:3001/inventory \
  -H "Authorization: Bearer <token>"

# Crear predicción
curl -X POST http://localhost:3001/predictions/train \
  -F "file=@dataset.csv"
```

### ML Service (Puerto 8001)

**Propósito:** Modelos de machine learning

```bash
# Ver Swagger UI:
# http://localhost:8001/docs

# Endpoints principales:
POST   /api/models/train          # Entrenar modelo
POST   /api/predictions/demand    # Predicciones
GET    /api/predictions/recent    # Últimas predicciones
```

---

## PRÓXIMOS PASOS DESPUÉS DEL SETUP

### 1. Explorar Código
```bash
# Lee los archivos principales
cat backend/api-gateway/src/server.ts
cat apps/shell-app/src/App.tsx
cat ml-models/src/demand_prediction.py
```

### 2. Crear Usuario de Prueba
```bash
# Supabase Admin Panel → Authentication
# O vía API:
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"SecurePassword123!"
  }'
```

### 3. Subir Datos de Prueba
1. Prepara CSV con columnas: fecha, numero_parte, cantidad_vendida
2. Carga en dashboard
3. Sistema entrena modelo automáticamente
4. Genera predicciones

### 4. Explorar Dashboard
- Navega a diferentes secciones
- Prueba filtros
- Genera reportes
- Chatea con datos

---

## DOCUMENTACIÓN ADICIONAL

Más detalles en estos archivos:

- **REPORTE_COMPLETO_PROYECTO.md** → Análisis exhaustivo de proyecto
- **ARQUITECTURA_DETALLADA.md** → Diagramas y arquitectura técnica
- **RESUMEN_EJECUTIVO.md** → Visión general ejecutiva
- **README.md** → Setup original
- **database/README.md** → Documentación de BD

---

## SOPORTE Y CONTACTO

Si tienes problemas:

1. **Revisa logs:**
   ```bash
   docker-compose logs -f
   ```

2. **Verifica .env:**
   ```bash
   # Asegúrate de que existe y tiene valores
   cat .env
   ```

3. **Reinicia servicios:**
   ```bash
   # Docker
   docker-compose restart
   
   # Local
   # Mata y reinicia terminales
   ```

4. **Limpia cachés:**
   ```bash
   rm -rf node_modules dist .next
   npm install
   ```

---

## CHECKLIST FINAL

- [ ] Node 18+ instalado
- [ ] Python 3.11+ instalado
- [ ] Docker Desktop corriendo
- [ ] .env creado con credenciales Supabase
- [ ] Migraciones SQL ejecutadas
- [ ] Docker Compose iniciado (o servicios locales)
- [ ] http://localhost:3000 accesible
- [ ] test-embler-connection.js retorna ✅
- [ ] Puedo navegar el dashboard
- [ ] API responde a curl

**Si todos están ✅, ¡estás listo para desarrollar!**

---

## RESUMEN RÁPIDO

```bash
# 1. Preparar
git clone <repo>
cp .env.example .env
# (editar .env con credenciales Supabase)
npm install

# 2. BD
# (ejecutar migraciones en Supabase)
node test-embler-connection.js

# 3. Ejecutar
npm run docker:dev
# O localmente:
npm run dev

# 4. Navegar
http://localhost:3000
```

**¡Listo!** 🚀

---

**Última Actualización:** 31 de Octubre de 2025  
**Versión de Guía:** 1.0.0  
**Próxima Actualización:** Cuando se agreguen nuevas características
