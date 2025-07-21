import React, { useState } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useAuth
} from "@clerk/clerk-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Components
import Header from "./components/Header";
import Sidebar from "./components/sidebar";
// import Loader from "./components/Loader";

// Pages
import UploadPage from "./pages/UploadPage";
import MatchPage from "./pages/MatchPage";
import UnmatchPage from "./pages/UnmatchPage";
import AssignmentPage from "./pages/AssignmentPage";
import LabelingPage from "./pages/LabelingPage";
import TablesPage from "./pages/TablesPage";

function App() {
  const { getToken } = useAuth();
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

  const getAuthHeaders = async () => {
    try {
      const token = await getToken();
      return { Authorization: `Bearer ${token}` };
    } catch (error) {
      console.error('Error getting token:', error);
      return {};
    }
  };

  const getAuthHeadersMultipart = async () => {
    try {
      const token = await getToken();
      return { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      };
    } catch (error) {
      console.error('Error getting token:', error);
      return {};
    }
  };

  const renderActivePage = () => {
    const commonProps = {
      getAuthHeaders,
      getAuthHeadersMultipart,
      selectedTable,
      setSelectedTable,
      setLoading
    };

    switch (activeMenu) {
      case "upload": return <UploadPage {...commonProps} />;
      case "match": return <MatchPage {...commonProps} />;
      case "unmatch": return <UnmatchPage {...commonProps} />;
      case "assignment": return <AssignmentPage {...commonProps} />;
      case "labeling": return <LabelingPage {...commonProps} />;
      case "tables": return <TablesPage {...commonProps} />;
      default: return <UploadPage {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 flex">
      <SignedIn>
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          onTableSelect={handleTableSelect}
          onMenuSelect={handleMenuSelect}
          activeMenu={activeMenu}
        />
      </SignedIn>

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
            {renderActivePage()}
          </SignedIn>

          {/* {loading && <Loader />} */}
          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </div>
    </div>
  );
}

export default App;