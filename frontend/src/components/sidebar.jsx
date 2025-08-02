// frontend/src/components/sidebar.jsx - Updated dengan Role-based Menu
import React, { useState, useEffect } from 'react';
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
  Settings,
  BarChart3
} from 'lucide-react';

const Sidebar = ({ 
  isOpen, 
  toggleSidebar, 
  onTableSelect, 
  onMenuSelect, 
  activeMenu, 
  userRole 
}) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get user data
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  // Fetch tables for superadmin
  useEffect(() => {
    if (isOpen && userRole === 'superadmin') {
      fetchTables();
    }
  }, [isOpen, userRole]);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://127.0.0.1:8001/tables/', {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTables(data.tables || []);
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    if (userRole === 'employee') {
      return [
        {
          id: 'employee-labeling',
          label: 'My Labeling Tasks',
          icon: ClipboardList,
          description: 'Data labeling yang ditugaskan kepada saya'
        }
      ];
    }

    if (userRole === 'superadmin') {
      return [
        {
          id: 'upload',
          label: 'Data Upload',
          icon: Upload,
          description: 'Upload dan kelola dataset'
        },
        {
          id: 'match',
          label: 'Matching Data',
          icon: GitMerge,
          description: 'Proses Matching Data'
        },
        {
          id: 'unmatch',
          label: 'Matching Result',
          icon: GitPullRequest,
          description: 'Data Hasil Matching'
        },
        {
          id: 'assignment',
          label: 'Assignment Management',
          icon: Users,
          description: 'Kelola penugasan employee'
        },
        {
          id: 'labeling',
          label: 'Labeling Interface',
          icon: FileText,
          description: 'Interface pelabelan data'
        }
      ];
    }

    // Default menu for other roles
    return [
      {
        id: 'upload',
        label: 'Data Management',
        icon: Database,
        description: 'Kelola data'
      }
    ];
  };

  const menuItems = getMenuItems();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
        onClick={toggleSidebar}
      />
      
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header */}
       

        {/* User Info */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user?.username || 'User'}</p>
              <p className="text-sm text-gray-600">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Menu Utama
          </h3>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onMenuSelect(item.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                    activeMenu === item.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-5 h-5 ${
                      activeMenu === item.id ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                    }`} />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className={`text-xs ${
                        activeMenu === item.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tables Section - Only for Superadmin
        {userRole === 'superadmin' && (
          <div className="p-4 border-t">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Available Tables
            </h3>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading tables...</p>
                </div>
              ) : tables.length > 0 ? (
                <div className="space-y-1">
                  {tables.map((table, index) => (
                    <button
                      key={index}
                      onClick={() => onTableSelect(table)}
                      className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {table.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {table.records || 0} records
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No tables available
                </p>
              )}
            </div>
          </div>
        )} */}

        {/* Employee Stats Section - Only for Employee */}
        {userRole === 'employee' && (
          <div className="p-4 border-t">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Quick Stats
            </h3>
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Progress Overview</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  Lihat progress semua assignment Anda
                </p>
              </div>
              
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Active Tasks</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Data yang perlu dilabeling hari ini
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-2 p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
          
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              Data Labeling System v1.0
            </p>
            <p className="text-xs text-gray-400">
              Role: {userRole?.toUpperCase() || 'USER'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;