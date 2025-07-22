import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

// Detail Modal Component
const DetailModal = ({ result, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block w-full max-w-4xl px-6 py-4 my-8 text-left transition-all transform bg-white rounded-lg shadow-xl sm:align-middle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Match Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Batch ID:</strong> {result.batch_id}</div>
                <div><strong>Source Table:</strong> {result.source_table}</div>
                <div><strong>Reference Table:</strong> {result.reference_table}</div>
                <div><strong>Algorithm:</strong> {result.matching_algorithm}</div>
                <div><strong>Matching Type:</strong> {result.matching_type}</div>
                <div><strong>Confidence Score:</strong> {(result.confidence_score * 100).toFixed(2)}%</div>
                <div><strong>Status:</strong> {result.status}</div>
                <div><strong>Created At:</strong> {new Date(result.created_at).toLocaleString('id-ID')}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Matched Data</h4>
              <div className="bg-gray-50 p-3 rounded-md max-h-64 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(result.matched_data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MatchResultsPage = () => {
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: 'MATCH', // atau 'UNMATCH' untuk halaman unmatch
    batch_id: '',
    source_table: '',
    reference_table: '',
    algorithm: ''
  });

  const [selectedResult, setSelectedResult] = useState(null);

  const handleViewDetails = (result) => {
    setSelectedResult(result);
  };

  // Fetch data
  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        page_size: 20,
        ...filters
      });

      const response = await fetch(`http://127.0.0.1:8001/categorized-results/?${params}`);
      const data = await response.json();
      
      setResults(data.results || []);
      setCategories(data.categories || {});
      setTotalPages(data.pagination?.total_pages || 1);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [currentPage, filters]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Export functionality
  const handleExport = async (format = 'excel') => {
    try {
      const response = await fetch('http://127.0.0.1:8001/export-categorized/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          format
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filters.status.toLowerCase()}_results.${format === 'excel' ? 'xlsx' : 'csv'}`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'MATCH': return 'bg-green-100 text-green-800';
      case 'UNMATCH': return 'bg-red-100 text-red-800';
      case 'ENRICHED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {filters.status === 'MATCH' ? 'Match' : 'Unmatch'} Results
        </h1>
        <p className="text-gray-600">
          View and manage {filters.status.toLowerCase()} results from data matching processes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {categories.table_combinations?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Table Combinations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {categories.unique_algorithms?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Algorithms Used</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-purple-600">
            {categories.unique_batch_ids?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Batch Runs</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-2xl font-bold text-orange-600">
            {results.length}
          </div>
          <div className="text-sm text-gray-600">Current Results</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filters</h3>
          <button 
            onClick={() => setFilters(prev => ({ ...prev, batch_id: '', source_table: '', reference_table: '', algorithm: '' }))}
            className="ml-auto text-sm text-blue-600 hover:text-blue-800"
          >
            Clear Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Batch ID Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID</label>
            <select
              value={filters.batch_id}
              onChange={(e) => handleFilterChange('batch_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Batches</option>
              {categories.unique_batch_ids?.map(batchId => (
                <option key={batchId} value={batchId}>{batchId}</option>
              ))}
            </select>
          </div>

          {/* Source Table Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Table</label>
            <select
              value={filters.source_table}
              onChange={(e) => handleFilterChange('source_table', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sources</option>
              {categories.unique_source_tables?.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </div>

          {/* Reference Table Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Table</label>
            <select
              value={filters.reference_table}
              onChange={(e) => handleFilterChange('reference_table', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All References</option>
              {categories.unique_reference_tables?.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </div>

          {/* Algorithm Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
            <select
              value={filters.algorithm}
              onChange={(e) => handleFilterChange('algorithm', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Algorithms</option>
              {categories.unique_algorithms?.map(algo => (
                <option key={algo} value={algo}>{algo}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Combinations Overview */}
      {categories.table_combinations && categories.table_combinations.length > 0 && (
        <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Table Combinations Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.table_combinations.map((combo, index) => (
              <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                   onClick={() => {
                     handleFilterChange('source_table', combo.source_table);
                     handleFilterChange('reference_table', combo.reference_table);
                   }}>
                <div className="font-medium text-sm text-gray-900 mb-1">
                  {combo.display_name}
                </div>
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span className={`px-2 py-1 rounded ${combo.matching_type === 'Self Match' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {combo.matching_type}
                  </span>
                  <span>{combo.total_records} records</span>
                </div>
                <div className="text-xs text-gray-500">
                  Avg Confidence: {combo.avg_confidence}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Algorithms: {combo.algorithms.map(a => a.algorithm).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => fetchResults()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Matching Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tables
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Algorithm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                     Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          Batch: {result.batch_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {result.id}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{result.source_table}</div>
                          <div className="text-gray-500">
                            {result.matching_type === 'Self Match' ? 
                              '↻ Self Match' : 
                              `→ ${result.reference_table}`
                            }
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          result.matching_type === 'Self Match' ? 
                          'bg-blue-100 text-blue-800' : 
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {result.matching_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                          {result.matching_algorithm}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          getConfidenceColor(result.confidence_score)
                        }`}>
                          {(result.confidence_score * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getStatusColor(result.status)
                        }`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(result.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(result)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedResult && (
        <DetailModal 
          result={selectedResult} 
          onClose={() => setSelectedResult(null)} 
        />
      )}
    </div>
  );
};

export default MatchResultsPage;