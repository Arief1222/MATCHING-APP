// components/RecommendedColumns.jsx

const RecommendedColumns = ({ recommendedCols }) => {
  if (recommendedCols.length === 0) return null;

  return (
    <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl shadow-sm p-4 mb-6">
      <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
        <span>✨</span> Kolom yang Disarankan
      </h3>
      <div className="flex flex-wrap gap-2">
        {recommendedCols.map((col, idx) => (
          <span
            key={idx}
            className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
          >
            {col}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RecommendedColumns;
