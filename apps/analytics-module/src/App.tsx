import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import InventoryAnalytics from './components/InventoryAnalytics';
import DemandPrediction from './components/DemandPrediction';

const App: React.FC = () => {
  return (
    <div className="analytics-module">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<InventoryAnalytics />} />
        <Route path="/predictions" element={<DemandPrediction />} />
      </Routes>
    </div>
  );
};

export default App;
