# EMBLER - Plataforma Integral de Gestión de Inventario y Logística Inteligente

![EMBLER Logo](./docs/assets/logo.png)

## 🚀 Descripción del Proyecto

EMBLER es una plataforma integral que combina **analítica predictiva** y **gestión logística inteligente** para empresas de refacciones y distribución. Utiliza inteligencia artificial para predecir demanda y optimizar rutas de entrega en tiempo real.

### 🎯 **Módulos Principales**

1. **Módulo de Analítica Descriptiva**
   - Dashboard ejecutivo con KPIs en tiempo real
   - Análisis de ventas, inventario y clientes con NLP
   - Predicción de demanda con Machine Learning
   - Sugerencias automáticas de órdenes de compra

2. **Módulo de Logística Inteligente**
   - Gestión de rutas optimizadas en tiempo real
   - Tracking de repartidores con GPS
   - Vista para almacenistas y repartidores
   - Integración con Google Maps para tiempos estimados

## 🏗️ **Arquitectura Técnica**

### **Frontend - Micro-Frontend Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Shell App     │    │ Analytics Module│    │Logistics Module │
│   (Host)        │◄──►│ (Remote)        │    │ (Remote)        │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Stack Frontend:**
- React 18 + TypeScript
- Module Federation (Webpack 5)
- TailwindCSS + Shadcn/UI
- React Query + Zustand
- React Router 6

### **Backend - Monolito Modular**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │◄──►│  PostgreSQL     │    │     Redis       │
│   (Fastify)     │    │  (Supabase)     │    │   (Cache)       │
│   Port: 3001    │    │   Port: 5432    │    │   Port: 6379    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐
│   ML Service    │
│   (FastAPI)     │
│   Port: 8001    │
└─────────────────┘
```

**Stack Backend:**
- Node.js + Fastify + TypeScript
- Python + FastAPI (ML)
- Prisma ORM
- Supabase (PostgreSQL)
- Redis (caché/sesiones)

## 📋 **Características Técnicas**

### **🔧 Funcionalidades Core**
- ✅ Autenticación JWT con roles granulares
- ✅ WebSockets para actualizaciones en tiempo real
- ✅ Sistema de notificaciones push
- ✅ Chat interno entre administradores y repartidores
- ✅ Capacidades offline para repartidores
- ✅ Exportación de reportes (Excel, PDF, CSV)
- ✅ Dashboards personalizables por usuario
- ✅ Integración con APIs de Google Maps
- ✅ Manejo de múltiples almacenes y sucursales

### **🤖 Machine Learning**
- ✅ Predicción de demanda con Random Forest y Gradient Boosting
- ✅ Análisis de tendencias y estacionalidad
- ✅ Detección de productos con stock crítico
- ✅ Optimización de rutas de entrega
- ✅ Prevención de overfitting con validación cruzada

### **📊 KPIs y Métricas**
#### **Analítica:**
- Precisión de predicción de demanda (>85%)
- Tiempo de rotación de inventario
- Productos con stock crítico
- Eficiencia de órdenes de compra

#### **Logística:**
- Tiempo promedio de entrega
- Entregas completadas vs fallidas
- Utilización de vehículos (%)
- Costo por entrega
- Satisfacción del cliente
- Incidencias por ruta

## 🚀 **Inicio Rápido**

### **Prerrequisitos**
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Git

### **1. Clonar el Repositorio**
```bash
git clone https://github.com/tu-empresa/embler-platform.git
cd embler-platform
```

### **2. Configurar Variables de Entorno**
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:
```env
# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anonima

# Google Maps
GOOGLE_MAPS_API_KEY=tu-clave-de-google-maps

# Base de datos
DATABASE_URL=postgresql://embler_user:embler_password@localhost:5432/embler_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=tu-super-secreto-jwt
```

### **3. Desarrollo con Docker (Recomendado)**
```bash
# Instalar dependencias
npm run setup

# Iniciar todos los servicios en desarrollo
npm run docker:dev

# O iniciar servicios individuales
npm run dev
```

### **4. Desarrollo Local**
```bash
# Backend
cd backend/api-gateway
npm install
npm run dev

# ML Service
cd ml-models
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8001

# Frontend Shell
cd apps/shell-app
npm install
npm run dev

# Analytics Module
cd apps/analytics-module
npm install
npm run dev

# Logistics Module  
cd apps/logistics-module
npm install
npm run dev
```

## 📁 **Estructura del Proyecto**

```
EMBLER-PLATFORM/
├── 📁 apps/                          # Aplicaciones Frontend
│   ├── 📁 shell-app/                 # Host principal (Module Federation)
│   ├── 📁 analytics-module/          # Micro-frontend de Analítica
│   ├── 📁 logistics-module/          # Micro-frontend de Logística
│   └── 📁 shared-components/         # Componentes compartidos
├── 📁 backend/                       # Servicios Backend
│   ├── 📁 api-gateway/              # Gateway principal (Fastify)
│   ├── 📁 analytics-service/        # Servicio de analítica
│   ├── 📁 logistics-service/        # Servicio de logística
│   ├── 📁 auth-service/             # Autenticación y autorización
│   ├── 📁 notification-service/     # Servicio de notificaciones
│   └── 📁 shared/                   # Utilidades compartidas
├── 📁 ml-models/                    # Modelos de Machine Learning
│   ├── 📁 src/                      # Código fuente Python
│   ├── 📁 models/                   # Modelos entrenados
│   ├── 📁 data/                     # Datasets y CSVs
│   └── requirements.txt             # Dependencias Python
├── 📁 mobile-apps/                  # Aplicaciones móviles (PWA)
│   ├── 📁 delivery-app/             # App para repartidores
│   └── 📁 warehouse-app/            # App para almacenistas
├── 📁 infrastructure/               # Configuración de infraestructura
│   ├── 📁 docker/                   # Dockerfiles
│   ├── 📁 nginx/                    # Configuración Nginx
│   ├── 📁 kubernetes/               # Manifiestos K8s
│   └── 📁 terraform/                # Infraestructura como código
├── 📁 database/                     # Scripts y migraciones de BD
│   ├── 📁 migrations/               # Migraciones Prisma
│   ├── 📁 seeds/                    # Datos de prueba
│   └── init.sql                     # Script inicial
├── 📁 data/                         # Datasets y archivos CSV
│   ├── 📁 samples/                  # Datos de ejemplo
│   ├── 📁 exports/                  # Exportaciones
│   └── 📁 uploads/                  # Archivos subidos
├── 📁 docs/                         # Documentación
│   ├── 📁 api/                      # Documentación de APIs
│   ├── 📁 guides/                   # Guías de uso
│   └── 📁 assets/                   # Imágenes y recursos
├── 📄 package.json                  # Configuración del workspace
├── 📄 docker-compose.dev.yml        # Docker Compose desarrollo
├── 📄 docker-compose.prod.yml       # Docker Compose producción
├── 📄 .env.example                  # Variables de entorno ejemplo
└── 📄 README.md                     # Este archivo
```

## 🔗 **URLs de Desarrollo**

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Shell App | http://localhost:3000 | Aplicación principal |
| API Gateway | http://localhost:3001 | Backend principal |
| Analytics Module | http://localhost:3002 | Módulo de analítica |
| Logistics Module | http://localhost:3003 | Módulo de logística |
| ML Service | http://localhost:8001 | Servicio de ML |
| Adminer | http://localhost:8080 | Gestión de BD |

## 📊 **Flujo de Datos**

### **1. Carga de Datos**
```
CSV Files → API Gateway → Processing → Supabase → ML Training
```

### **2. Predicción de Demanda**
```
Historical Data → Feature Engineering → ML Model → Predictions → Dashboard
```

### **3. Gestión Logística**
```
Orders → Route Optimization → Driver Assignment → Real-time Tracking → Delivery
```

## 🧪 **Testing**

```bash
# Tests unitarios
npm run test

# Tests E2E
npm run test:e2e

# Coverage
npm run test:coverage

# Linting
npm run lint

# Type checking
npm run typecheck
```

## 🚀 **Deployment**

### **Desarrollo**
```bash
npm run docker:dev
```

### **Staging**
```bash
npm run docker:staging
```

### **Producción con Coolify**
```bash
npm run build
npm run docker:prod
```

## 📈 **Roadmap de Desarrollo**

### **🎯 Demo (Semana 1)**
- [x] Estructura del proyecto
- [x] Configuración de Module Federation
- [x] API Gateway básico
- [x] Modelos de ML básicos
- [ ] Dashboard principal funcional
- [ ] Demo de predicción de demanda
- [ ] Integración con Google Maps

### **🔧 Fase 1 (Semanas 2-4)**
- [ ] Sistema de autenticación completo
- [ ] Módulo de analítica funcional
- [ ] Carga y procesamiento de CSV
- [ ] Predicciones en tiempo real
- [ ] Dashboard ejecutivo

### **🚚 Fase 2 (Semanas 5-8)**
- [ ] Módulo de logística completo
- [ ] Sistema de rutas optimizadas
- [ ] Apps móviles para repartidores
- [ ] WebSockets y notificaciones
- [ ] Chat interno

### **📱 Fase 3 (Semanas 9-12)**
- [ ] Capacidades offline
- [ ] Reportes avanzados
- [ ] Integración con MicroSIP
- [ ] Optimizaciones de performance
- [ ] Tests automatizados

## 🔐 **Seguridad**

- ✅ Autenticación JWT con refresh tokens
- ✅ Rate limiting en APIs
- ✅ Validación de datos con Zod
- ✅ CORS configurado correctamente
- ✅ Helmet para headers de seguridad
- ✅ Sanitización de inputs
- ✅ Roles y permisos granulares

## 🤝 **Contribución**

### **Flujo de Desarrollo**
1. Fork del repositorio
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### **Estándares de Código**
- TypeScript strict mode
- ESLint + Prettier
- Conventional Commits
- Test coverage > 80%

## 📞 **Soporte**

- **Documentación:** [docs/](./docs/)
- **Issues:** [GitHub Issues](https://github.com/tu-empresa/embler-platform/issues)
- **Email:** soporte@embler.com
- **Discord:** [Canal de EMBLER](https://discord.gg/embler)

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

**🏢 Desarrollado para empresas de refacciones que buscan optimizar su operación con inteligencia artificial.**

### **Stack Completo:**
- **Frontend:** React 18, TypeScript, Module Federation, TailwindCSS
- **Backend:** Node.js, Fastify, TypeScript, Prisma
- **ML:** Python, FastAPI, Scikit-learn, TensorFlow
- **Base de Datos:** PostgreSQL (Supabase), Redis
- **Infraestructura:** Docker, Coolify, Nginx
- **Monitoreo:** Prometheus, Grafana

¡Listo para revolucionar tu gestión de inventario y logística! 🚀 