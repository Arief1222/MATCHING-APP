// frontend/src/components/RecommendedColumns.jsx
import React from "react";

const RecommendedColumns = ({ 
  recommendedCols, 
  onAcceptRecommendation, 
  onDeclineRecommendation,
  isLoading = false 
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 text-lg">🎯</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-900">Rekomendasi Kolom</h3>
          <p className="text-sm text-blue-700">
            AI merekomendasikan kolom-kolom terbaik untuk matching berdasarkan analisis data
          </p>
        </div>
      </div>
      
      <div className="mb-4">
        <h4 className="text-sm font-medium text-blue-800 mb-3">Kolom yang direkomendasikan:</h4>
        <div className="flex flex-wrap gap-2">
          {recommendedCols.map((col, idx) => (
            <div
              key={idx}
              className="bg-white border border-blue-200 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium shadow-sm"
            >
              <span className="mr-2">📊</span>
              {col}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-100 rounded-lg p-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 mt-0.5">💡</span>
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Mengapa kolom ini direkomendasikan?</p>
            <p>Kolom-kolom ini memiliki variasi data yang baik, tingkat kelengkapan tinggi, dan cocok untuk proses matching.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onAcceptRecommendation}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white px-4 py-2.5 rounded-lg transition-colors font-medium
                     flex items-center justify-center gap-2"
        >
          <span>✅</span>
          <span>{isLoading ? 'Memproses...' : 'Ya, Gunakan Rekomendasi'}</span>
        </button>
        <button
          onClick={onDeclineRecommendation}
          disabled={isLoading}
          className="flex-1 bg-white hover:bg-gray-50 border border-gray-300 
                     text-gray-700 px-4 py-2.5 rounded-lg transition-colors font-medium
                     flex items-center justify-center gap-2"
        >
          <span>🛠️</span>
          <span>Pilih Manual</span>
        </button>
      </div>
    </div>
  );
};

export default RecommendedColumns;