// frontend/src/pages/MatchingPage.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import TableSelector from "../components/TableSelector";
import MatchingTypeSelector from "../components/MatchingTypeSelector";
import ColumnSelector from "../components/ColumnSelector";
import RecommendedColumns from "../components/RecommendedColumns";
import JobHistoryTable from "../components/JobHistoryTable";

const MatchingPage = ({ 
  getAuthHeaders,
  setLoading 
}) => {
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTableA, setSelectedTableA] = useState(null);
  const [selectedTableB, setSelectedTableB] = useState(null);
  const [matchingType, setMatchingType] = useState("self"); // "self" atau "cross"
  const [columnsA, setColumnsA] = useState([]);
  const [columnsB, setColumnsB] = useState([]);
  const [selectedColumnsA, setSelectedColumnsA] = useState([]);
  const [selectedColumnsB, setSelectedColumnsB] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState([]);
  const [recommendedCols, setRecommendedCols] = useState([]);
  const [showRecommendedCols, setShowRecommendedCols] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [isTableConfirmed, setIsTableConfirmed] = useState(false);

  useEffect(() => {
    fetchAvailableTables();
  }, []);

  const fetchAvailableTables = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get("http://127.0.0.1:8001/tables/", { headers });
      setAvailableTables(res.data.tables || []);
    } catch (err) {
      toast.error("Gagal mengambil daftar tabel");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableColumns = async (tableName) => {
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`http://127.0.0.1:8001/table-operations/?table_name=${tableName}`, { headers });
      return res.data.columns || [];
    } catch (err) {
      toast.error(`Gagal mengambil kolom tabel ${tableName}`);
      console.error("Error fetching columns:", err);
      return [];
    }
  };

  const handleTableASelection = async (table) => {
    setSelectedTableA(table);
    const columns = await fetchTableColumns(table.name);
    setColumnsA(columns);
    
    // Reset state lainnya
    setSelectedColumnsA([]);
    setShowRecommendedCols(false);
    setShowColumnSelector(false);
    setIsTableConfirmed(false);
    setCombinedPreview([]);
    
    // Fetch recommendations jika self matching
    if (matchingType === "self") {
      fetchRecommendations(table.name);
    }
  };

  const handleTableBSelection = async (table) => {
    setSelectedTableB(table);
    const columns = await fetchTableColumns(table.name);
    setColumnsB(columns);
    setSelectedColumnsB([]);
    setIsTableConfirmed(false);
    setCombinedPreview([]);
    
    // Fetch column mapping recommendations
    if (selectedTableA) {
      fetchColumnMappingRecommendations(selectedTableA.name, table.name);
    }
  };

  const fetchRecommendations = async (tableName) => {
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const recRes = await axios.post(
        "http://127.0.0.1:8001/recommend-columns/",
        { table_name: tableName },
        { headers: authHeaders }
      );

      // PERBAIKAN: Pastikan data yang diambil dalam format yang benar
      let rekomendasi = [];
      if (recRes.data?.table_a_recommendations) {
        if (Array.isArray(recRes.data.table_a_recommendations)) {
          rekomendasi = recRes.data.table_a_recommendations.map(item => {
            // Jika item adalah object dengan key 'column', ambil nilai 'column'
            if (typeof item === 'object' && item.column) {
              return item.column;
            }
            // Jika item adalah string, gunakan langsung
            return typeof item === 'string' ? item : String(item);
          });
        }
      }
      
      setRecommendedCols(rekomendasi);
      
      if (rekomendasi.length > 0) {
        setShowRecommendedCols(true);
      } else {
        setShowColumnSelector(true);
      }
    } catch (err) {
      toast.error("Gagal mengambil rekomendasi kolom");
      console.error("Error fetching recommendations:", err);
      setShowColumnSelector(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchColumnMappingRecommendations = async (tableA, tableB) => {
    setLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const recRes = await axios.post(
        "http://127.0.0.1:8001/recommend-columns/",
        { table_name: tableA, table_b: tableB },
        { headers: authHeaders }
      );

      // PERBAIKAN: Handle column mapping recommendations dengan lebih aman
      if (recRes.data?.column_mapping_recommendations) {
        let mappingRecommendations = [];
        
        if (Array.isArray(recRes.data.column_mapping_recommendations)) {
          mappingRecommendations = recRes.data.column_mapping_recommendations.map(item => {
            if (typeof item === 'object') {
              // Jika object memiliki struktur mapping, ekstrak informasi yang relevan
              if (item.column_a && item.column_b) {
                return `${item.column_a} ↔ ${item.column_b}`;
              }
              if (item.column) {
                return item.column;
              }
              // Fallback ke string representation
              return JSON.stringify(item);
            }
            return String(item);
          });
        }
        
        setRecommendedCols(mappingRecommendations);
        setShowRecommendedCols(true);
      } else {
        setShowColumnSelector(true);
      }
    } catch (err) {
      toast.error("Gagal mengambil rekomendasi mapping kolom");
      console.error("Error fetching column mapping:", err);
      setShowColumnSelector(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchingTypeChange = (type) => {
    setMatchingType(type);
    setSelectedTableB(null);
    setColumnsB([]);
    setSelectedColumnsB([]);
    setShowRecommendedCols(false);
    setShowColumnSelector(false);
    setIsTableConfirmed(false);
    setCombinedPreview([]);
    
    // Jika ganti ke self matching dan sudah ada table A, fetch recommendations
    if (type === "self" && selectedTableA) {
      fetchRecommendations(selectedTableA.name);
    }
  };

  const handleCheckboxChangeA = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setSelectedColumnsA(prev => 
      checked ? [...prev, value] : prev.filter(col => col !== value)
    );
  };

  const handleCheckboxChangeB = (e) => {
    const value = e.target.value;
    const checked = e.target.checked;
    setSelectedColumnsB(prev => 
      checked ? [...prev, value] : prev.filter(col => col !== value)
    );
  };

  const handleSubmitColumns = async () => {
    if (selectedColumnsA.length === 0) 
      return toast.warn("Pilih minimal satu kolom dari tabel utama!");
    
    if (matchingType === "cross" && selectedColumnsB.length === 0) 
      return toast.warn("Pilih minimal satu kolom dari tabel kedua!");
    
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.post(
        "http://127.0.0.1:8001/prepare-combined/",
        {
          table_name: selectedTableA.name,
          selected_columns: selectedColumnsA,
        },
        { headers }
      );
      
      // PERBAIKAN: Pastikan data preview dalam format yang benar
      let previewData = [];
      if (res.data?.data && Array.isArray(res.data.data)) {
        previewData = res.data.data.slice(0, 5).map(row => {
          // Pastikan setiap row adalah object yang valid
          if (typeof row === 'object' && row !== null) {
            return row;
          }
          return {};
        });
      }
      
      setCombinedPreview(previewData);
      toast.success("Kolom berhasil digabung!");
    } catch (err) {
      toast.error("Gagal menggabungkan kolom!");
      console.error("Error in handleSubmitColumns:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async () => {
    if (!selectedTableA || selectedColumnsA.length === 0) {
      return toast.warn("Pastikan tabel dan kolom sudah dipilih!");
    }

    if (matchingType === "cross" && (!selectedTableB || selectedColumnsB.length === 0)) {
      return toast.warn("Untuk cross matching, pilih tabel kedua dan kolomnya!");
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        "http://127.0.0.1:8001/start-matching/",
        {
          table_a: selectedTableA.name,
          table_b: matchingType === "cross" ? selectedTableB.name : null,
          columns_a: selectedColumnsA,
          columns_b: matchingType === "cross" ? selectedColumnsB : null
        },
        { headers }
      );
      
      console.log("Matching started:", response.data);
      toast.success("Proses matching dimulai! Cek status di Job History.");
    } catch (err) {
      toast.error("Matching gagal!");
      console.error("Error in handleMatch:", err);
      
      // Log error details untuk debugging
      if (err.response) {
        console.error("Error response:", err.response.data);
        console.error("Error status:", err.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRecommendation = async () => {
    // PERBAIKAN: Handle recommended columns dengan lebih aman
    let processedRecommendations = [];
    
    if (matchingType === "cross") {
      // Untuk cross matching, mungkin format berbeda
      processedRecommendations = recommendedCols.map(rec => {
        if (typeof rec === 'string' && rec.includes(' ↔ ')) {
          // Jika format "columnA ↔ columnB", ambil columnA
          return rec.split(' ↔ ')[0];
        }
        return rec;
      });
    } else {
      // Untuk self matching
      processedRecommendations = [...recommendedCols];
    }
    
    setSelectedColumnsA(processedRecommendations);
    setShowRecommendedCols(false);
    toast.success("Menggunakan kolom yang direkomendasikan!");

    setLoading(true);
    try {
      // Proses kolom terlebih dahulu
      const headers = await getAuthHeaders();
      const processRes = await axios.post(
        "http://127.0.0.1:8001/prepare-combined/",
        {
          table_name: selectedTableA.name,
          selected_columns: processedRecommendations,
        },
        { headers }
      );
      
      // PERBAIKAN: Handle preview data
      let previewData = [];
      if (processRes.data?.data && Array.isArray(processRes.data.data)) {
        previewData = processRes.data.data.slice(0, 5).map(row => {
          if (typeof row === 'object' && row !== null) {
            return row;
          }
          return {};
        });
      }
      
      setCombinedPreview(previewData);
      toast.success("Kolom berhasil digabung!");

      // Langsung lakukan matching
      await axios.post(
        "http://127.0.0.1:8001/start-matching/",
        {
          table_a: selectedTableA.name,
          table_b: matchingType === "cross" ? selectedTableB?.name : null,
          columns_a: processedRecommendations,
          columns_b: matchingType === "cross" ? selectedColumnsB : null
        },
        { headers }
      );
      toast.success("Proses matching dimulai! Cek status di Job History.");
    } catch (err) {
      toast.error("Gagal memproses kolom atau matching!");
      console.error("Error in handleAcceptRecommendation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">🔍 Data Matching</h1>
        <p className="text-gray-600 mb-6">
          Pilih data yang ingin di-matching. Anda dapat melakukan self-matching (dalam satu tabel) 
          atau cross-matching (antara dua tabel berbeda).
        </p>

        {/* Pilih tipe matching */}
        <MatchingTypeSelector 
          matchingType={matchingType}
          onTypeChange={handleMatchingTypeChange}
        />

        {/* Pilih tabel */}
        <TableSelector
          availableTables={availableTables}
          selectedTableA={selectedTableA}
          selectedTableB={selectedTableB}
          matchingType={matchingType}
          onTableASelection={handleTableASelection}
          onTableBSelection={handleTableBSelection}
        />

        {/* Info tabel terpilih */}
        {selectedTableA && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              📊 Tabel Utama: {selectedTableA.name}
            </h3>
            <div className="flex flex-wrap gap-4 text-sm text-green-700">
              <span>📏 {selectedTableA.records?.toLocaleString()} baris</span>
              <span>📊 {selectedTableA.columns} kolom</span>
              <span>💾 {selectedTableA.size}</span>
            </div>
          </div>
        )}

        {matchingType === "cross" && selectedTableB && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              📊 Tabel Kedua: {selectedTableB.name}
            </h3>
            <div className="flex flex-wrap gap-4 text-sm text-blue-700">
              <span>📏 {selectedTableB.records?.toLocaleString()} baris</span>
              <span>📊 {selectedTableB.columns} kolom</span>
              <span>💾 {selectedTableB.size}</span>
            </div>
          </div>
        )}
      </div>

      {selectedTableA && !isTableConfirmed && (
        <div className="mt-4">
          <button
            onClick={() => {
              setIsTableConfirmed(true);
              if (matchingType === "self") {
                fetchRecommendations(selectedTableA.name);
              } else if (matchingType === "cross" && selectedTableA && selectedTableB) {
                fetchColumnMappingRecommendations(selectedTableA.name, selectedTableB.name);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
          >
            ✅ Konfirmasi Tabel
          </button>
        </div>
      )}
          
      {/* Rekomendasi Kolom */}
      {showRecommendedCols && (
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
                {/* PERBAIKAN: Pastikan col adalah string */}
                {typeof col === 'string' ? col : JSON.stringify(col)}
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
      )}

      {/* Column Selector */}
      {showColumnSelector && (
        <ColumnSelector
          matchingType={matchingType}
          columnsA={columnsA}
          columnsB={columnsB}
          selectedColumnsA={selectedColumnsA}
          selectedColumnsB={selectedColumnsB}
          handleCheckboxChangeA={handleCheckboxChangeA}
          handleCheckboxChangeB={handleCheckboxChangeB}
          handleSubmitColumns={handleSubmitColumns}
          handleMatch={handleMatch}
          combinedPreview={combinedPreview}
        />
      )}

      <JobHistoryTable />
    </div>
  );
};

export default MatchingPage;