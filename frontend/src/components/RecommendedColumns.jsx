const RecommendedColumns = ({ recommendedCols, handleCheckboxChange, selectedColumns }) => {
  if (recommendedCols.length === 0) return null;

  return (
    <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl shadow-sm p-4 mb-6">
      <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
        <span>✨</span> Pilih Kolom yang Direkomendasikan
      </h3>
      <div className="flex flex-wrap gap-4">
        {recommendedCols.map((col, idx) => (
          <label key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded shadow-sm border border-amber-200">
            <input
              type="checkbox"
              value={col}
              checked={selectedColumns.includes(col)}
              onChange={handleCheckboxChange}
            />
            <span className="text-sm text-amber-800">{col}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default RecommendedColumns;