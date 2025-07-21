import { useState } from "react";
import { BeatLoader } from "react-spinners";

const UploadFile = ({ file, setFile, tableName, setTableName, handleUpload }) => {
  const [loading, setLoading] = useState(false);

  const onUploadClick = async () => {
    setLoading(true);
    try {
      await handleUpload(); // pastikan handleUpload mengembalikan Promise
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">📁 Upload File</h2>
      <div className="space-y-4">
        
        {/* Upload Input */}
        <label className="block">
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-slate-600 
                       file:mr-4 file:py-2 file:px-4 
                       file:rounded-lg file:border-0 file:text-sm 
                       file:font-medium file:bg-slate-50 file:text-slate-700 
                       hover:file:bg-slate-100 transition-all 
                       file:cursor-pointer cursor-pointer 
                       border-2 border-dashed border-slate-300 
                       rounded-xl p-3 hover:border-slate-400"
          />
        </label>

        {file && (
          <div className="mt-2 text-sm text-slate-600">
            ✅ File terpilih: {file.name}
          </div>
        )}

        {/* Input nama tabel */}
        <input
          type="text"
          placeholder="Masukkan nama tabel"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        {/* Tombol Upload */}
        <button
          onClick={onUploadClick}
          disabled={loading}
          className={`bg-gradient-to-r from-slate-600 to-slate-700 text-white px-6 py-2 rounded-lg transition-all shadow-sm font-medium flex items-center gap-2 ${
            loading ? "opacity-50 cursor-not-allowed" : "hover:from-slate-700 hover:to-slate-800"
          }`}
        >
          {loading ? (
            <>
              <BeatLoader size={8} color="#ffffff" />
              <span>Mengunggah...</span>
            </>
          ) : (
            <>
              <span>⬆️</span>
              <span>Upload File</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadFile;