// App.jsx
import React, { useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
} from "@clerk/clerk-react";
import axios from "axios";
import Header from "./components/Header";
import UploadFile from "./components/UploadFile";
import ColumnSelector from "./components/ColumnSelector";
import RecommendedColumns from "./components/RecommendedColumns";
import MatchResultTable from "./components/MatchResultTable";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer, toast } from "react-toastify";



function App() {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState([]);
  const [matches, setMatches] = useState([]);
  const [recommendedCols, setRecommendedCols] = useState([]);
  const [lastValidated, setLastValidated] = useState(null);

  

  const handleUpload = async () => {
    if (!file) return alert("Pilih file terlebih dahulu");
    console.log("📂 File terpilih:", file);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://127.0.0.1:8000/upload/", formData);
      toast.success("File berhasil diupload!");
      setColumns(res.data.columns);
    } catch (err) {
      toast.error("Gagal upload file");
      console.error("Upload error:", err.response?.data || err.message);
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
    try {
      const res = await axios.post("http://127.0.0.1:8000/process_columns/", {
        columns: selectedColumns,
      });
      toast.success("Kolom berhasil digabung!");
      setCombinedPreview(res.data.combined_sample);
    } catch (err) {
      toast.error("Gagal menggabungkan kolom!");
      console.error(err);
    }
  };

  const handleMatch = async () => {
    try {
      const res = await axios.post("http://127.0.0.1:8000/match_faiss/");
      const all = [...res.data.ambiguous, ...res.data.results]; // Ambiguous dulu
      setMatches(all);
    } catch (err) {
      toast.error("Matching gagal!");
      console.error("MATCHING FAILED:", err.response?.data || err);
    }
  };

  const exportToExcel = async () => {
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/export_cleaned_results/",
        {
          responseType: "blob", // penting agar bisa unduh file binary
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "final_cleaned_output.xlsx");
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      toast.error("Gagal mengunduh hasil final");
      console.error(err);
    }
  };

  const fetchRecommendations = async () => {
    try {
         
      const res = await axios.get("http://127.0.0.1:8000/recommend_columns/");
      setRecommendedCols(res.data.recommended_columns);
    } catch (err) {
      toast.error("Gagal mengambil rekomendasi kolom");
      console.error(err);
    }
  };

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
          handleUpload={handleUpload}
        />
        <ColumnSelector
          columns={columns}
          selectedColumns={selectedColumns}
          handleCheckboxChange={handleCheckboxChange}
          handleSubmitColumns={handleSubmitColumns}
          handleMatch={handleMatch}
          fetchRecommendations={fetchRecommendations}
          combinedPreview={combinedPreview}
        />
        <RecommendedColumns recommendedCols={recommendedCols} />
        <MatchResultTable
          matches={matches}
          setMatches={setMatches}
          exportToExcel={exportToExcel}
          lastValidated={lastValidated}
          setLastValidated={setLastValidated}
        />
      </SignedIn>
    </div>
    <ToastContainer position="top-right" autoClose={3000} />
  </div>
  
);
}

export default App;
