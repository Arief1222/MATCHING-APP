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
  Save
} from 'lucide-react';

const AssignmentPage = () => {
  // State untuk Employee Management
  const [employees, setEmployees] = useState([]);
  const [showAddEmployeeForm, setShowAddEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  // State untuk Data Assignment
  const [unassignedData, setUnassignedData] = useState([]);
  const [assignedData, setAssignedData] = useState([]);
  const [selectedData, setSelectedData] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // State untuk UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('employees');

  // Dummy data untuk demo
  useEffect(() => {
    loadDummyData();
  }, []);

  const loadDummyData = () => {
    // Dummy employees
    const dummyEmployees = [
      {
        id: 1,
        username: 'employee1',
        email: 'employee1@example.com',
        fullName: 'John Doe',
        isActive: true,
        role: 'employee',
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        username: 'employee2',
        email: 'employee2@example.com',
        fullName: 'Jane Smith',
        isActive: true,
        role: 'employee',
        createdAt: '2024-01-20T14:30:00Z'
      }
    ];

    // Dummy unassigned data
    const dummyUnassignedData = [
      {
        id: 101,
        dataId: 'DATA_001',
        combinedString1: 'PT INDOFOOD SUKSES MAKMUR TBK',
        combinedString2: 'PT. Indofood Sukses Makmur Tbk.',
        sourceTable: 'company_data_a',
        referenceTable: 'company_data_b',
        createdAt: '2024-01-25T09:15:00Z'
      },
      {
        id: 102,
        dataId: 'DATA_002',
        combinedString1: 'BANK CENTRAL ASIA TBK',
        combinedString2: 'Bank Central Asia Tbk',
        sourceTable: 'bank_data_a',
        referenceTable: 'bank_data_b',
        createdAt: '2024-01-25T10:20:00Z'
      }
    ];

    // Dummy assigned data
    const dummyAssignedData = [
      {
        id: 201,
        dataId: 'DATA_003',
        combinedString1: 'TELKOM INDONESIA PERSERO TBK',
        combinedString2: 'PT Telkomsel Indonesia',
        sourceTable: 'telco_data_a',
        referenceTable: 'telco_data_b',
        assignedTo: 'employee1',
        assignedToName: 'John Doe',
        assignedAt: '2024-01-24T16:45:00Z',
        status: 'pending'
      }
    ];

    setEmployees(dummyEmployees);
    setUnassignedData(dummyUnassignedData);
    setAssignedData(dummyAssignedData);
    setLoading(false);
  };

  // Employee Management Functions
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (newEmployee.password !== newEmployee.confirmPassword) {
      setMessage('Password dan konfirmasi password tidak cocok');
      return;
    }

    setSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newEmp = {
        id: employees.length + 1,
        username: newEmployee.username,
        email: newEmployee.email,
        fullName: newEmployee.fullName,
        isActive: true,
        role: 'employee',
        createdAt: new Date().toISOString()
      };

      setEmployees([...employees, newEmp]);
      setNewEmployee({ username: '', email: '', password: '', confirmPassword: '', fullName: '' });
      setShowAddEmployeeForm(false);
      setMessage('Employee berhasil ditambahkan');
    } catch (error) {
      setMessage('Error menambahkan employee: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEmployeeStatus = async (employeeId) => {
    setEmployees(employees.map(emp => 
      emp.id === employeeId ? { ...emp, isActive: !emp.isActive } : emp
    ));
    setMessage('Status employee berhasil diupdate');
  };

  // Data Assignment Functions
  const handleDataSelection = (dataId) => {
    setSelectedData(prev => 
      prev.includes(dataId) 
        ? prev.filter(id => id !== dataId)
        : [...prev, dataId]
    );
  };

  const handleAssignData = async () => {
    if (selectedData.length === 0) {
      setMessage('Pilih data yang akan ditugaskan');
      return;
    }

    if (!selectedEmployee) {
      setMessage('Pilih employee untuk ditugaskan');
      return;
    }

    setSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const employee = employees.find(emp => emp.username === selectedEmployee);
      const dataToAssign = unassignedData.filter(data => selectedData.includes(data.id));

      const newAssignedData = dataToAssign.map(data => ({
        ...data,
        assignedTo: employee.username,
        assignedToName: employee.fullName,
        assignedAt: new Date().toISOString(),
        status: 'pending'
      }));

      setAssignedData([...assignedData, ...newAssignedData]);
      setUnassignedData(unassignedData.filter(data => !selectedData.includes(data.id)));
      setSelectedData([]);
      setSelectedEmployee('');
      setMessage(`${dataToAssign.length} data berhasil ditugaskan ke ${employee.fullName}`);
    } catch (error) {
      setMessage('Error menugaskan data: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectAllData = () => {
    if (selectedData.length === unassignedData.length) {
      setSelectedData([]);
    } else {
      setSelectedData(unassignedData.map(data => data.id));
    }
  };

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
          <p className="text-gray-600">Kelola akun Employee dan distribusi tugas pelabelan data</p>

          {message && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800">{message}</span>
              <button 
                onClick={() => setMessage('')}
                className="ml-auto text-blue-600 hover:text-blue-800"
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
              onClick={() => setActiveTab('employees')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'employees'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Manajemen Employee
            </button>
            <button
              onClick={() => setActiveTab('assignment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assignment'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ClipboardList className="w-4 h-4 inline mr-2" />
              Distribusi Tugas
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'employees' && (
            <div>
              {/* Employee Management Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Daftar Employee</h2>
                <button
                  onClick={() => setShowAddEmployeeForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Employee
                </button>
              </div>

              {/* Add Employee Form Modal */}
              {showAddEmployeeForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold mb-4">Tambah Employee Baru</h3>
                    <div onSubmit={handleAddEmployee}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Username *
                          </label>
                          <input
                            type="text"
                            required
                            value={newEmployee.username}
                            onChange={(e) => setNewEmployee({...newEmployee, username: e.target.value})}
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
                            value={newEmployee.email}
                            onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
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
                            value={newEmployee.password}
                            onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Konfirmasi Password *
                          </label>
                          <input
                            type="password"
                            required
                            value={newEmployee.confirmPassword}
                            onChange={(e) => setNewEmployee({...newEmployee, confirmPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Lengkap
                          </label>
                          <input
                            type="text"
                            value={newEmployee.fullName}
                            onChange={(e) => setNewEmployee({...newEmployee, fullName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          type="button"
                          onClick={() => setShowAddEmployeeForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleAddEmployee}
                          disabled={submitting}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {submitting ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Employee Table */}
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Lengkap
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Peran
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dibuat
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.fullName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            employee.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {employee.isActive ? (
                              <>
                                <UserCheck className="w-3 h-3 mr-1" />
                                Aktif
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3 mr-1" />
                                Tidak Aktif
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {employee.role}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(employee.createdAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleEmployeeStatus(employee.id)}
                            className={`px-3 py-1 rounded text-xs ${
                              employee.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {employee.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'assignment' && (
            <div>
              {/* Assignment Header */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Distribusi Tugas Pelabelan</h2>
                
                {/* Assignment Controls */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pilih Employee
                      </label>
                      <select
                        value={selectedEmployee}
                        onChange={(e) => setSelectedEmployee(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Pilih Employee --</option>
                        {employees.filter(emp => emp.isActive).map(employee => (
                          <option key={employee.id} value={employee.username}>
                            {employee.fullName || employee.username} ({employee.email})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAssignData}
                        disabled={selectedData.length === 0 || !selectedEmployee || submitting}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Tugaskan Data ({selectedData.length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unassigned Data Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-gray-800">
                    Data yang Belum Ditugaskan ({unassignedData.length})
                  </h3>
                  <button
                    onClick={selectAllData}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedData.length === unassignedData.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={selectedData.length === unassignedData.length && unassignedData.length > 0}
                            onChange={selectAllData}
                            className="rounded"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data A
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data B
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Source Table
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference Table
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dibuat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {unassignedData.map((data) => (
                        <tr key={data.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedData.includes(data.id)}
                              onChange={() => handleDataSelection(data.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {data.dataId}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <span className="truncate block" title={data.combinedString1}>
                              {data.combinedString1}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <span className="truncate block" title={data.combinedString2}>
                              {data.combinedString2}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.sourceTable}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {data.referenceTable}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(data.createdAt).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {unassignedData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                    <p>Semua data sudah ditugaskan</p>
                  </div>
                )}
              </div>

              {/* Assigned Data Section */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-4">
                  Data yang Sudah Ditugaskan ({assignedData.length})
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data A
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data B
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ditugaskan ke
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tanggal Tugas
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assignedData.map((data) => (
                        <tr key={data.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {data.dataId}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <span className="truncate block" title={data.combinedString1}>
                              {data.combinedString1}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                            <span className="truncate block" title={data.combinedString2}>
                              {data.combinedString2}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{data.assignedToName}</p>
                              <p className="text-gray-500 text-xs">@{data.assignedTo}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              {data.status === 'pending' ? 'Menunggu' : data.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(data.assignedAt).toLocaleDateString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {assignedData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Eye className="w-12 h-12 mx-auto mb-4" />
                    <p>Belum ada data yang ditugaskan</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentPage;