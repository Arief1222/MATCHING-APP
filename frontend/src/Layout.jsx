import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import axios from "axios";
import Sidebar from "./components/sidebar";
import UploadPage from "./pages/UploadPage";
import MatchPage from "./pages/MatchPage";
import UnmatchPage from "./pages/UnmatchPage";
import AssignmentPage from "./pages/AssignmentPage";
import LabelingPage from "./pages/LabelingPage";
import TablesPage from "./pages/TablesPage";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState("upload");
  const [userRole, setUserRole] = useState("");
  const { user } = useUser();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleMenuSelect = (menu) => {
    setSelectedMenu(menu);
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await axios.get(`http://localhost:8001/users/${user.primaryEmailAddress.emailAddress}`);
        setUserRole(response.data.role);
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    if (user) {
      fetchUserRole();
    }
  }, [user]);

  const renderPage = () => {
    switch (selectedMenu) {
      case "upload":
        return <UploadPage />;
      case "match":
        return <MatchPage />;
      case "unmatch":
        return <UnmatchPage />;
      case "assignment":
        return <AssignmentPage />;
      case "labeling":
        return <LabelingPage />;
      case "tables":
        return <TablesPage />;
      default:
        return <UploadPage />;
    }
  };

  return (
    <div className="flex">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        onMenuSelect={handleMenuSelect}
        role={userRole}
      />
      <main className="flex-1 p-4 bg-gray-50 min-h-screen">
        {renderPage()}
      </main>
    </div>
  );
};

export default Layout;