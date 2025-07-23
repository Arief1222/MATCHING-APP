import React, { useEffect, useState } from "react";
import axios from "axios";

const JobHistoryTable = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const ITEMS_PER_PAGE = 3;

  useEffect(() => {
    fetchJobs();

    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ambil token dari localStorage
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    };
  };

  const fetchJobs = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setRefreshing(true);

    try {
      const headers = getAuthHeaders();
      const res = await axios.get("http://127.0.0.1:8001/matching-jobs/", { headers });
      setJobs(res.data);
    } catch (err) {
      console.error("Gagal fetch job:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⏳" },
      Success: { bg: "bg-green-100", text: "text-green-800", icon: "✅" },
      Failed: { bg: "bg-red-100", text: "text-red-800", icon: "❌" },
      Running: { bg: "bg-blue-100", text: "text-blue-800", icon: "🔄" },
    };

    const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-800", icon: "?" };

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
      >
        <span className="mr-1">{config.icon}</span>
        {status}
      </span>
    );
  };

  const getDuration = (startTime, endTime) => {
    if (!startTime) return "-";
    if (!endTime) return "Berjalan...";

    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffSeconds = Math.floor((end - start) / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    return diffMinutes > 0
      ? `${diffMinutes}m ${diffSeconds % 60}s`
      : `${diffSeconds}s`;
  };

  const truncateJobId = (jobId) => {
    return jobId.length > 8 ? `${jobId.substring(0, 8)}...` : jobId;
  };

  const totalPages = Math.ceil(jobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentJobs = jobs.slice(startIndex, endIndex);

  const goToPage = (page) => setCurrentPage(page);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  if (loading) {
    return (
      <div className="mt-10 p-6 bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-slate-600">Memuat riwayat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-10 p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center">
          <span className="mr-2">📋</span>Riwayat Matching Jobs
        </h2>
        <button
          onClick={() => fetchJobs(false)}
          disabled={refreshing}
          className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            refreshing
              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          }`}
        >
          <span className={`mr-2 ${refreshing ? "animate-spin" : ""}`}>🔄</span>
          {refreshing ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-slate-600 mb-2">Belum Ada Riwayat</h3>
          <p className="text-slate-500">Matching job yang Anda jalankan akan muncul di sini</p>
        </div>
      ) : (
        <>
          {/* Table Desktop */}
          <div className="hidden md:block overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durasi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentJobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{truncateJobId(job.job_id)}</div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <span className="mr-1">🗃️</span>{job.table_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(job.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      📅 {formatDateTime(job.start_time)}
                      {job.end_time && <div className="text-xs">🏁 {formatDateTime(job.end_time)}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {getDuration(job.start_time, job.end_time)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <div className="text-sm text-gray-500">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, jobs.length)} dari {jobs.length} jobs
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium ${
                      currentPage === page ? "bg-blue-600 text-white" : "bg-white border border-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors border"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JobHistoryTable;