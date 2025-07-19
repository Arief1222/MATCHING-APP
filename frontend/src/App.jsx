import React, { useState, useEffect } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/clerk-react";
import axios from "axios";
import ClipLoader from "react-spinners/ClipLoader";
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import Header from "./components/Header";
import UploadFile from "./components/UploadFile";
import ColumnSelector from "./components/ColumnSelector";
import RecommendedColumns from "./components/RecommendedColumns";
import MatchResultTable from "./components/MatchResultTable";

function App() {
  const [file, setFile] = useState(null);
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState([]);
  const [matches, setMatches] = useState([]);
  const [recommendedCols, setRecommendedCols] = useState([]);
  const [useRecommendation, setUseRecommendation] = useState(null);
  const [lastValidated, setLastValidated] = useState(null);
  const [showRecommendedCols, setShowRecommendedCols] = useState(false);
  const [skipColumnSelection, setSkipColumnSelection] = useState(false);
  const [loading, setLoading] = useState(false); // ⬅️ State loading

useEffect(() => {
    // ✅ Reset hanya sekali saat komponen pertama kali dimount
    setRecommendedCols([]);
    setShowRecommendedCols(false);
    setSkipColumnSelection(false);
    setSelectedColumns([]);
  }, []);

const handleUpload = async () => {
  if (!file) return toast.warn("Pilih file terlebih dahulu");
  if (!tableName) return toast.warn("Isi nama tabel terlebih dahulu");
  setLoading(true);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("table_name", tableName);

  try {
    const res = await axios.post("http://127.0.0.1:8001/upload/", formData);
    toast.success("File berhasil diupload!");
    setColumns(res.data.columns); // Simpan semua kolom

    // Ambil rekomendasi kolom dari backend
    const recRes = await axios.post("http://127.0.0.1:8001/recommend-columns/", {
      table_name: tableName
    });

    const rekomendasi = recRes.data?.table_a_recommendations || [];
    if (rekomendasi.length > 0) {
      setRecommendedCols(rekomendasi.map((item) => item.column));
    } else {
      // Fallback: jika tidak ada rekomendasi, pakai semua kolom
      setRecommendedCols(res.data.columns || []);
    }
  } catch (err) {
    toast.error("Gagal upload atau ambil rekomendasi");
    console.error(err);
  } finally {
    setLoading(false);
  }
};


  const handleCheckboxChange = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setSelectedColumns((prev) =>
      checked ? [...prev, value] : prev.filter((col) => col !== value)
    );
  };

  const handleSubmitColumns = async () => {
    if (selectedColumns.length === 0)
      return toast.warn("Pilih minimal satu kolom!");
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/process_columns/", {
        columns: selectedColumns,
      });
      toast.success("Kolom berhasil digabung!");
      setCombinedPreview(res.data.combined_sample);
    } catch (err) {
      toast.error("Gagal menggabungkan kolom!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/match_faiss/");
      const all = [...res.data.ambiguous, ...res.data.results];
      setMatches(all);
    } catch (err) {
      toast.error("Matching gagal!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/export_cleaned_results/",
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "final_cleaned_output.xlsx");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error("Gagal mengunduh hasil");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://127.0.0.1:8000/recommend_columns/");
      setRecommendedCols(res.data.recommended_columns);
    } catch (err) {
      toast.error("Gagal mengambil rekomendasi kolom");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
const LoadingOverlay = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
    <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 border border-gray-100">
      <img 
        src="/src/assets/image.png" 
        alt="Logo" 
        className="w-16 h-16 animate-bounce"
      />
      <div className="flex items-center space-x-4">
        <ClipLoader color="#3B82F6" size={35} speedMultiplier={0.8} />
        <span className="text-gray-800 text-lg font-semibold">Sedang diproses...</span>
      </div>
    </div>
  </div>

);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4 flex justify-center">
      <div className="w-full">
        <Header />

        <SignedOut>
          <div className="bg-white p-6 rounded-xl text-center shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Silakan Login untuk melanjutkan
            </h2>
            <SignInButton />
            <span className="mx-2 text-slate-500">atau</span>
            <SignUpButton />
          </div>
        </SignedOut>

        <SignedIn>
          <UploadFile
            file={file}
            setFile={setFile}
            tableName={tableName}
            setTableName={setTableName}
            handleUpload={handleUpload}
          />
{recommendedCols.length > 0 && !useRecommendation && (
<div className="mb-4 px-4">
<p className="text-sm text-slate-700 mb-2 font-medium">
Gunakan kolom yang direkomendasikan?
</p>
<div className="flex gap-3">
<button
onClick={() => {
setSelectedColumns(recommendedCols);
setSkipColumnSelection(true);
toast.success("Menggunakan kolom yang direkomendasikan!");
}}
className="bg-green-600 text-white px-4 py-2 rounded"
>
Ya
</button>
<button
onClick={() => {
setShowRecommendedCols(true);
setUseRecommendation(true);
}}
className="bg-gray-500 text-white px-4 py-2 rounded"
>
Tidak
</button>
</div>
</div>
)}

          <ColumnSelector
            columns={columns}
            selectedColumns={selectedColumns}
            handleCheckboxChange={handleCheckboxChange}
            handleSubmitColumns={handleSubmitColumns}
            handleMatch={handleMatch}
            fetchRecommendations={fetchRecommendations}
            combinedPreview={combinedPreview}
          />

  {showRecommendedCols && useRecommendation && (
  <RecommendedColumns
    recommendedCols={recommendedCols}
    handleCheckboxChange={handleCheckboxChange}
    selectedColumns={selectedColumns}
  />
          )}
          
          <MatchResultTable
            matches={matches}
            setMatches={setMatches}
            exportToExcel={exportToExcel}
            lastValidated={lastValidated}
            setLastValidated={setLastValidated}
          />
        </SignedIn>

      
      </div>

      {/* Toast Notifikasi */}
      <ToastContainer position="top-right" autoClose={3000} />
      {loading && <LoadingOverlay />}

    </div>
  );
}

export default App;
