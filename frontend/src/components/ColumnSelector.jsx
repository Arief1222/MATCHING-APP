// components/ColumnSelector.jsx

const ColumnSelector = ({
  columns,
  selectedColumns,
  handleCheckboxChange,
  handleSubmitColumns,
  handleMatch,
  fetchRecommendations,
  combinedPreview,
}) => (
  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6 mb-6">
    <h2 className="text-lg font-semibold text-slate-800 mb-4">⚙️ Konfigurasi Kolom</h2>
    <div className="space-y-4">
      <div>
        <label className="block font-medium text-slate-700 mb-2">
          📌 Pilih Kolom untuk Digabung:
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {columns.map((col, idx) => (
            <label
              key={idx}
              className="flex items-center gap-2 bg-white/50 p-2 rounded-lg shadow-sm border border-slate-300"
            >
              <input
                type="checkbox"
                value={col}
                checked={selectedColumns.includes(col)}
                onChange={handleCheckboxChange}
                className="accent-slate-600"
              />
              <span className="text-slate-700 text-sm">{col}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={handleSubmitColumns}
          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm"
        >
          <span>🔧</span> Proses Kolom
        </button>

        <button
          onClick={handleMatch}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm"
        >
          <span>🔍</span> Matching
        </button>

        <button
          onClick={() => window.open("http://127.0.0.1:8000/download_results/", "_blank")}
          className="bg-gradient-to-r from-slate-500 to-slate-600 text-white px-4 py-2 rounded-lg hover:from-slate-600 hover:to-slate-700 transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm"
        >
          <span>⬇️</span> Download
        </button>

        <button
          onClick={fetchRecommendations}
          className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm"
        >
          <span>🎯</span> Rekomendasi
        </button>
      </div>

      {combinedPreview.length > 0 && (
        <div className="bg-slate-100 rounded-xl p-4 mt-4 shadow-sm border">
          <h3 className="font-semibold text-slate-700 mb-2">
            🔎 Preview Kolom Gabungan:
          </h3>
          <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
            {combinedPreview.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
);

export default ColumnSelector;
