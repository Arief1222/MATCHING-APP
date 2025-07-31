// frontend/src/App.jsx - Updated dengan Employee Routing
import React, { useState, useEffect } from "react";
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
import LoginPage from "./pages/LoginPage";
import EmployeeLabelingPage from "./pages/EmployeeLabelingPage"; // Import new employee page

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("upload");
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleTableSelect = (table) => {
    setSelectedTable(table);
    setSidebarOpen(false);
  };

  const handleMenuSelect = (menu) => {
    setActiveMenu(menu);
    setSidebarOpen(false);
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
      userRole: userRole
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
    </div>
  );
}

export default App;