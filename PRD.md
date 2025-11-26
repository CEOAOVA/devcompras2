# PRD (Documento de Requisitos del Producto) - EMBLER

**Autor:** Equipo de Desarrollo EMBLER
**Versión:** 1.1.0
**Estado:** En Desarrollo (Fase Demo)
**Fecha:** 26 de Noviembre de 2025

## 1. Antecedentes y Visión
Las empresas distribuidoras de refacciones enfrentan desafíos significativos en la gestión eficiente de inventarios, la predicción de la demanda y la optimización logística. Los métodos tradicionales resultan en desabastecimiento, exceso de stock y rutas ineficientes.

**Visión:** Convertirse en el sistema operativo central para distribuidoras de refacciones, empoderando a las empresas con inteligencia artificial para tomar decisiones proactivas.

## 2. Objetivos de Negocio
*   **Reducir Stockouts:** Disminuir en un 35-40% los incidentes de falta de stock.
*   **Optimizar Inventario:** Mejorar la rotación de inventario mediante predicciones precisas.
*   **Eficiencia Logística:** Reducir tiempos de entrega y costos operativos.
*   **Centralización:** Unificar la visión del negocio integrando datos de Microsip en tiempo real.

## 3. Personas Usuarias (User Personas)
1.  **Administrador / Dueño:** Toma decisiones estratégicas basadas en rentabilidad y KPIs.
2.  **Jefe de Almacén:** Gestiona el inventario físico, entradas, salidas y preparación de pedidos.
3.  **Repartidor:** Ejecuta la entrega de última milla y recolecta pruebas de entrega.

## 4. Historias de Usuario

### Administrador
*   **HU-01:** Como Administrador, quiero ver un dashboard con las ventas diarias y alertas de stock bajo para tomar decisiones de compra inmediatas.
*   **HU-02:** Como Administrador, quiero consultar al Chat con IA "¿cuáles fueron los productos más vendidos la semana pasada?" para obtener respuestas rápidas sin generar reportes manuales.
*   **HU-03:** Como Administrador, quiero ver la predicción de demanda a 30 días para planificar el presupuesto de compras.

### Jefe de Almacén
*   **HU-04:** Como Jefe de Almacén, quiero recibir una lista de "sugerencias de compra" basada en la predicción de demanda para evitar quedarme sin stock.
*   **HU-05:** Como Jefe de Almacén, quiero localizar rápidamente un producto en el almacén mediante la app para agilizar el picking.
*   **HU-06:** Como Jefe de Almacén, quiero ver qué pedidos están pendientes de surtir ordenados por prioridad.

### Repartidor
*   **HU-07:** Como Repartidor, quiero ver mi ruta de entrega optimizada en un mapa para ahorrar tiempo y combustible.
*   **HU-08:** Como Repartidor, quiero poder capturar una firma o foto como prueba de entrega para confirmar que el cliente recibió el pedido.

## 5. Funciones Específicas y Flujos de Usuario

### 5.1. Módulo de Inteligencia de Negocios (Dashboard)
**Funciones:**
*   Visualización de KPIs: Ventas totales, Margen, Tickets promedio.
*   Gráficos de tendencia de ventas (diario, semanal, mensual).
*   Listado de Top Productos y Productos con bajo desempeño.
*   Filtros dinámicos por sucursal y rango de fechas.

**Flujo de Usuario (Análisis Diario):**
1.  El usuario inicia sesión.
2.  Aterriza en el Dashboard Principal.
3.  Revisa los KPIs del día actual.
4.  Filtra por la sucursal "Norte".
5.  Identifica una caída en ventas en el gráfico de tendencias.
6.  Hace clic en el detalle para ver los productos afectados.

### 5.2. Módulo de Predicción de Demanda
**Funciones:**
*   Generación de pronósticos de venta a 30, 60 y 90 días por SKU.
*   Cálculo de intervalos de confianza (optimista/pesimista).
*   Detección de estacionalidad y tendencias.

**Flujo de Usuario (Planeación de Compras):**
1.  El usuario accede a "Predicciones".
2.  Selecciona una categoría (ej. "Frenos").
3.  El sistema muestra la demanda proyectada para el próximo mes.
4.  El sistema sugiere la cantidad a comprar: `(Demanda Proyectada - Stock Actual) + Stock de Seguridad`.
5.  El usuario aprueba la sugerencia y genera una orden de compra preliminar.

### 5.3. Módulo de Logística y Rutas
**Funciones:**
*   Geocodificación de direcciones de entrega.
*   Optimización de rutas multi-parada (Traveling Salesman Problem).
*   Asignación de choferes a vehículos/rutas.
*   Tracking en tiempo real.

**Flujo de Usuario (Entrega):**
1.  El Repartidor abre la app móvil.
2.  Ve la lista de entregas ordenadas por la ruta óptima.
3.  Selecciona "Iniciar Ruta".
4.  La app abre la navegación GPS al primer punto.
5.  Al llegar, selecciona "Confirmar Entrega", toma una foto y la sube.
6.  El sistema actualiza el estatus del pedido a "Entregado" en tiempo real.

### 5.5. Módulo de Análisis con IA (LLM Analytics)
**Funciones:**
*   **Consultas en Lenguaje Natural:** Permite preguntar "¿Cuáles son los 10 productos más vendidos este mes?" y obtener respuestas directas.
*   **Generación de SQL Automática:** Utiliza modelos LLM (Claude 3.5 Sonnet) para traducir preguntas a consultas SQL seguras sobre la base de datos.
*   **Insights Automáticos:** Genera explicaciones y recomendaciones de negocio basadas en los datos obtenidos.
*   **Sugerencias de Visualización:** Recomienda el mejor tipo de gráfico (barras, líneas, etc.) para los datos consultados.
*   **Seguridad:** Validación de AST (Abstract Syntax Tree) para prevenir inyección SQL y listas blancas de tablas permitidas.

**Flujo de Usuario (Consulta):**
1.  El usuario escribe una pregunta en la barra de búsqueda: "Ventas por sucursal último trimestre".
2.  El sistema procesa la pregunta y genera el SQL correspondiente.
3.  Se muestra una tabla con los resultados y un gráfico sugerido.
4.  El sistema añade un comentario tipo "Insight: La sucursal Norte tiene un 20% más de ventas que el promedio".

## 6. Especificación Técnica de Integración Microsip

### 6.1. Arquitectura de Integración
La integración se realiza mediante un patrón **ETL (Extract, Transform, Load)** que sincroniza datos desde la base de datos Firebird de Microsip hacia una base de datos PostgreSQL en Supabase, optimizada para lectura y análisis.

*   **Origen:** Servidor Microsip (Firebird 2.5/3.0) en puerto 3050.
*   **Conector:** Microservicio Node.js (`microsip-connector`) que utiliza conexión TCP/IP directa (sin ODBC).
*   **Destino:** Supabase (PostgreSQL 15).
*   **Frecuencia:**
    *   **Ventas e Inventario:** Incremental cada 1 hora (o bajo demanda).
    *   **Catálogos (Productos/Clientes):** Diaria o Semanal.

### 6.2. Mapeo de Datos (Schema Mapping)

| Entidad Microsip (Tabla Base) | Tabla Destino (Supabase) | Descripción |
| :--- | :--- | :--- |
| `ARTICULOS` | `devcompras.ARTICULOS` | Catálogo maestro de productos, incluye SKU, descripción, costos y precios. |
| `LINEAS_ARTICULOS` | `devcompras.LINEAS_ARTICULOS` | Categorías y familias de productos. |
| `SUCURSALES` | `devcompras.SUCURSALES` | Catálogo de tiendas físicas. |
| `DOCTOS_PV` + `DOCTOS_PV_DET` | `devcompras.DOCTOS_PV_DET` | **Fact Table de Ventas.** Desnormalizada para análisis rápido. Contiene cada partida vendida con fecha, cliente, vendedor y montos. |
| `EXISTENCIAS` | `devcompras.EXISTENCIAS` | **Snapshot de Inventario.** Existencia actual por almacén, comprometido y disponible. |
| `DOCTOS_IN_DET` | `devcompras.DOCTOS_IN_DET` | Movimientos históricos de inventario (entradas/salidas). |

### 6.3. Lógica de Extracción y Transformación
1.  **Ventas (`syncVentas`):**
    *   Se extraen documentos de `DOCTOS_PV` filtrados por rango de fechas.
    *   Se hace JOIN con `DOCTOS_PV_DET` para obtener el detalle.
    *   **Transformación:** Se calculan campos derivados como `margen_unitario` (`precio - costo`) y dimensiones de tiempo (`semana`, `mes`, `año`) para facilitar el agrupamiento en dashboards.
2.  **Inventario (`syncInventarioActual`):**
    *   Se lee la tabla `EXISTENCIAS`.
    *   **Cálculo de Métricas:** Se cruza con el histórico de ventas para calcular `dias_inventario` (Cobertura) y `rotacion_anual`.
    *   **Regla de Negocio:** `Días Inventario = Existencia / (Ventas Últimos 30 Días / 30)`.

### 6.4. API del Conector Microsip
El conector expone una API REST para controlar la sincronización:
*   `POST /api/etl/sync/full`: Ejecuta una carga completa.
*   `POST /api/etl/sync/ventas`: Sincroniza un rango de fechas específico.
    *   Body: `{ "fecha_inicio": "YYYY-MM-DD", "fecha_fin": "YYYY-MM-DD" }`
*   `POST /api/etl/sync/inventario`: Actualiza el snapshot de existencias.

## 7. Requisitos No Funcionales
*   **Rendimiento:** Las consultas al Dashboard deben responder en < 2 segundos (vs 8+ segundos en Microsip directo).
*   **Seguridad:** La conexión a Microsip es de solo lectura. Los datos en Supabase están protegidos por RLS (Row Level Security).
*   **Disponibilidad:** El sistema debe operar 24/7, con sincronización resiliente que reintenta en caso de fallo de red.

## 8. Dependencias y Restricciones

### 8.1. Dependencias
*   **Servidor Microsip:** La sincronización depende de que el servidor Firebird de Microsip esté encendido y accesible vía TCP/IP.
*   **Conexión a Internet:** Se requiere conexión estable tanto en el servidor del conector como en los dispositivos cliente para acceder a Supabase.
*   **Servicios de Terceros:**
    *   **Supabase:** Disponibilidad del servicio de base de datos y autenticación.
    *   **Google Maps API:** Requiere una API Key válida y crédito disponible para geocodificación y rutas.
    *   **OpenAI/OpenRouter:** Dependencia para las funciones de Chat con IA.

### 8.2. Restricciones
*   **Solo Lectura (Microsip):** En esta fase, la integración con Microsip es unidireccional (Lectura). No se escriben pedidos ni ajustes de inventario de regreso a Microsip automáticamente.
*   **Versión de Firebird:** El conector está validado para Firebird 2.5 y 3.0. Versiones anteriores podrían requerir ajustes.
*   **Latencia de Datos:** Los datos en el dashboard tienen una latencia máxima de 1 hora (o el tiempo configurado en el cron de sincronización), no son "tiempo real" instantáneo respecto a la caja registradora de Microsip.
*   **Hardware del Conector:** El microservicio del conector debe ejecutarse en un equipo con acceso a la red local de Microsip (puede ser el mismo servidor o uno en la misma LAN).

## 9. Hitos y Roadmap (Actualizado)
*   **Fase 1 (Completada):** Desarrollo del Conector Microsip y diseño del Schema en Supabase.
*   **Fase 2 (En Proceso):** Implementación de Dashboards en React y validación de datos.
*   **Fase 3 (Q1 2025):** Implementación de modelos de ML sobre los datos históricos sincronizados.
*   **Fase 4 (Q2 2025):** Desarrollo de App Móvil para logística y rutas.
