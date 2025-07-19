const UploadFile = ({ file, setFile, tableName, setTableName, handleUpload }) => (
  <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6 mb-6">
    <h2 className="text-lg font-semibold text-slate-800 mb-4">📁 Upload File</h2>
    <div className="space-y-4">
      <div className="relative">
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 transition-all file:cursor-pointer cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-3 hover:border-slate-400"
        />
        {file && (
          <div className="mt-2 text-sm text-slate-600">
            ✅ File terpilih: {file.name}
          </div>
        )}
      </div>

      {/* Input nama tabel */}
      <input
        type="text"
        placeholder="Masukkan nama tabel"
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      <button
        onClick={handleUpload}
        className="bg-gradient-to-r from-slate-600 to-slate-700 text-white px-6 py-2 rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all shadow-sm font-medium flex items-center gap-2"
      >
        <span>⬆️</span> Upload File
      </button>
    </div>
  </div>
);
 export default UploadFile;