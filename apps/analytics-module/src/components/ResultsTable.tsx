/**
 * Results Table Component
 *
 * Componente para mostrar los resultados de queries en formato tabla.
 * Incluye paginación, ordenamiento y export a CSV.
 */

import { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Table as TableIcon,
  FileSpreadsheet,
} from 'lucide-react';
import type { AnalyticsResult } from '../hooks/useAnalytics';

// ========================
// INTERFACES
// ========================

interface ResultsTableProps {
  result: AnalyticsResult;
  maxRows?: number;
  showExport?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  column: string;
  direction: SortDirection;
}

// ========================
// HELPER FUNCTIONS
// ========================

/**
 * Convert results to CSV format
 */
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    // Header row
    headers.join(','),
    // Data rows
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape commas and quotes
          const stringValue = String(value ?? '');
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    ),
  ];

  return csvRows.join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(csvContent: string, filename: string = 'results.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Format cell value for display
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'number') {
    // Format numbers with thousands separator
    return value.toLocaleString('es-MX');
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('es-MX');
  }

  return String(value);
}

// ========================
// MAIN COMPONENT
// ========================

export function ResultsTable({ result, maxRows = 100, showExport = true }: ResultsTableProps) {
  // ===========================
  // STATE
  // ===========================

  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // ===========================
  // DATA PROCESSING
  // ===========================

  const results = result?.results || [];
  const hasResults = results.length > 0;

  // Extract columns from first row
  const columns = useMemo(() => {
    if (!hasResults) return [];
    return Object.keys(results[0]);
  }, [results, hasResults]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig.column || !sortConfig.direction) {
      return results;
    }

    return [...results].sort((a, b) => {
      const aValue = a[sortConfig.column];
      const bValue = b[sortConfig.column];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Compare values
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [results, sortConfig]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  // ===========================
  // HANDLERS
  // ===========================

  const handleSort = (column: string) => {
    setSortConfig((current) => {
      if (current.column === column) {
        // Cycle through: null -> asc -> desc -> null
        if (current.direction === null) {
          return { column, direction: 'asc' };
        } else if (current.direction === 'asc') {
          return { column, direction: 'desc' };
        } else {
          return { column: '', direction: null };
        }
      } else {
        return { column, direction: 'asc' };
      }
    });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const handleExportCSV = () => {
    const csvContent = convertToCSV(sortedData);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCSV(csvContent, `analytics-results-${timestamp}.csv`);
  };

  // ===========================
  // RENDER HELPERS
  // ===========================

  const getSortIcon = (column: string) => {
    if (sortConfig.column !== column || sortConfig.direction === null) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="h-4 w-4 text-purple-600" />;
    }
    return <ChevronDown className="h-4 w-4 text-purple-600" />;
  };

  // ===========================
  // RENDER
  // ===========================

  if (!hasResults) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
        <TableIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No hay resultados para mostrar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableIcon className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            Resultados ({sortedData.length.toLocaleString()})
          </h3>
          {result.metadata?.cached && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Desde caché
            </span>
          )}
        </div>

        {showExport && (
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  onClick={() => handleSort(column)}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{column}</span>
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-50 transition-colors"
              >
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {((currentPage - 1) * rowsPerPage) + 1} a{' '}
            {Math.min(currentPage * rowsPerPage, sortedData.length)} de{' '}
            {sortedData.length.toLocaleString()} resultados
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === pageNum
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResultsTable;
