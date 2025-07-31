import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  UserCheck,
  UserX,
  ClipboardList,
  Eye,
  Save,
  Database
} from 'lucide-react';

const AssignmentPage = () => {
  // State untuk Users Management
  const [users, setUsers] = useState([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'employee'
  });

  // State untuk Assignment Management
  const [assignments, setAssignments] = useState([]);
  const [dataTables, setDataTables] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showCreateAssignmentForm, setShowCreateAssignmentForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    dataset: '',
    employees: []
  });

  // State untuk UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info'); // success, error, info
  const [activeTab, setActiveTab] = useState('users');

  // Auth token helper
  const getAuthToken = () => {
    const token = localStorage.getItem('token');
    console.log('Current token:', token ? 'Token exists' : 'No token found'); // Debug log
    return token;
  };

  // Dynamic API headers
  const getApiHeaders = () => {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    console.log('API Headers:', headers); // Debug log
    return headers;
  };

  // Show message helper
  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Load data dari API
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load data secara terpisah untuk menghindari error propagation
      await Promise.all([
        loadUsers(),
        loadAssignments(),
        loadDataTables(),
        loadEmployees()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('Some data failed to load. Please check your connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load Users
  const loadUsers = async () => {
    try {
      console.log('Loading users...'); // Debug log
      const response = await fetch('http://127.0.0.1:8001/users/', {
        headers: getApiHeaders()
      });

      console.log('Users response status:', response.status); // Debug log

      if (response.ok) {
        const data = await response.json();
        console.log('Users response data:', data); // Debug log

        // Handle different response formats
        let usersArray = [];
        if (Array.isArray(data)) {
          usersArray = data;
        } else if (data.users && Array.isArray(data.users)) {
          usersArray = data.users;
        } else if (data.data && Array.isArray(data.data)) {
          usersArray = data.data;
        } else if (data.results && Array.isArray(data.results)) {
          usersArray = data.results;
        }

        console.log('Setting users:', usersArray); // Debug log
        setUsers(usersArray);
      } else {
        const errorText = await response.text();
        console.error('Failed to load users:', errorText);
        setUsers([]);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      // Set empty array as fallback
      setUsers([]);
    }
  };

  // Load Assignments
  const loadAssignments = async () => {
    try {
      console.log('Loading assignments...'); // Debug log
      const response = await fetch('http://127.0.0.1:8001/assignments/', {
        headers: getApiHeaders()
      });

      console.log('Assignments response status:', response.status); // Debug log

      if (response.ok) {
        const data = await response.json();
        console.log('Assignments response data:', data);

        const processedAssignments = Array.isArray(data) ? data.map(assignment => ({
          ...assignment,
          employee_assignments: Array.isArray(assignment.employee_assignments) ? assignment.employee_assignments : []
        })) : [];
        setAssignments(processedAssignments);
      } else {
        const errorText = await response.text();
        console.error('Failed to load assignments:', errorText);
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      // Set empty array as fallback
      setAssignments([]);
    }
  };

  // 3. PERBAIKAN: Enhanced loadDataTables function
  const loadDataTables = async () => {
    try {
      console.log('=== Loading Data Tables ===');
      const response = await fetch('http://127.0.0.1:8001/tables/', {
        headers: getApiHeaders()
      });

      console.log('Tables response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Raw tables response:', data);

        // PERBAIKAN: More robust response handling
        let tablesArray = [];
        if (Array.isArray(data)) {
          tablesArray = data;
        } else if (data.tables && Array.isArray(data.tables)) {
          tablesArray = data.tables;
        } else if (data.data && Array.isArray(data.data)) {
          tablesArray = data.data;
        } else if (data.results && Array.isArray(data.results)) {
          tablesArray = data.results;
        }

        // PERBAIKAN: Consistent table processing
        const processedTables = tablesArray.map((table, index) => {
          const processedTable = {
            ...table,
            // Pastikan ada name yang valid
            name: table.name || `table_${index}`,
            records: table.records || table.row_count || 0,
            row_count: table.row_count || table.records || 0,
            // Tambahkan display_name untuk UI
            display_name: table.name ? `${table.name} (${table.records || table.row_count || 0} rows)` : `Table ${index + 1}`
          };

          console.log(`Processed table ${index}:`, processedTable);
          return processedTable;
        });

        console.log('Final processed tables:', processedTables);
        setDataTables(processedTables);
      } else {
        const errorText = await response.text();
        console.error('Failed to load data tables:', errorText);
        setDataTables([]);
        showMessage('Gagal memuat data tables: ' + errorText, 'error');
      }
    } catch (error) {
      console.error('Error loading data tables:', error);
      setDataTables([]);
      showMessage('Error loading data tables: ' + error.message, 'error');
    }
  };

  // Load Employees - FIXED TO USE DEDICATED ENDPOINT
  const loadEmployees = async () => {
    try {
      console.log('Loading employees...'); // Debug log
      const response = await fetch('http://127.0.0.1:8001/employees/', {
        headers: getApiHeaders()
      });

      console.log('Employees response status:', response.status); // Debug log

      if (response.ok) {
        const data = await response.json();
        console.log('Employees response data:', data); // Debug log

        // Handle response format
        let employeesArray = [];
        if (Array.isArray(data)) {
          employeesArray = data;
        } else if (data.employees && Array.isArray(data.employees)) {
          employeesArray = data.employees;
        }

        console.log('Setting employees:', employeesArray); // Debug log
        setEmployees(employeesArray);
      } else {
        const errorText = await response.text();
        console.error('Failed to load employees:', errorText);
        setEmployees([]);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
      // Set empty array as fallback
      setEmployees([]);
    }
  };

  // User Management Functions
  const handleAddUser = async (e) => {
    e.preventDefault();

    // Validasi input
    if (!newUser.username || !newUser.email || !newUser.password) {
      showMessage('Semua field wajib diisi', 'error');
      return;
    }

    // Validasi email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUser.email)) {
      showMessage('Format email tidak valid', 'error');
      return;
    }

    // Validasi password length
    if (newUser.password.length < 6) {
      showMessage('Password minimal 6 karakter', 'error');
      return;
    }

    setSubmitting(true);

    try {
      // Prepare payload dengan struktur yang benar
      const payload = {
        username: newUser.username.trim(),
        email: newUser.email.trim().toLowerCase(),
        password: newUser.password,
        role: newUser.role
      };

      console.log('Sending payload:', payload); // Debug log

      const response = await fetch('http://127.0.0.1:8001/users/', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status); // Debug log

      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result); // Debug log
        showMessage('User berhasil ditambahkan', 'success');

        // Reset form
        setNewUser({ username: '', email: '', password: '', role: 'employee' });
        setShowAddUserForm(false);

        // Force reload users and employees with a small delay to ensure backend has processed
        setTimeout(async () => {
          console.log('Reloading users and employees after successful creation...'); // Debug log
          await Promise.all([loadUsers(), loadEmployees()]);
        }, 500);
      } else {
        let errorMessage = 'Error menambahkan user';
        try {
          const errorData = await response.json();
          console.error('Error response:', errorData); // Debug log

          // Handle different error formats
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (typeof errorData === 'object') {
            // Handle field-specific errors
            const fieldErrors = [];
            Object.keys(errorData).forEach(field => {
              if (Array.isArray(errorData[field])) {
                fieldErrors.push(`${field}: ${errorData[field].join(', ')}`);
              } else {
                fieldErrors.push(`${field}: ${errorData[field]}`);
              }
            });
            if (fieldErrors.length > 0) {
              errorMessage = fieldErrors.join('; ');
            }
          }
        } catch (jsonError) {
          const errorText = await response.text();
          console.error('Server response text:', errorText);
          errorMessage = `Server error: ${response.status} - ${errorText}`;
        }
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Network error:', error);
      showMessage('Network error: ' + error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus user ini?')) {
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:8001/users/', {
        method: 'DELETE',
        headers: getApiHeaders(),
        body: JSON.stringify({ id: userId })
      });

      if (response.ok) {
        showMessage('User berhasil dihapus', 'success');
        await Promise.all([loadUsers(), loadEmployees()]);
      } else {
        let errorMessage = 'Error menghapus user';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (jsonError) {
          const errorText = await response.text();
          console.error('Server response:', errorText);
          errorMessage = `Server error: ${response.status}`;
        }
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Network error:', error);
      showMessage('Network error: ' + error.message, 'error');
    }
  };

  // Frontend - AssignmentPage.jsx - handleCreateAssignment function yang diperbaiki

  // 1. PERBAIKAN: Simplifikasi logika dataset selection
  const handleCreateAssignment = async (e) => {
    e.preventDefault();

    console.log('=== Assignment Form Submission ===');
    console.log('Form data:', newAssignment);

    // Validasi form
    if (!newAssignment.title.trim()) {
      showMessage('Judul assignment harus diisi', 'error');
      return;
    }

    if (!newAssignment.dataset) {
      showMessage('Dataset harus dipilih', 'error');
      return;
    }

    if (!newAssignment.employees || newAssignment.employees.length === 0) {
      showMessage('Minimal 1 employee harus dipilih', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: newAssignment.title.trim(),
        description: newAssignment.description.trim() || "",
        dataset: newAssignment.dataset, // Gunakan name dataset
        employees: newAssignment.employees.map(id => parseInt(id))
      };

      console.log('Sending payload:', payload);

      const response = await fetch('http://127.0.0.1:8001/assignments/', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Success result:', result);

        showMessage(`Assignment "${newAssignment.title}" berhasil dibuat dan data telah didistribusikan secara rata!`, 'success');

        // Reset form
        setNewAssignment({
          title: '',
          description: '',
          dataset: '',
          employees: []
        });
        setShowCreateAssignmentForm(false);

        // Reload assignments
        setTimeout(() => {
          loadAssignments();
        }, 500);

      } else {
        let errorMessage = `Error ${response.status}: Failed to create assignment`;

        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);

          // Handle berbagai format error
          if (typeof errorData === 'object') {
            const errorMessages = [];

            // Handle field-specific errors
            Object.keys(errorData).forEach(field => {
              const fieldError = errorData[field];
              if (Array.isArray(fieldError)) {
                errorMessages.push(`${field}: ${fieldError.join(', ')}`);
              } else if (typeof fieldError === 'string') {
                errorMessages.push(`${field}: ${fieldError}`);
              } else if (typeof fieldError === 'object') {
                errorMessages.push(`${field}: ${JSON.stringify(fieldError)}`);
              }
            });

            if (errorMessages.length > 0) {
              errorMessage = errorMessages.join('; ');
            }
          }

        } catch (jsonError) {
          const errorText = await response.text();
          console.log('Error response text:', errorText);
          errorMessage = `Server error ${response.status}: ${errorText.substring(0, 200)}`;
        }

        showMessage(errorMessage, 'error');
      }

    } catch (networkError) {
      console.error('Network error:', networkError);
      showMessage(`Network error: ${networkError.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };
  // 4. PERBAIKAN: Enhanced employee selection with validation
  const handleEmployeeSelection = (employeeId) => {
    console.log('Employee selection:', employeeId, typeof employeeId);

    // PERBAIKAN: Ensure employeeId is number
    const numericEmployeeId = typeof employeeId === 'string' ? parseInt(employeeId) : employeeId;

    setNewAssignment(prev => ({
      ...prev,
      employees: prev.employees.includes(numericEmployeeId)
        ? prev.employees.filter(id => id !== numericEmployeeId)
        : [...prev.employees, numericEmployeeId]
    }));

    console.log('Updated employees:', newAssignment.employees);
  };

  const updateAssignmentStatus = async (assignmentId, newStatus) => {
    try {
      const response = await fetch(`http://127.0.0.1:8001/assignments/${assignmentId}/status/`, {
        method: 'PATCH',
        headers: getApiHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showMessage('Status assignment berhasil diupdate', 'success');
        await loadAssignments();
      } else {
        let errorMessage = 'Error updating status';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (jsonError) {
          const errorText = await response.text();
          console.error('Server response:', errorText);
          errorMessage = `Server error: ${response.status}`;
        }
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Network error:', error);
      showMessage('Network error: ' + error.message, 'error');
    }
  };

  const validateAssignmentForm = () => {
    const errors = [];

    if (!newAssignment.title.trim()) {
      errors.push('Judul assignment harus diisi');
    }

    if (!newAssignment.dataset) {
      errors.push('Dataset harus dipilih');
    }

    if (!newAssignment.employees || newAssignment.employees.length === 0) {
      errors.push('Minimal 1 employee harus dipilih');
    }

    // Validate dataset exists in available tables
    if (newAssignment.dataset && !dataTables.find(table => table.name === newAssignment.dataset)) {
      errors.push('Dataset yang dipilih tidak valid');
    }

    // Validate employees exist
    if (newAssignment.employees) {
      const invalidEmployees = newAssignment.employees.filter(empId =>
        !employees.find(emp => emp.id === empId)
      );
      if (invalidEmployees.length > 0) {
        errors.push(`Employee dengan ID ${invalidEmployees.join(', ')} tidak valid`);
      }
    }

    return errors;
  };

  // 6. PERBAIKAN: Enhanced debugging helper
  const debugFormState = () => {
    console.log('=== DEBUG FORM STATE ===');
    console.log('newAssignment:', newAssignment);
    console.log('dataTables count:', dataTables.length);
    console.log('employees count:', employees.length);
    console.log('Selected dataset:', newAssignment.dataset);
    console.log('Selected employees:', newAssignment.employees);
    console.log('Available datasets:', dataTables.map(t => ({ name: t.name, records: t.records })));
    console.log('Available employees:', employees.map(e => ({ id: e.id, username: e.username })));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading Assignment Page...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Assignment Management</h1>
          <p className="text-gray-600">Kelola user dan distribusi tugas pelabelan data</p>

          {message && (
            <div className={`mt-4 p-4 border rounded-lg flex items-center ${messageType === 'success' ? 'bg-green-50 border-green-200' :
                messageType === 'error' ? 'bg-red-50 border-red-200' :
                  'bg-blue-50 border-blue-200'
              }`}>
              <AlertCircle className={`w-5 h-5 mr-2 ${messageType === 'success' ? 'text-green-600' :
                  messageType === 'error' ? 'text-red-600' :
                    'text-blue-600'
                }`} />
              <span className={
                messageType === 'success' ? 'text-green-800' :
                  messageType === 'error' ? 'text-red-800' :
                    'text-blue-800'
              }>{message}</span>
              <button
                onClick={() => setMessage('')}
                className={`ml-auto ${messageType === 'success' ? 'text-green-600 hover:text-green-800' :
                    messageType === 'error' ? 'text-red-600 hover:text-red-800' :
                      'text-blue-600 hover:text-blue-800'
                  }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Manajemen User ({Array.isArray(users) ? users.length : 0})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'assignments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <ClipboardList className="w-4 h-4 inline mr-2" />
              Assignment ({assignments.length})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'users' && (
            <div>
              {/* User Management Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-gray-800">Daftar User</h2>
                  <span className="text-sm text-gray-500">({users.length} users loaded)</span>
                  <button
                    onClick={() => {
                      console.log('Manual refresh clicked');
                      loadUsers();
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center text-sm"
                    title="Refresh data"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </button>
                </div>
                <button
                  onClick={() => setShowAddUserForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah User
                </button>
              </div>

              {/* Add User Form Modal */}
              {showAddUserForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Tambah User Baru</h3>
                    <form onSubmit={handleAddUser}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username *
                          </label>
                          <input
                            type="text"
                            required
                            value={newUser.username}
                            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Password *
                          </label>
                          <input
                            type="password"
                            required
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role *
                          </label>
                          <select
                            value={newUser.role}
                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="employee">Employee</option>
                            <option value="superadmin">Superadmin</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          type="button"
                          onClick={() => setShowAddUserForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Users Table */}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user, index) => (
                      <tr key={user.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.username || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-wrap gap-1">
                            {user.roles && Array.isArray(user.roles) ? (
                              user.roles.map((role, roleIndex) => (
                                <span
                                  key={roleIndex}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {role}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-gray-500">
                                {user.role || 'No role'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs"
                            disabled={!user.id}
                          >
                            <Trash2 className="w-3 h-3 inline mr-1" />
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4" />
                  <p>Belum ada user yang terdaftar</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'assignments' && (
            <div>
              {/* Assignment Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-gray-800">Daftar Assignment</h2>
                  <span className="text-sm text-gray-500">({assignments.length} assignments)</span>
                  <button
                    onClick={() => {
                      console.log('Manual refresh assignments clicked');
                      loadAssignments();
                    }}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center text-sm"
                    title="Refresh assignments"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Refresh
                  </button>
                </div>
                <button
                  onClick={() => setShowCreateAssignmentForm(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Buat Assignment
                </button>
              </div>

              {/* Create Assignment Form Modal */}
              {showCreateAssignmentForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-lg font-semibold mb-4">Buat Assignment Baru</h3>
                    <form onSubmit={handleCreateAssignment}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                          </label>
                          <input
                            type="text"
                            required
                            value={newAssignment.title}
                            onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={newAssignment.description}
                            onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dataset *
                          </label>
                          <select
                            required
                            value={newAssignment.dataset}
                            onChange={(e) => {
                              console.log('Dataset selected:', e.target.value);
                              setNewAssignment({ ...newAssignment, dataset: e.target.value })
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Pilih Dataset --</option>
                            {dataTables.map((table, index) => {
                              const tableName = table.name || `table_${index}`;
                              const rowCount = table.records || table.row_count || 0;

                              return (
                                <option key={tableName} value={tableName}>
                                  {tableName} ({rowCount} rows)
                                </option>
                              );
                            })}
                          </select>
                          {dataTables.length === 0 && (
                            <p className="text-sm text-red-600 mt-1">
                              Tidak ada dataset yang tersedia. Upload file dataset terlebih dahulu.
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Dataset akan dibagi rata ke semua employee yang dipilih
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pilih Employee * ({newAssignment.employees.length} dipilih)
                          </label>
                          <div className="max-h-48 overflow-y-auto border border-gray-300 rounded p-2">
                            {employees.length > 0 ? (
                              employees.map((employee) => (
                                <label key={employee.id} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={newAssignment.employees.includes(employee.id)}
                                    onChange={() => handleEmployeeSelection(employee.id)}
                                    className="mr-3 rounded"
                                  />
                                  <div>
                                    <p className="font-medium">{employee.username}</p>
                                    <p className="text-sm text-gray-500">
                                      {employee.first_name && employee.last_name ?
                                        `${employee.first_name} ${employee.last_name}` :
                                        employee.email || 'No additional info'
                                      }
                                    </p>
                                  </div>
                                </label>
                              ))
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <UserX className="w-8 h-8 mx-auto mb-2" />
                                <p className="text-sm">Loading employees...</p>
                              </div>
                            )}
                          </div>
                          {employees.length === 0 && (
                            <p className="text-sm text-red-600 mt-1">
                              Tidak ada employee yang tersedia. Tambahkan user dengan role employee terlebih dahulu.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          type="button"
                          onClick={() => setShowCreateAssignmentForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          onClick={() => debugFormState()} // Debug sebelum submit
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {submitting ? 'Membuat...' : 'Buat Assignment'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Assignments Table */}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dataset
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th> */}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {assignment.id}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          <div>
                            <p className="font-semibold">{assignment.title}</p>
                            {assignment.description && (
                              <p className="text-gray-500 text-sm">{assignment.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Database className="w-4 h-4 mr-2 text-gray-400" />
                            {assignment.dataset_name || `Dataset #${assignment.dataset}`}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            {assignment.employee_assignments && assignment.employee_assignments.length > 0 ? (
                              assignment.employee_assignments.map((ea, index) => (
                                <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                                  <div className="flex items-center">
                                    <UserCheck className="w-3 h-3 mr-1 text-green-500" />
                                    {ea.employee ? ea.employee.username : 'Unknown Employee'}
                                  </div>
                                  <div className="text-right">
                                    <div className="text-blue-600 font-medium">
                                      {ea.data_count || 0} data
                                    </div>
                                    <div className="text-gray-500">
                                      Index: {ea.start_index || 0}-{ea.end_index || 0}
                                    </div>
                                    <div className="text-gray-500">
                                      Selesai: {ea.completed_count || 0}/{ea.data_count || 0}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center text-xs text-gray-500">
                                <UserX className="w-3 h-3 mr-1" />
                                No employees assigned
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={assignment.status || 'draft'}
                            onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value)}
                            className={`text-xs px-2 py-1 rounded border-0 font-medium focus:ring-2 focus:ring-blue-500 ${assignment.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                assignment.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                  assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                    assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      assignment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                              }`}
                          >
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assignment.created_at ? new Date(assignment.created_at).toLocaleDateString('id-ID') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {/* <button
                            onClick={() => window.open(`/api/assignments/${assignment.id}/progress/`, '_blank')}
                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs mr-2"
                          >
                            <Eye className="w-3 h-3 inline mr-1" />
                            Detail
                          </button> */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {assignments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ClipboardList className="w-12 h-12 mx-auto mb-4" />
                  <p>Belum ada assignment yang dibuat</p>
                  <p className="text-sm mt-2">
                    Dataset tersedia: {dataTables.length}, Employees tersedia: {employees.length}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentPage;