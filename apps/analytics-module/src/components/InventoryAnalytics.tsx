import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const mockData = [
  { mes: 'Ene', ventas: 400, compras: 240, stock: 2400 },
  { mes: 'Feb', ventas: 300, compras: 139, stock: 2210 },
  { mes: 'Mar', ventas: 200, compras: 980, stock: 2290 },
  { mes: 'Abr', ventas: 278, compras: 390, stock: 2000 },
  { mes: 'May', ventas: 189, compras: 480, stock: 2181 },
  { mes: 'Jun', ventas: 239, compras: 380, stock: 2500 },
];

const InventoryAnalytics: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Analítica de Inventario
      </h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Tendencias de Inventario</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ventas" fill="#3b82f6" />
            <Bar dataKey="compras" fill="#10b981" />
            <Bar dataKey="stock" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Productos con Stock Bajo</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-red-50 rounded">
              <span className="font-medium">Producto A</span>
              <span className="text-red-600">Stock: 5</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-red-50 rounded">
              <span className="font-medium">Producto B</span>
              <span className="text-red-600">Stock: 8</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
              <span className="font-medium">Producto C</span>
              <span className="text-yellow-600">Stock: 15</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Rotación de Inventario</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span className="font-medium">Producto D</span>
              <span className="text-green-600">Alta rotación</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span className="font-medium">Producto E</span>
              <span className="text-green-600">Alta rotación</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
              <span className="font-medium">Producto F</span>
              <span className="text-blue-600">Media rotación</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryAnalytics;
