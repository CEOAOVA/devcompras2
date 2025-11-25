import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { AuthProvider } from './providers/AuthProvider';
import LoadingSpinner from './components/LoadingSpinner';
import './styles/globals.css';

// Module Federation lazy imports
// @ts-ignore - Module Federation remote
const AnalyticsModule = React.lazy(() => import('analytics/App'));
// TODO: Re-enable when logistics module is implemented
// const LogisticsModule = React.lazy(() => import('logistics/App'));

// Crear instancia de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Ruta principal - redirect al dashboard */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  
                  {/* Dashboard principal */}
                  <Route path="/dashboard" element={<DashboardHome />} />
                  
                  {/* Módulo de Analítica */}
                  <Route
                    path="/analytics/*"
                    element={
                      <ErrorBoundary>
                        <AnalyticsModule />
                      </ErrorBoundary>
                    }
                  />
                  
                  {/* Módulo de Logística */}
                  {/* TODO: Re-enable when logistics module is implemented
                  <Route
                    path="/logistics/*"
                    element={
                      <ErrorBoundary fallback={<div>Error cargando módulo de Logística</div>}>
                        <LogisticsModule />
                      </ErrorBoundary>
                    }
                  />
                  */}
                  
                  {/* Configuración de usuario */}
                  <Route path="/settings" element={<UserSettings />} />
                  
                  {/* Ruta 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Layout>
          </Router>
          <Toaster position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Componente Dashboard Home
const DashboardHome = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">
      Dashboard Principal - EMBLER
    </h1>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Analítica y Predicciones</h2>
        <p className="text-gray-600 mb-4">
          Gestiona inventario, predicciones de demanda y órdenes de compra.
        </p>
        <a
          href="/analytics"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Ir a Analítica
        </a>
      </div>
      
      {/* TODO: Re-enable when logistics module is implemented
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Gestión Logística</h2>
        <p className="text-gray-600 mb-4">
          Control de rutas, repartidores y entregas en tiempo real.
        </p>
        <a
          href="/logistics"
          className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Ir a Logística
        </a>
      </div>
      */}
    </div>
  </div>
);

// Componente UserSettings
const UserSettings = () => (
  <div className="p-6">
    <h1 className="text-3xl font-bold text-gray-900 mb-6">Configuración</h1>
    <div className="bg-white rounded-lg shadow-md p-6">
      <p>Configuración de usuario y sistema...</p>
    </div>
  </div>
);

// Componente 404
const NotFound = () => (
  <div className="p-6 text-center">
    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
    <p className="text-gray-600">Página no encontrada</p>
  </div>
);

export default App; 