import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, TrendingUp, Package } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Dashboard de Analítica
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card: Total Inventario */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Inventario</p>
              <p className="text-2xl font-bold text-gray-900">1,234</p>
            </div>
            <Package className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        {/* Card: Productos Bajos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Bajo</p>
              <p className="text-2xl font-bold text-red-600">23</p>
            </div>
            <TrendingUp className="h-12 w-12 text-red-500" />
          </div>
        </div>

        {/* Card: Órdenes Pendientes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Órdenes Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">45</p>
            </div>
            <BarChart3 className="h-12 w-12 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/analytics/inventory"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Analítica de Inventario</h2>
          <p className="text-gray-600">
            Visualiza tendencias, análisis de stock y movimientos de inventario.
          </p>
        </Link>

        <Link
          to="/analytics/predictions"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold mb-2">Predicciones de Demanda</h2>
          <p className="text-gray-600">
            Predicciones basadas en ML para optimizar tu inventario.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
