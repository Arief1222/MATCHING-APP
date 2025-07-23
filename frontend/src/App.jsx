import React, { useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import Header from "./components/Header";
import Sidebar from "./components/sidebar";

// Pages
import UploadPage from "./pages/UploadPage";
import MatchingPage from "./pages/MatchingPage";
import UnmatchPage from "./pages/UnmatchPage";
import AssignmentPage from "./pages/AssignmentPage";
import LabelingPage from "./pages/LabelingPage";
import LoginPage from "./pages/LoginPage"; // ✅ Import LoginPage

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("upload");
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setSidebarOpen(false);
  };

  const handleMenuSelect = (menu) => {
    setActiveMenu(menu);
    setSidebarOpen(false);
  };

  // 🔒 Ambil token dari localStorage
  const token = localStorage.getItem("token");

  // ✅ Tampilkan LoginPage jika belum login
  if (!token || token === "null" || token === "undefined") {
    return <LoginPage />;
  }

  // ✅ Fungsi untuk mengirim Authorization Header
  const getAuthHeaders = async () => {
    return {
      Authorization: `Token ${token}`,
    };
  };

  const getAuthHeadersMultipart = async () => {
    return {
      Authorization: `Token ${token}`,
      "Content-Type": "multipart/form-data",
    };
  };

  // ✅ Render halaman aktif
  const renderActivePage = () => {
    const commonProps = {
      getAuthHeaders,
      getAuthHeadersMultipart,
      selectedTable,
      setSelectedTable,
      setLoading,
    };

    switch (activeMenu) {
      case "upload":
        return <UploadPage {...commonProps} />;
      case "match":
        return <MatchingPage {...commonProps} />;
      case "unmatch":
        return <UnmatchPage {...commonProps} />;
      case "assignment":
        return <AssignmentPage {...commonProps} />;
      case "labeling":
        return <LabelingPage {...commonProps} />;
      default:
        return <UploadPage {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar
        isOpen={sidebarOpen}
        toggleSidebar={toggleSidebar}
        onTableSelect={handleTableSelect}
        onMenuSelect={handleMenuSelect}
        activeMenu={activeMenu}
      />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-80" : ""}`}>
        <div className="p-4">
          <Header onToggleSidebar={toggleSidebar} />

          {renderActivePage()}

          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </div>
    </div>
  );
}

export default App;
