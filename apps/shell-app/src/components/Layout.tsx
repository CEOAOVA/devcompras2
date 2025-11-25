import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  Truck, 
  Settings, 
  Bell,
  User,
  Search
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Analítica', href: '/analytics', icon: BarChart3 },
    { name: 'Logística', href: '/logistics', icon: Truck },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  const isActive = (href: string) => {
    return location.pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar móvil */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 h-full bg-white shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-900">EMBLER</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isActive(item.href)
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-1 bg-white border-r border-gray-200">
          <div className="flex items-center px-6 py-4 border-b">
            <h1 className="text-xl font-bold text-gray-900">EMBLER</h1>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded-md text-gray-400 lg:hidden hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Barra de búsqueda */}
              <div className="relative ml-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Acciones del header */}
            <div className="flex items-center space-x-4">
              {/* Notificaciones */}
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md">
                <Bell className="w-5 h-5" />
              </button>

              {/* Menú de usuario */}
              <div className="relative">
                <button className="flex items-center p-2 text-gray-700 hover:bg-gray-100 rounded-md">
                  <User className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">{user?.email || 'Usuario'}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}; 