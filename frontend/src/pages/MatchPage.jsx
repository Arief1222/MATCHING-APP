// frontend/src/pages/MatchPage.jsx
import React, { useEffect } from "react";
import MatchResultTable from "../components/MatchResultTable";

const MatchPage = ({ getAuthHeaders, selectedTable, setLoading }) => {
  useEffect(() => {
    console.log("📥 MatchPage Mounted");
    if (selectedTable) {
      console.log("✅ selectedTable tersedia:", selectedTable);
    } else {
      console.warn("⚠️ selectedTable belum tersedia.");
    }

    // Coba tes apakah getAuthHeaders mengembalikan hasil yang valid
    const testAuthHeaders = async () => {
      try {
        const headers = await getAuthHeaders();
        console.log("🛂 Auth Headers berhasil diambil:", headers);
      } catch (err) {
        console.error("❌ Gagal mengambil auth headers:", err);
      }
    };

    testAuthHeaders();
  }, [selectedTable, getAuthHeaders]);

  return (
    <div className="space-y-6">
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

      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">🔍 Matching</h2>
        <p className="text-slate-600 mb-4">
          Hasil matching untuk tabel yang dipilih akan ditampilkan di sini
        </p>
      </div>

      <MatchResultTable getAuthHeaders={getAuthHeaders} setLoading={setLoading} />
    </div>
  );
};

export default MatchPage;
