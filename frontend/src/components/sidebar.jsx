import React, { useState, useEffect } from "react";
import {
  Upload,
  GitMerge,
  GitPullRequest,
  Database,
  X,
  Users,
  ClipboardList,
  FileText,
  LogOut,
  User,
} from "lucide-react";

const Sidebar = ({
  isOpen,
  toggleSidebar,
  onTableSelect,
  onMenuSelect,
  activeMenu,
  userRole,
}) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get user data
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  // Fetch tables for superadmin
  useEffect(() => {
    if (isOpen && userRole === "superadmin") {
      fetchTables();
    }
  }, [isOpen, userRole]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch("http://127.0.0.1:8001/tables/", {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    if (userRole === "employee") {
      return [
        {
          id: "employee-labeling",
          label: "My Tasks",
          icon: ClipboardList,
        },
      ];
    }

    if (userRole === "superadmin") {
      return [
        {
          id: "upload",
          label: "Data Upload",
          icon: Upload,
        },
        {
          id: "match",
          label: "Data Matching",
          icon: GitMerge,
        },
        {
          id: "unmatch",
          label: "Match Results",
          icon: GitPullRequest,
        },
        {
          id: "assignment",
          label: "Team Management",
          icon: Users,
        },
        {
          id: "labeling",
          label: "Labeling Hub",
          icon: FileText,
        },
      ];
    }

    return [
      {
        id: "upload",
        label: "Data Hub",
        icon: Database,
      },
      {
        id: "unmatch",
        label: "Match Results",
        icon: GitPullRequest,
      },
      {
          id: "assignment",
          label: "Team Management",
          icon: Users,
        },
    ];
  };

  const menuItems = getMenuItems();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white/95 backdrop-blur-md shadow-xl z-50 border-r border-gray-100">
        {/* Close Button */}
        <button
          onClick={toggleSidebar}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-all duration-200 lg:hidden"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* User Profile */}
        <div className="px-8 py-6 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {user?.username || "User"}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {userRole?.toUpperCase() || "USER"}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="px-6">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenu === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => onMenuSelect(item.id)}
                    className={`w-full text-left group relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-blue-400 text-white shadow-lg"
                        : "text-gray-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                        isActive
                          ? "bg-white/20"
                          : "bg-slate-100 group-hover:bg-slate-200"
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-colors duration-200 ${
                          isActive
                            ? "text-white"
                            : "text-slate-600 group-hover:text-slate-700"
                        }`}
                      />
                    </div>
                    <span className="font-medium">{item.label}</span>

                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
