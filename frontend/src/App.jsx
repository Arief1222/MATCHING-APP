import React, { useState, useEffect } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useAuth,
} from "@clerk/clerk-react";
import axios from "axios";
import ClipLoader from "react-spinners/ClipLoader";
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import Header from "./components/Header";
import UploadFile from "./components/UploadFile";
import ColumnSelector from "./components/ColumnSelector";
import MatchResultTable from "./components/MatchResultTable";
import JobHistoryTable from "./components/JobHistoryTable";
import Sidebar from "./components/sidebar"; // Import sidebar baru

function App() {
  const { getToken } = useAuth();
  const [file, setFile] = useState(null);
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [combinedPreview, setCombinedPreview] = useState([]);
  const [matches, setMatches] = useState([]);
  const [recommendedCols, setRecommendedCols] = useState([]);
  const [useRecommendation, setUseRecommendation] = useState(null);
  const [lastValidated, setLastValidated] = useState(null);
  const [activeMenu, setActiveMenu] = useState("upload"); // upload, match, unmatch, etc.
  const [showRecommendedCols, setShowRecommendedCols] = useState(false);
  const [skipColumnSelection, setSkipColumnSelection] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [loading, setLoading] = useState(false);

  // State untuk sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    // Reset hanya sekali saat komponen pertama kali dimount
    setRecommendedCols([]);
    setShowRecommendedCols(false);
    setSkipColumnSelection(false);
    setSelectedColumns([]);
    setShowColumnSelector(false);
  }, []);

  // Helper function untuk mendapatkan headers dengan token
  const getAuthHeaders = async () => {
    try {
      const token = await getToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {};
    }
  };

  // Helper function untuk multipart/form-data dengan token
  const getAuthHeadersMultipart = async () => {
    try {
      const token = await getToken();
      return {
        'Authorization': `Bearer ${token}`
      };
    } catch (error) {
      console.error('Error getting auth token:', error);
      return {};
    }
  };

  // Handler untuk toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Handler ketika tabel dipilih dari sidebar
  const handleTableSelect = async (table) => {
    setSelectedTable(table);
    setTableName(table.name);
    setSidebarOpen(false); // Tutup sidebar

    // Set kolom dari tabel yang dipilih
    setColumns(table.column_names || []);

    // Ambil rekomendasi kolom untuk tabel ini
    if (table.name) {
      setLoading(true);
      try {
        const authHeaders = await getAuthHeaders();
        const recRes = await axios.post("http://127.0.0.1:8001/recommend-columns/", {
          table_name: table.name
        }, { headers: authHeaders });

        const rekomendasi = recRes.data?.table_a_recommendations || [];
        if (rekomendasi.length > 0) {
          setRecommendedCols(rekomendasi.map((item) => item.column));
          setShowRecommendedCols(true); // Tampilkan popup rekomendasi
        } else {
          // Fallback: jika tidak ada rekomendasi, langsung tampilkan semua kolom
          setRecommendedCols(table.column_names || []);
          setShowColumnSelector(true); // Tampilkan column selector
        }

        toast.success(`Tabel "${table.name}" berhasil dipilih!`);
      } catch (err) {
        toast.error("Gagal mengambil rekomendasi kolom");
        console.error(err);
        // Tetap tampilkan column selector meski gagal ambil rekomendasi
        setShowColumnSelector(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.warn("Pilih file terlebih dahulu");
    if (!tableName) return toast.warn("Isi nama tabel terlebih dahulu");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("table_name", tableName);

    try {
      const headers = await getAuthHeadersMultipart();
      const res = await axios.post("http://127.0.0.1:8001/upload/", formData, { headers });
      toast.success("File berhasil diupload!");
      setColumns(res.data.columns); // Simpan semua kolom

      // Ambil rekomendasi kolom dari backend
      const authHeaders = await getAuthHeaders();
      const recRes = await axios.post("http://127.0.0.1:8001/recommend-columns/", {
        table_name: tableName
      }, { headers: authHeaders });

      const rekomendasi = recRes.data?.table_a_recommendations || [];
      if (rekomendasi.length > 0) {
        setRecommendedCols(rekomendasi.map((item) => item.column));
        setShowRecommendedCols(true); // Tampilkan popup rekomendasi
      } else {
        // Fallback: jika tidak ada rekomendasi, langsung tampilkan semua kolom
        setRecommendedCols(res.data.columns || []);
        setShowColumnSelector(true); // Tampilkan column selector
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
      const headers = await getAuthHeaders();
      const res = await axios.post("http://127.0.0.1:8001/prepare-combined/", {
        table_name: tableName,
        selected_columns: selectedColumns,
      }, { headers });
      toast.success("Kolom berhasil digabung!");
      setCombinedPreview(res.data.data?.slice(0, 5) || []); // Tampilkan 5 sample data
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
      const res = await axios.post("http://127.0.0.1:8001/start-matching/", {
        table_a: tableName,
        table_b: null, // Self matching
        columns_a: selectedColumns,
        columns_b: null
      }, { headers });

      if (res.data.job_id) {
        toast.success("Proses matching dimulai! Cek status di Job History.");
        // Polling status job bisa ditambahkan di sini
      }
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
      const headers = await getAuthHeaders();
      const res = await axios.get(
        "http://127.0.0.1:8001/export/",
        {
          responseType: "blob",
          headers
        }
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
      const headers = await getAuthHeaders();
      const res = await axios.post("http://127.0.0.1:8001/recommend-columns/", {
        table_name: tableName
      }, { headers });
      setRecommendedCols(res.data?.table_a_recommendations?.map(item => item.column) || []);
    } catch (err) {
      toast.error("Gagal mengambil rekomendasi kolom");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk tombol "Ya" pada popup rekomendasi
  const handleAcceptRecommendation = async () => {
    setSelectedColumns(recommendedCols);
    setShowRecommendedCols(false);
    toast.success("Menggunakan kolom yang direkomendasikan!");

    // Langsung proses kolom dan matching
    setLoading(true);
    try {
      // Proses kolom terlebih dahulu
      const headers = await getAuthHeaders();
      const processRes = await axios.post("http://127.0.0.1:8001/prepare-combined/", {
        table_name: tableName,
        selected_columns: recommendedCols,
      }, { headers });
      setCombinedPreview(processRes.data.data?.slice(0, 5) || []);
      toast.success("Kolom berhasil digabung!");

      // Langsung lakukan matching
      const matchRes = await axios.post("http://127.0.0.1:8001/start-matching/", {
        table_a: tableName,
        table_b: null,
        columns_a: recommendedCols,
        columns_b: null
      }, { headers });

      if (matchRes.data.job_id) {
        toast.success("Proses matching dimulai! Cek status di Job History.");
      }
    } catch (err) {
      toast.error("Gagal memproses kolom atau matching!");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handler untuk tombol "Tidak" pada popup rekomendasi
  const handleRejectRecommendation = () => {
    setShowRecommendedCols(false);
    setShowColumnSelector(true); // Tampilkan column selector
    setUseRecommendation(true);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex">
      {/* Sidebar */}
      <SignedIn>
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          onTableSelect={handleTableSelect}
          onMenuSelect={(menu) => {
            setActiveMenu(menu);
            setSidebarOpen(false); // Tutup sidebar setelah klik
          }}
        />
        

      </SignedIn>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : ''}`}>
        <div className="p-4">
          <Header onToggleSidebar={toggleSidebar} />

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
            {/* Info Tabel yang Dipilih */}
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
              handleUpload={handleUpload}
            />

            {/* Popup Rekomendasi Kolom */}
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
                      onClick={handleRejectRecommendation}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      ❌ Tidak, Pilih Manual
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showColumnSelector && (
              <ColumnSelector
                columns={columns}
                selectedColumns={selectedColumns}
                handleCheckboxChange={handleCheckboxChange}
                handleSubmitColumns={handleSubmitColumns}
              />
            )}

            {combinedPreview.length > 0 && (
              <div className="mb-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    📋 Preview Data Gabungan (5 baris pertama)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left font-medium text-gray-700 border">
                            Combined Column
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 border text-gray-700">
                              {row.combined_column}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleMatch}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                      disabled={loading}
                    >
                      🚀 Mulai Matching
                    </button>
                  </div>
                </div>
              </div>
            )}


            <JobHistoryTable />

            {/* <div className="mt-6 text-center">
              <button
                onClick={exportToExcel}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg hover:shadow-xl"
                disabled={loading}
              >
                📥 Export ke Excel
              </button>
            </div> */}
          </SignedIn>

          {loading && <LoadingOverlay />}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </div>
    </div>
  );
}

export default App;
