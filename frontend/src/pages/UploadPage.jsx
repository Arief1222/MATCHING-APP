// frontend/src/pages/UploadPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import UploadFile from "../components/UploadFile";
import ColumnSelector from "../components/ColumnSelector";
import RecommendedColumns from "../components/RecommendedColumns";
import JobHistoryTable from "../components/JobHistoryTable";

const UploadPage = ({ 
  getAuthHeaders,
  getAuthHeadersMultipart,
  selectedTable, 
  setSelectedTable,
  setLoading 
}) => {
  const [file, setFile] = useState(null);
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState([]);
  const [recommendedCols, setRecommendedCols] = useState([]);
  const [showRecommendedCols, setShowRecommendedCols] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [isProcessingColumns, setIsProcessingColumns] = useState(false);
  const [isUploading, setIsUploading] = useState(false);


  useEffect(() => {
    if (selectedTable) {
      setTableName(selectedTable.name);
      setColumns(selectedTable.column_names || []);
      fetchRecommendations();
    }
  }, [selectedTable]);

  const fetchRecommendations = async () => {
    if (!selectedTable?.name) return;
    
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const recRes = await axios.post(
        "http://127.0.0.1:8001/recommend-columns/",
        { table_name: selectedTable.name },
        { headers: authHeaders }
      );

      const rekomendasi = recRes.data?.table_a_recommendations?.map(item => item.column) || [];
      setRecommendedCols(rekomendasi);
      
      if (rekomendasi.length > 0) {
        setShowRecommendedCols(true);
      } else {
        setShowColumnSelector(true);
      }
    } catch (err) {
      toast.error("Gagal mengambil rekomendasi kolom");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

const handleUpload = async () => {
  if (!file) return toast.warn("Pilih file terlebih dahulu");
  if (!tableName) return toast.warn("Isi nama tabel terlebih dahulu");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("table_name", tableName);

  setIsUploading(true); // mulai loading tombol
  try {
    const headers = await getAuthHeadersMultipart();
    const res = await axios.post(
      "http://127.0.0.1:8001/upload/",
      formData,
      { headers }
    );

    toast.success("File berhasil diupload!");
    setColumns(res.data.columns);
    setSelectedTable({
      name: tableName,
      original_filename: file.name,
      row_count: res.data.row_count,
      column_names: res.data.columns
    });

    const authHeaders = await getAuthHeaders();
    const recRes = await axios.post(
      "http://127.0.0.1:8001/recommend-columns/",
      { table_name: tableName },
      { headers: authHeaders }
    );

    const rekomendasi = recRes.data?.table_a_recommendations || [];
    if (rekomendasi.length > 0) {
      setRecommendedCols(rekomendasi.map(item => item.column));
      setShowRecommendedCols(true);
    } else {
      setShowColumnSelector(true);
    }
  } catch (err) {
    toast.error("Gagal upload file");
    console.error(err);
  } finally {
    setIsUploading(false); // selesai loading tombol
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
    if (selectedColumns.length === 0) 
      return toast.warn("Pilih minimal satu kolom!");
    
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.post(
        "http://127.0.0.1:8001/prepare-combined/",
        {
          table_name: tableName,
          selected_columns: selectedColumns,
        },
        { headers }
      );
      toast.success("Kolom berhasil digabung!");
      setCombinedPreview(res.data.data?.slice(0, 5) || []);
    } catch (err) {
      toast.error("Gagal menggabungkan kolom!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
    if (!tableName || selectedColumns.length === 0) {
      return toast.warn("Pastikan tabel dan kolom sudah dipilih!");
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        "http://127.0.0.1:8001/start-matching/",
        {
          table_a: tableName,
          table_b: null,
          columns_a: selectedColumns,
          columns_b: null
        },
        { headers }
      );
      toast.success("Proses matching dimulai! Cek status di Job History.");
    } catch (err) {
      toast.error("Matching gagal!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRecommendation = async () => {
    setSelectedColumns(recommendedCols);
    setShowRecommendedCols(false);
    toast.success("Menggunakan kolom yang direkomendasikan!");

    setLoading(true);
    try {
      // Proses kolom terlebih dahulu
      const headers = await getAuthHeaders();
      const processRes = await axios.post(
        "http://127.0.0.1:8001/prepare-combined/",
        {
          table_name: tableName,
          selected_columns: recommendedCols,
        },
        { headers }
      );
      setCombinedPreview(processRes.data.data?.slice(0, 5) || []);
      toast.success("Kolom berhasil digabung!");

      // Langsung lakukan matching
      await axios.post(
        "http://127.0.0.1:8001/start-matching/",
        {
          table_a: tableName,
          table_b: null,
          columns_a: recommendedCols,
          columns_b: null
        },
        { headers }
      );
      toast.success("Proses matching dimulai! Cek status di Job History.");
    } catch (err) {
      toast.error("Gagal memproses kolom atau matching!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Tabel */}
      {selectedTable && (
        <div className="mb-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              📊 Tabel Aktif: {selectedTable.name}
            </h3>
            <div className="flex flex-wrap gap-4 text-sm text-green-700">
              <span>📄 {selectedTable.original_filename}</span>
              <span>📏 {selectedTable.row_count?.toLocaleString()} baris</span>
              <span>📊 {selectedTable.column_names?.length} kolom</span>
            </div>
          </div>
        </div>
      )}

<UploadFile
  file={file}
  setFile={setFile}
  tableName={tableName}
  setTableName={setTableName}
  handleUpload={(setIsUploading) => handleUpload(file, tableName, setIsUploading)}
  setIsUploading={setIsUploading}
/>

      {/* Rekomendasi Kolom */}
      {showRecommendedCols && (
        <div className="mb-4 px-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🎯 Rekomendasi Kolom
            </h3>
            <p className="text-blue-700 mb-3">
              Sistem merekomendasikan kolom-kolom berikut untuk matching:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {recommendedCols.map((col, idx) => (
                <span
                  key={idx}
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {col}
                </span>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleAcceptRecommendation}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
              >
                ✅ Ya, Gunakan Rekomendasi
              </button>
              <button
                onClick={() => {
                  setShowRecommendedCols(false);
                  setShowColumnSelector(true);
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
              >
                ❌ Tidak, Pilih Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Selector */}
      {showColumnSelector && (
        <ColumnSelector
          columns={columns}
          selectedColumns={selectedColumns}
          handleCheckboxChange={handleCheckboxChange}
          handleSubmitColumns={handleSubmitColumns}
          handleMatch={handleMatch}
          combinedPreview={combinedPreview}
        />
      )}

      <JobHistoryTable />
    </div>
  );
};

export default UploadPage;