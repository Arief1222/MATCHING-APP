import React, { useState, useEffect } from 'react';
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";
import { toast } from "react-toastify";

const MatchResultTable = () => {
  const { getToken } = useAuth();
  const [results, setResults] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(false);

  // Helper function untuk mendapatkan headers dengan token
  const getAuthHeaders = async () => {
    try {
      const token = await getToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {};
    }
  };

  // Fetch results dari backend
  const fetchResults = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get('http://127.0.0.1:8001/matching-results/', { headers });
      // Pastikan data yang diterima adalah array
      setResults(Array.isArray(response.data) ? response.data : response.data?.results || []);
    } catch (error) {
      console.error('Error fetching results:', error);
      toast.error('Gagal mengambil hasil matching');
      setResults([]); // Set empty array jika error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Memuat hasil matching...</span>
        </div>
      </div>
    );
  }

  // Safe check untuk length - pastikan results adalah array
  if (!Array.isArray(results) || results.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          📊 Hasil Matching
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">Belum ada hasil matching</p>
          <p className="text-gray-400 text-sm">Mulai proses matching untuk melihat hasil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📊 Hasil Matching ({results.length} hasil)
      </h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-700 border">No</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 border">Data A</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 border">Data B</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 border">Similarity</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 border text-gray-700">{index + 1}</td>
                <td className="px-4 py-3 border text-gray-700">
                  {result.data_a || 'N/A'}
                </td>
                <td className="px-4 py-3 border text-gray-700">
                  {result.data_b || 'N/A'}
                </td>
                <td className="px-4 py-3 border">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    (result.similarity || 0) > 0.8 
                      ? 'bg-green-100 text-green-800' 
                      : (result.similarity || 0) > 0.6 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {((result.similarity || 0) * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 border">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.is_match 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {result.is_match ? 'Match' : 'No Match'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={fetchResults}
          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors font-medium"
        >
          🔄 Refresh
        </button>
        
        <div className="text-sm text-gray-600">
          Total: {results.length} hasil
        </div>
      </div>
    </div>
  );
};

export default MatchResultTable;