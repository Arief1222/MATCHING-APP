import { useState } from "react";
import axios from "axios";
import { utils, writeFile } from "xlsx";

function App() {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matches, setMatches] = useState([]); // Jika belum ada
  const [recommendedCols, setRecommendedCols] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 1 });

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const pollProgress = () => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/progress_faiss/");
        setProgress(res.data);

        if (res.data.current >= res.data.total) {
          clearInterval(interval);
          setIsMatching(false);
        }
      } catch (error) {
        console.error("Polling error:", error);
        clearInterval(interval);
      }
    }, 1000);
  };



  const fetchRecommendations = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/recommend_columns/");
      setRecommendedCols(res.data.recommended_columns);
    } catch (err) {
      alert("❌ Gagal mengambil rekomendasi kolom");
      console.error(err);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Pilih file terlebih dahulu");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("✅ File berhasil diupload!");
      setColumns(res.data.columns);
    } catch (err) {
      alert("❌ Gagal upload file");
      console.error(err);
    }
  };

  const handleCheckboxChange = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;

    setSelectedColumns(prev =>
      checked ? [...prev, value] : prev.filter(col => col !== value)
    );
  };


  const handleSubmitColumns = async () => {
    if (selectedColumns.length === 0) return alert("Pilih minimal satu kolom!");

    try {
      const res = await axios.post("http://127.0.0.1:8000/process_columns/", {
        columns: selectedColumns
      });
      alert("✅ Kolom berhasil digabung!");
      setCombinedPreview(res.data.combined_sample);
    } catch (err) {
      alert("❌ Gagal menggabungkan kolom!");
      console.error(err);
    }
  };

  const handleMatch = async () => {
    try {
      setIsMatching(true);
      setProgress({ current: 0, total: 1 });

      pollProgress(); // ⏳ Jalankan polling

      const res = await axios.post("http://127.0.0.1:8000/match_faiss/");
      setMatches(res.data.results);
    } catch (err) {
      alert("❌ Matching gagal!");
      console.error("MATCHING FAILED:", err.response?.data || err);
      setIsMatching(false);
    }
  };

  const exportToExcel = () => {
    const ws = utils.json_to_sheet(matches);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Matches");
    writeFile(wb, "hasil_matching.xlsx");
  };

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4">
      <div className="w-screen px-4">
        <div className="w-full">

          {/* Header */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
                <span className="text-xl">📊</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Matching App</h1>
                <p className="text-slate-600 text-sm">Sistem pencocokan data duplikat</p>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">📁 Upload File</h2>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 transition-all file:cursor-pointer cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-3 hover:border-slate-400"
                />
                {file && (
                  <div className="mt-2 text-sm text-slate-600">
                    ✅ File terpilih: {file.name}
                  </div>
                )}
              </div>

              <button
                onClick={handleUpload}
                className="bg-gray-300 text-black px-6 py-2 rounded-lg border-2 border-dashed border-black hover:bg-gray-700 hover:text-white transition-all shadow-sm font-medium flex items-center gap-2"
              >
                <span>⬆️</span> Upload File
              </button>
            </div>
          </div>

          {/* Konfigurasi Kolom */}
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
                        onChange={handleCheckboxChange}
                        className="accent-slate-600"
                      />
                      <span className="text-slate-700 text-sm">{col}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={handleSubmitColumns}
                  className="bg-gray-300 text-black px-4 py-3 rounded-lg border-2 border-dashed border-black hover:bg-gray-700 hover:text-white transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm w-full"
                >
                  <span>🔧</span> Proses Kolom
                </button>

                <button
                  onClick={handleMatch}
                  disabled={isMatching}
                  className={`bg-gray-300 text-black px-4 py-3 rounded-lg border-2 border-dashed border-black transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm w-full ${isMatching ? 'opacity-50 cursor-not-allowed' : ' hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  <span>🔍</span> {isMatching ? 'Matching...' : 'Matching'}
                </button>

                <button
                  onClick={() => window.open("http://127.0.0.1:8000/download_results/", "_blank")}
                  className="bg-gray-300 text-black px-4 py-3 rounded-lg border-2 border-dashed border-black hover:bg-gray-700 hover:text-white transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm w-full"
                >
                  <span>⬇️</span> Download
                </button>

                <button
                  onClick={fetchRecommendations}
                  className="bg-gray-300 text-black px-4 py-3 rounded-lg border-2 border-dashed border-black hover:bg-gray-700 hover:text-white transition-all shadow-sm font-medium flex items-center justify-center gap-1 text-sm w-full"
                >
                  <span>🎯</span> Rekomendasi
                </button>
              </div>

              {/* Progress Bar */}
              {isMatching && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-emerald-500 h-3 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-gray-600 mt-1">
                    Progress: {progress.current} / {progress.total}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recommended Columns */}
          {recommendedCols.length > 0 && (
            <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-2xl shadow-sm p-4 mb-6">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <span>✨</span> Kolom yang Disarankan
              </h3>
              <div className="flex flex-wrap gap-2">
                {recommendedCols.map((col, idx) => (
                  <span key={idx} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          )}
            </div>
        </div>
      </div>
      
  );
}
export default App;
