// frontend/src/components/ColumnSelector.jsx
import React from "react";

const ColumnSelector = ({
  matchingType,
  columnsA = [],
  columnsB = [],
  selectedColumnsA,
  selectedColumnsB,
  handleCheckboxChangeA,
  handleCheckboxChangeB,
  handleSubmitColumns,
  handleMatch,
  combinedPreview
}) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">📋 Pilih Kolom untuk Matching</h2>
      
      <div className={`grid ${matchingType === "cross" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-6`}>
        {/* Kolom Tabel Utama */}
        <div>
          <h3 className="font-medium text-gray-700 mb-3">
            Kolom Tabel Utama {matchingType === "cross" ? "(A)" : ""}:
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {columnsA.map((column, index) => (
              <label key={index} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  value={column}
                  checked={selectedColumnsA.includes(column)}
                  onChange={handleCheckboxChangeA}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">{column}</span>
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Terpilih: {selectedColumnsA.length} kolom
          </div>
        </div>

        {/* Kolom Tabel Kedua (hanya untuk cross matching) */}
        {matchingType === "cross" && (
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Kolom Tabel Kedua (B):</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {columnsB.map((column, index) => (
                <label key={index} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    value={column}
                    checked={selectedColumnsB.includes(column)}
                    onChange={handleCheckboxChangeB}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">{column}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Terpilih: {selectedColumnsB.length} kolom
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSubmitColumns}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          🔧 Proses Kolom
        </button>
        <button
          onClick={handleMatch}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          🚀 Mulai Matching
        </button>
      </div>
    </div>
  );
};

export default ColumnSelector;