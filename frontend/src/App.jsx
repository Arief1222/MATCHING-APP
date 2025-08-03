// frontend/src/App.jsx - Updated dengan Employee Routing
import React, { useState, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { LogOut } from "lucide-react"; // TAMBAH IMPORT INI

// Components
import Header from "./components/Header";
import Sidebar from "./components/sidebar";

// Pages
import UploadPage from "./pages/UploadPage";
import MatchingPage from "./pages/MatchingPage";
import UnmatchPage from "./pages/UnmatchPage";
import AssignmentPage from "./pages/AssignmentPage";
import LabelingPage from "./pages/LabelingPage";
import LoginPage from "./pages/LoginPage";
import EmployeeLabelingPage from "./pages/EmployeeLabelingPage"; // Import new employee page

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState("upload");
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false); // TAMBAH STATE INI

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setSidebarOpen(true);
  };

  const handleMenuSelect = (menu) => {
    setActiveMenu(menu);
    setSidebarOpen(true);
  };

  // TAMBAH FUNGSI LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  // Get token and user info from localStorage
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");

  // Parse user data and get role
  useEffect(() => {
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserRole(user.role?.toLowerCase());
        
        // Set default menu based on role
        if (user.role?.toLowerCase() === 'employee') {
          setActiveMenu('employee-labeling');
        } else if (user.role?.toLowerCase() === 'superadmin') {
          setActiveMenu('upload');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setUserRole(null);
      }
    }
  }, [userData]);

  // Show LoginPage if not authenticated
  if (!token || token === "null" || token === "undefined") {
    return <LoginPage />;
  }

  // Auth headers helpers
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

  // Render appropriate page based on user role and active menu
  const renderActivePage = () => {
    const commonProps = {
      getAuthHeaders,
      getAuthHeadersMultipart,
      selectedTable,
      setSelectedTable,
      setLoading,
    };

    // Employee can only access labeling
    if (userRole === 'employee') {
      return <EmployeeLabelingPage {...commonProps} />;
    }

    // Superadmin and other roles
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
      case "employee-labeling":
        return <EmployeeLabelingPage {...commonProps} />;
      default:
        return <UploadPage {...commonProps} />;
    }
  };

  // Custom sidebar props based on user role
  const getSidebarProps = () => {
    return {
      isOpen: sidebarOpen,
      toggleSidebar: toggleSidebar,
      onTableSelect: handleTableSelect,
      onMenuSelect: handleMenuSelect,
      activeMenu: activeMenu,
      userRole: userRole,
      onLogout: confirmLogout // TAMBAH PROP INI
    };
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar {...getSidebarProps()} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-80" : ""}`}>
        <div className="p-4">
          <Header 
            onToggleSidebar={toggleSidebar} 
            userRole={userRole}
            userData={userData ? JSON.parse(userData) : null}
          />

          {renderActivePage()}

          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </div>

      {/* TAMBAH MODAL LOGOUT DI SINI */}
      {showLogoutModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" 
            onClick={() => setShowLogoutModal(false)} 
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl z-[101] w-96 max-w-[90vw]">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <LogOut className="w-8 h-8 text-red-600" />
              </div>
              <p className="text-gray-600 text-center mb-6">
                Apakah Anda yakin ingin keluar dari aplikasi?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors duration-200"
                >
                  Ya, Logout
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;