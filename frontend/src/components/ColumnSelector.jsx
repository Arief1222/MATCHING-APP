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
  
  // PERBAIKAN: Function untuk safely render preview data
  const renderPreviewData = () => {
    if (!combinedPreview || combinedPreview.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          Belum ada data preview. Klik "Proses Kolom" untuk melihat preview.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {/* Extract column headers safely */}
              {Object.keys(combinedPreview[0] || {}).map((key, index) => (
                <th
                  key={index}
                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {combinedPreview.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {Object.entries(row).map(([key, value], colIndex) => (
                  <td
                    key={colIndex}
                    className="px-4 py-2 text-sm text-gray-900 border-b"
                  >
                    {/* PERBAIKAN: Safely render value */}
                    {typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value || '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">📋 Pilih Kolom untuk Matching</h2>
      
      <div className={`grid ${matchingType === "cross" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"} gap-6`}>
        {/* Kolom Tabel Utama */}
        <div>
          <h3 className="font-medium text-gray-700 mb-3">
            Kolom Tabel Utama {matchingType === "cross" ? "(A)" : ""}:
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
            {columnsA.length > 0 ? (
              columnsA.map((column, index) => (
                <label key={index} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    value={column}
                    checked={selectedColumnsA.includes(column)}
                    onChange={handleCheckboxChangeA}
                    className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">{column}</span>
                </label>
              ))
            ) : (
              <div className="text-gray-500 text-sm text-center py-4">
                Tidak ada kolom tersedia
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            <span className="font-semibold">Terpilih:</span> {selectedColumnsA.length} dari {columnsA.length} kolom
          </div>
        </div>

        {/* Kolom Tabel Kedua (hanya untuk cross matching) */}
        {matchingType === "cross" && (
          <div>
            <h3 className="font-medium text-gray-700 mb-3">Kolom Tabel Kedua (B):</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {columnsB.length > 0 ? (
                columnsB.map((column, index) => (
                  <label key={index} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      value={column}
                      checked={selectedColumnsB.includes(column)}
                      onChange={handleCheckboxChangeB}
                      className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 font-medium">{column}</span>
                  </label>
                ))
              ) : (
                <div className="text-gray-500 text-sm text-center py-4">
                  Pilih tabel kedua terlebih dahulu
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
              <span className="font-semibold">Terpilih:</span> {selectedColumnsB.length} dari {columnsB.length} kolom
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          onClick={handleSubmitColumns}
          disabled={selectedColumnsA.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white px-4 py-2.5 rounded-lg transition-colors font-medium
                     flex items-center justify-center gap-2"
        >
          <span>🔧</span>
          <span>Proses Kolom</span>
        </button>
        <button
          onClick={handleMatch}
          disabled={
            selectedColumnsA.length === 0 || 
            (matchingType === "cross" && selectedColumnsB.length === 0)
          }
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                     text-white px-4 py-2.5 rounded-lg transition-colors font-medium
                     flex items-center justify-center gap-2"
        >
          <span>🚀</span>
          <span>Mulai Matching</span>
        </button>
      </div>

      {/* Preview Data Section */}
      {combinedPreview && combinedPreview.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>👁️</span>
            Preview Data Gabungan (5 baris pertama)
          </h3>
          
          <div className="bg-gray-50 rounded-lg p-4 border">
            {renderPreviewData()}
          </div>
          
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <span>📊</span>
            <span>Preview menampilkan {combinedPreview.length} dari total baris yang akan diproses</span>
          </div>
        </div>
      )}

      {/* Validation Messages */}
      {selectedColumnsA.length === 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <span>⚠️</span>
            <span className="text-sm font-medium">Pilih minimal satu kolom dari tabel utama untuk melanjutkan</span>
          </div>
        </div>
      )}

      {matchingType === "cross" && selectedColumnsA.length > 0 && selectedColumnsB.length === 0 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2 text-orange-800">
            <span>⚠️</span>
            <span className="text-sm font-medium">Untuk cross matching, pilih juga kolom dari tabel kedua</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ColumnSelector;