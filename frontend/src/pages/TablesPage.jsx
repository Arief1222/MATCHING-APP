import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  Database, 
  RefreshCw, 
  Filter,
  Download,
  MoreVertical,
  AlertCircle,
  CheckCircle,
  Calendar,
  Hash
} from "lucide-react";

const TablesPage = () => {
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTables, setSelectedTables] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // State untuk modal detail tabel
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTableDetail, setSelectedTableDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Function untuk mendapatkan detail tabel
  const fetchTableDetail = async (tableName) => {
    try {
      setLoadingDetail(true);
      setError(""); // Clear previous errors
      const response = await fetch(`http://127.0.0.1:8001/tables/${tableName}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSelectedTableDetail(data);
      setShowDetailModal(true);
    } catch (err) {
      console.error("Gagal mendapatkan detail tabel:", err);
      setError(`Gagal mendapatkan detail tabel: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    filterAndSortTables();
  }, [tables, searchTerm, sortBy, sortOrder]);

  const fetchTables = async () => {
    try {
      setRefreshing(true);
      setError("");
      const response = await fetch("http://127.0.0.1:8001/tables/");
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Data tabel:", data);
      
      // Data sudah lengkap dari backend, tinggal format sesuai kebutuhan frontend
      const tablesWithDetails = (data.tables || []).map(table => ({
        name: typeof table === 'string' ? table : table.name,
        records: typeof table === 'object' ? (table.records || table.actual_rows || 0) : 0,
        size: typeof table === 'object' ? table.size : '0 bytes',
        lastModified: typeof table === 'object' && table.last_modified 
          ? new Date(table.last_modified) 
          : new Date(),
        type: typeof table === 'object' ? table.type || 'BASE TABLE' : 'BASE TABLE',
        status: typeof table === 'object' ? table.status || 'active' : 'active',
        columns: typeof table === 'object' ? (table.columns || 0) : 0
      }));
      
      setTables(tablesWithDetails);
    } catch (err) {
      console.error("Gagal mengambil tabel:", err);
      setError(`Gagal mengambil data tabel: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndSortTables = () => {
    let filtered = tables.filter(table =>
      table.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'lastModified') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'records') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else {
        aValue = aValue.toString().toLowerCase();
        bValue = bValue.toString().toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredTables(filtered);
  };

  const handleSelectTable = (tableName) => {
    setSelectedTables(prev =>
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleSelectAll = () => {
    setSelectedTables(
      selectedTables.length === filteredTables.length
        ? []
        : filteredTables.map(t => t.name)
    );
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteTable = async (tableName) => {
    try {
      setError("");
      console.log(`Menghapus tabel: ${tableName}`);
      
      const response = await fetch(`http://127.0.0.1:8001/tables/${tableName}/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      // Berhasil hapus, update state
      setTables(prev => prev.filter(t => t.name !== tableName));
      setSelectedTables(prev => prev.filter(t => t !== tableName));
      setShowDeleteModal(false);
      setTableToDelete(null);
      
      // Show success message (optional)
      console.log(data.message);
      
    } catch (err) {
      console.error("Gagal menghapus tabel:", err);
      setError(`Gagal menghapus tabel: ${err.message}`);
      setShowDeleteModal(false);
      setTableToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTables.length === 0) return;
    
    try {
      setError("");
      console.log("Bulk delete:", selectedTables);
      
      const response = await fetch('http://127.0.0.1:8001/tables/bulk/delete/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          table_names: selectedTables
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle specific error cases
        if (data.details) {
          let errorMsg = "Beberapa tabel tidak dapat dihapus:\\n";
          if (data.details.protected_tables?.length > 0) {
            errorMsg += `• Tabel yang dilindungi: ${data.details.protected_tables.join(', ')}\\n`;
          }
          if (data.details.missing_tables?.length > 0) {
            errorMsg += `• Tabel tidak ditemukan: ${data.details.missing_tables.join(', ')}\\n`;
          }
          if (data.details.invalid_tables?.length > 0) {
            errorMsg += `• Nama tabel tidak valid: ${data.details.invalid_tables.join(', ')}`;
          }
          throw new Error(errorMsg);
        }
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }
      
      // Update state berdasarkan hasil bulk delete
      if (data.deleted_tables?.length > 0) {
        setTables(prev => prev.filter(t => !data.deleted_tables.includes(t.name)));
        setSelectedTables([]);
        console.log(`${data.total_deleted} tabel berhasil dihapus`);
      }
      
      // Show warning jika ada yang gagal
      if (data.failed_tables?.length > 0) {
        const failedNames = data.failed_tables.map(f => f.table).join(', ');
        setError(`Beberapa tabel gagal dihapus: ${failedNames}`);
      }
      
    } catch (err) {
      console.error("Gagal bulk delete:", err);
      setError(err.message);
    }
  };

  const formatDate = (date) => {
    try {
      return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Memuat daftar tabel...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            {/* <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              Manajemen Tabel
            </h1>
            <p className="text-gray-600 mt-1">
              Kelola dan pantau tabel database Anda dengan mudah
            </p> */}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTables}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tabel</p>
                <p className="text-2xl font-bold text-gray-900">{tables.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tables.filter(t => t.status === 'active').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Hash className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tables.reduce((acc, t) => acc + (t.records || 0), 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Terpilih</p>
                <p className="text-2xl font-bold text-gray-900">{selectedTables.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div className="flex-1">
            <p className="text-red-700 whitespace-pre-line">{error}</p>
          </div>
          <button 
            onClick={() => setError("")}
            className="text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari tabel..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Nama</option>
                <option value="records">Records</option>
                <option value="lastModified">Terakhir Diubah</option>
                <option value="size">Ukuran</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
              {selectedTables.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus ({selectedTables.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredTables.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? 'Tidak ada tabel yang sesuai pencarian' : 'Tidak ada tabel ditemukan'}
            </p>
            <p className="text-gray-400">
              {searchTerm ? 'Coba kata kunci lain' : 'Upload tabel pertama Anda untuk memulai'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
                      checked={filteredTables.length > 0 && selectedTables.length === filteredTables.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th 
                    className="text-left p-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Nama Tabel {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="text-left p-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('records')}
                  >
                    Records {sortBy === 'records' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">Ukuran</th>
                  <th className="text-left p-4 font-semibold text-gray-900">Status</th>
                  <th 
                    className="text-left p-4 font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('lastModified')}
                  >
                    Terakhir Diubah {sortBy === 'lastModified' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-left p-4 font-semibold text-gray-900">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTables.map((table) => (
                  <tr key={table.name} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.name)}
                        onChange={() => handleSelectTable(table.name)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Database className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{table.name}</p>
                          <p className="text-sm text-gray-500">{table.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-900">{(table.records || 0).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-gray-600">{table.size || '0 bytes'}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        table.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {table.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">{formatDate(table.lastModified)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchTableDetail(table.name)}
                          disabled={loadingDetail}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Lihat Detail"
                        >
                          {loadingDetail ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTableToDelete(table.name);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Hapus</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Apakah Anda yakin ingin menghapus tabel <strong>{tableToDelete}</strong>? 
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setTableToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteTable(tableToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTableDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Detail Tabel: {selectedTableDetail.name}</h3>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTableDetail(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Informasi Dasar</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Nama:</span> {selectedTableDetail.name}</div>
                  <div><span className="font-medium">Tipe:</span> {selectedTableDetail.type}</div>
                  <div><span className="font-medium">Kolom:</span> {selectedTableDetail.column_count}</div>
                  <div><span className="font-medium">Records:</span> {(selectedTableDetail.actual_rows || 0).toLocaleString('id-ID')}</div>
                  <div><span className="font-medium">Ukuran:</span> {selectedTableDetail.size}</div>
                </div>
              </div>
              
              {selectedTableDetail.statistics && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Statistik</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Insert:</span> {selectedTableDetail.statistics.total_inserts || 0}</div>
                    <div><span className="font-medium">Update:</span> {selectedTableDetail.statistics.total_updates || 0}</div>
                    <div><span className="font-medium">Delete:</span> {selectedTableDetail.statistics.total_deletes || 0}</div>
                    <div><span className="font-medium">Live Tuples:</span> {selectedTableDetail.statistics.live_tuples || 0}</div>
                    <div><span className="font-medium">Dead Tuples:</span> {selectedTableDetail.statistics.dead_tuples || 0}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-2">Struktur Kolom</h4>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nullable</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Default</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Max Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(selectedTableDetail.columns || []).map((column, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{column.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{column.type}</td>
                        <td className="px-4 py-2 text-sm">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                            column.nullable ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {column.nullable ? 'Ya' : 'Tidak'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600">{column.default || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{column.max_length || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sample Data Preview */}
            {selectedTableDetail.sample_data && selectedTableDetail.sample_data.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Preview Data (5 baris pertama)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 rounded-lg text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(selectedTableDetail.sample_data[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase border-r">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedTableDetail.sample_data.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="px-3 py-2 text-gray-600 border-r max-w-xs truncate">
                              {value?.toString() || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Indexes Information */}
            {selectedTableDetail.indexes && selectedTableDetail.indexes.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Indeks</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kolom</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unique</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedTableDetail.indexes.map((index, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{index.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{index.columns?.join(', ') || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{index.type || 'btree'}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                              index.unique ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {index.unique ? 'Ya' : 'Tidak'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Foreign Keys */}
            {selectedTableDetail.foreign_keys && selectedTableDetail.foreign_keys.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Foreign Keys</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kolom</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referensi Tabel</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Referensi Kolom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedTableDetail.foreign_keys.map((fk, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{fk.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{fk.column}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{fk.referenced_table}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{fk.referenced_column}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTableDetail(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Tutup
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Export Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablesPage;