// frontend/src/components/UploadFile.jsx
import { BeatLoader } from "react-spinners";

const UploadFile = ({ file, setFile, tableName, setTableName, handleUpload, isUploading }) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">📁 Upload File Excel</h2>
      <div className="space-y-4">
        
        {/* Upload Input */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700 mb-2 block">Pilih File Excel (.xlsx):</span>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-slate-600 
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-medium
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100
                       border border-gray-300 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>

        {/* File Info */}
        {file && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="text-green-600">📄</span>
              <span className="text-sm font-medium text-green-800">{file.name}</span>
              <span className="text-xs text-green-600">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
        )}

        {/* Table Name Input */}
        <label className="block">
          <span className="text-sm font-medium text-gray-700 mb-2 block">Nama Tabel:</span>
          <input
            type="text"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="masukkan_nama_tabel"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 
                       focus:outline-none focus:ring-2 focus:ring-blue-400
                       text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            * Gunakan huruf kecil, angka, dan underscore (_) saja
          </p>
        </label>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={isUploading || !file || !tableName}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white font-medium py-2 px-4 rounded-lg 
                     transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <>
              <BeatLoader color="white" size={8} />
              <span>Mengupload...</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Upload File</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UploadFile;