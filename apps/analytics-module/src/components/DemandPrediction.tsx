import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';

const mockPredictionData = [
  { mes: 'Jul', actual: 400, prediccion: 420 },
  { mes: 'Ago', actual: 350, prediccion: 380 },
  { mes: 'Sep', actual: 450, prediccion: 440 },
  { mes: 'Oct', actual: null, prediccion: 480 },
  { mes: 'Nov', actual: null, prediccion: 510 },
  { mes: 'Dic', actual: null, prediccion: 550 },
];

const DemandPrediction: React.FC = () => {
  const [selectedProduct, setSelectedProduct] = useState('producto-a');

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Predicciones de Demanda
      </h1>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-2" />
          <p className="text-sm text-blue-700">
            Las predicciones se generan usando modelos de Machine Learning entrenados con datos históricos.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Producto
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="producto-a">Producto A - Filtro de Aceite</option>
            <option value="producto-b">Producto B - Bujías</option>
            <option value="producto-c">Producto C - Pastillas de Freno</option>
          </select>
        </div>

        <h2 className="text-xl font-semibold mb-4">Predicción de Demanda - Próximos 3 Meses</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockPredictionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} name="Demanda Actual" />
            <Line type="monotone" dataKey="prediccion" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Predicción ML" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Tendencia</h3>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">+15%</p>
          <p className="text-sm text-gray-600 mt-2">Incremento esperado</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Stock Recomendado</h3>
          <p className="text-3xl font-bold text-blue-600">550</p>
          <p className="text-sm text-gray-600 mt-2">Unidades para próximo mes</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-2">Confianza del Modelo</h3>
          <p className="text-3xl font-bold text-purple-600">87%</p>
          <p className="text-sm text-gray-600 mt-2">Precisión de predicción</p>
        </div>
      </div>
    </div>
  );
};

export default DemandPrediction;
