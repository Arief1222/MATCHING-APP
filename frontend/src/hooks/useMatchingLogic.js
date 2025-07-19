import { useState } from "react";
import axios from "axios";
import { utils, writeFile } from "xlsx";

const useMatchingLogic = () => {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState([]);
  const [isMatching, setIsMatching] = useState(false);
  const [matches, setMatches] = useState([]);
  const [recommendedCols, setRecommendedCols] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 1 });
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
    setIsUploading(true);
    const res = await axios.post("http://127.0.0.1:8000/upload/", formData);
    alert("✅ File berhasil diupload!");
    setColumns(res.data.columns);
  } catch (err) {
    alert("❌ Gagal upload file");
    console.error(err);
  } finally {
    setIsUploading(false);
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
    if (selectedColumns.length === 0) return alert("Pilih minimal satu kolom!");

    try {
      const res = await axios.post("http://127.0.0.1:8000/process_columns/", {
        columns: selectedColumns,
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
      pollProgress();
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

  return {
    file,
    setFile,
    columns,
    selectedColumns,
    combinedPreview,
    isMatching,
    matches,
    recommendedCols,
    progress,
    handleFileChange,
    handleUpload,
    handleCheckboxChange,
    handleSubmitColumns,
    handleMatch,
    fetchRecommendations,
    exportToExcel,
  };
};

export default useMatchingLogic;