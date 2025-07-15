// components/MatchResultTable.jsx
import { useState } from "react";
import axios from "axios";
import 'react-toastify/dist/ReactToastify.css';
import { toast } from "react-toastify";


const MatchResultTable = ({
  matches,
  setMatches,
  exportToExcel,
  lastValidated,
  setLastValidated,
}) => {
  const [savingIndex, setSavingIndex] = useState(null);
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(matches.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMatches = matches.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleUndo = async () => {
    if (!lastValidated) return toast.error("Tidak ada data untuk di-undo.");

    try {
      const res = await axios.post("http://127.0.0.1:8000/undo_validation/", lastValidated);
      console.log("✅ Validasi disimpan:", res.data.message);
      toast.success("Undo berhasil");
      setMatches((prev) => [lastValidated, ...prev]);
      setLastValidated(null);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Unknown error";
      toast.error("Gagal undo: " + msg);
      console.error("UNDO GAGAL:", err.response || err);
    }
  };

  const handleValidation = async (index, label) => {
    const globalIndex = startIndex + index;
    const match = matches[globalIndex];
    const payload = {
      fuzzy_combined: match.fuzzy_combined,
      faiss_score: match.faiss_score,
      user_validasi: label,
    };

    console.log("📤 Kirim validasi:", payload);

    try {
      setSavingIndex(globalIndex);
      const res = await axios.post("http://127.0.0.1:8000/validate/", payload);
      console.log("✅ Respon dari server:", res.data);

      toast.success("Validasi berhasil disimpan");

      const updated = [...matches];
      updated.splice(globalIndex, 1);
      setMatches(updated);
      setLastValidated(match);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Unknown error";
      toast.error("Gagal menyimpan validasi: " + msg);
      console.error("VALIDASI GAGAL:", err.response || err);
    } finally {
      setSavingIndex(null);
    }
  };

  if (!matches || matches.length === 0) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>🧐</span> Data Ambigu untuk Validasi
        </h3>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm font-medium flex items-center gap-2 text-sm"
          >
            <span>💾</span> Export Excel
          </button>
          {lastValidated && (
            <button
              onClick={handleUndo}
              className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-2 rounded-lg text-sm transition shadow-sm"
            >
              ↩️ Undo Validasi
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100/80 backdrop-blur-sm">
              <th className="text-left px-4 py-3 text-slate-700 text-sm">#</th>
              <th className="text-left px-4 py-3 text-slate-700 text-sm">Combined 1</th>
              <th className="text-left px-4 py-3 text-slate-700 text-sm">Combined 2</th>
              <th className="text-left px-4 py-3 text-slate-700 text-sm">FAISS</th>
              <th className="text-left px-4 py-3 text-slate-700 text-sm">Fuzzy</th>
              <th className="text-left px-4 py-3 text-slate-700 text-sm">Confidence</th>
              <th className="text-left px-4 py-3 text-slate-700 text-sm">Validasi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedMatches.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 border-b border-slate-200 text-slate-700 text-sm">{startIndex + i + 1}</td>
                <td className="px-4 py-3 border-b border-slate-200 text-slate-700 text-sm">{row.combined_1}</td>
                <td className="px-4 py-3 border-b border-slate-200 text-slate-700 text-sm">{row.combined_2}</td>
                <td className="px-4 py-3 border-b border-slate-200 text-slate-700 text-sm">{row.faiss_score}</td>
                <td className="px-4 py-3 border-b border-slate-200 text-slate-700 text-sm">{row.fuzzy_combined}</td>
                <td className="px-4 py-3 border-b border-slate-200 text-slate-700 text-sm">{(row.confidence * 100).toFixed(2)}%</td>
                <td className="px-4 py-3 border-b border-slate-200 text-slate-700 text-sm flex gap-2">
                  <button
                    onClick={() => handleValidation(i, 1)}
                    disabled={savingIndex === startIndex + i}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    ✅ Match
                  </button>
                  <button
                    onClick={() => handleValidation(i, 0)}
                    disabled={savingIndex === startIndex + i}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    ❌ Non-Match
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-slate-200 text-sm rounded hover:bg-slate-300 disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="px-3 py-1 text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-slate-200 text-sm rounded hover:bg-slate-300 disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      </div>
       <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default MatchResultTable;
