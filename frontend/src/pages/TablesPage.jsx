// components/TablesPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";

const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8001/tables/");
        console.log("Data tabel:", res.data);
        setTables(res.data.tables || []);
      } catch (err) {
        console.error("Gagal mengambil tabel:", err);
        setError("Gagal mengambil data tabel.");
      } finally {
        setLoading(false);
      }
    };
    fetchTables();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Manajemen Tabel</h2>
      <p className="mb-6 text-gray-600">Halaman untuk mengelola tabel data yang diunggah.</p>

      {loading && <p className="text-blue-500">Memuat daftar tabel...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && tables.length === 0 && (
        <p className="text-gray-400 italic">Tidak ada tabel ditemukan.</p>
      )}

      {!loading && tables.length > 0 && (
        <ul className="list-disc pl-6 space-y-1">
          {tables.map((tableName, idx) => (
            <li key={idx} className="text-slate-800 hover:text-blue-600 cursor-pointer">
              {tableName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TablesPage;
