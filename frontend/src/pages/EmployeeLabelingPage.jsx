import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Save,
  AlertCircle,
  User,
  ClipboardList,
  BarChart3,
  Clock,
  CheckSquare,
  FileText,
  Target,
  Trash2,
  Check
} from 'lucide-react';

const EmployeeLabelingPage = () => {
  const [labelingData, setLabelingData] = useState([]);
  const [selectedItems, setSelectedItems] = useState({}); // { itemId: 'MATCH'|'UNMATCH' }
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState({});
  const [employeeInfo, setEmployeeInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');

  // Auth helper
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  const getApiHeaders = () => {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
    return headers;
  };

  // Show message helper
  const showMessage = (text, type = 'info') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  useEffect(() => {
    fetchEmployeeLabelingData();
  }, []);

  const fetchEmployeeLabelingData = async () => {
    try {
      setLoading(true);
      console.log('Fetching employee labeling data...');

      const response = await fetch('http://127.0.0.1:8001/my-labeling-data/', {
        method: 'GET',
        headers: getApiHeaders()
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Received data:', data);

        // Set data
        setLabelingData(data.unlabeled_data || []);
        setAssignments(data.assignments || []);
        setSummary(data.summary || {});
        setEmployeeInfo(data.employee_info || {});

        // Reset selected items when data changes
        setSelectedItems({});

        showMessage(data.message || 'Data berhasil dimuat', 'success');
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        showMessage(errorData.error || 'Gagal memuat data', 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      showMessage('Network error: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelection = (itemId, label) => {
    setSelectedItems(prev => {
      const newSelected = { ...prev };
      if (newSelected[itemId] === label) {
        // If same label is clicked, deselect
        delete newSelected[itemId];
      } else {
        // Select new label
        newSelected[itemId] = label;
      }
      return newSelected;
    });
  };

  const handleSelectAll = (label) => {
    const newSelected = {};
    labelingData.forEach(item => {
      newSelected[item.id] = label;
    });
    setSelectedItems(newSelected);
  };

  const handleClearSelection = () => {
    setSelectedItems({});
  };

  const submitBatchLabeling = async () => {
    const selectedItemsArray = Object.entries(selectedItems).map(([itemId, label]) => ({
      labeling_id: parseInt(itemId),
      label: label
    }));

    if (selectedItemsArray.length === 0) {
      showMessage('Pilih minimal satu data untuk dilabeling', 'error');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Submitting batch labeling:', selectedItemsArray);

      const response = await fetch('http://127.0.0.1:8001/submit-batch-labeling/', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          labeled_items: selectedItemsArray
        })
      });

      const data = await response.json();
      console.log('Batch submit response:', data);

      if (response.ok) {
        showMessage(
          `Batch labeling selesai: ${data.success_count} berhasil${data.failed_count > 0 ? `, ${data.failed_count} gagal` : ''}`,
          data.failed_count > 0 ? 'warning' : 'success'
        );

        // Clear selection
        setSelectedItems({});

        // Refresh data to get updated progress
        setTimeout(() => {
          fetchEmployeeLabelingData();
        }, 1000);

      } else {
        console.error('Batch submit error:', data);
        showMessage(data.error || 'Gagal menyimpan batch labeling', 'error');
      }
    } catch (error) {
      console.error('Batch submit network error:', error);
      showMessage('Network error: ' + error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate selection stats
  const selectedCount = Object.keys(selectedItems).length;
  const matchCount = Object.values(selectedItems).filter(label => label === 'MATCH').length;
  const unmatchCount = Object.values(selectedItems).filter(label => label === 'UNMATCH').length;

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Loading assignment data...</p>
          <p className="text-sm text-gray-500 mt-2">Mengambil data yang ditugaskan kepada Anda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-white to-white text-black rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Data Labeling Dashboard</h1>
              <p className="text-black">
                Selamat datang, {employeeInfo.username || 'Employee'}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <div className="text-2xl font-bold">{summary.overall_progress || 0}%</div>
                <div className="text-sm text-blue-100">Progress Overall</div>
              </div>
            </div>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-lg flex items-center ${messageType === 'success' ? 'bg-green-500/20 border border-green-400/30' :
                messageType === 'error' ? 'bg-red-500/20 border border-red-400/30' :
                  messageType === 'warning' ? 'bg-yellow-500/20 border border-yellow-400/30' :
                    'bg-blue-500/20 border border-blue-400/30'
              }`}>
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>{message}</span>
              <button
                onClick={() => setMessage('')}
                className="ml-auto hover:bg-white/20 rounded p-1"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <CheckSquare className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{summary.total_completed || 0}</div>
                  <div className="text-sm text-gray-600">Sudah Selesai</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{assignments.length}</div>
                  <div className="text-sm text-gray-600">Assignment Aktif</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <Target className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{labelingData.length}</div>
                  <div className="text-sm text-gray-600">Data Tersedia</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-orange-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{selectedCount}</div>
                  <div className="text-sm text-gray-600">Dipilih</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Progress */}
        {assignments.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Progress Assignment
            </h3>
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.assignment_id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{assignment.assignment_title}</h4>
                      <p className="text-sm text-gray-600">{assignment.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          assignment.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                      }`}>
                      {assignment.status}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress: {assignment.completed_data}/{assignment.total_data}</span>
                      <span>{assignment.progress_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${assignment.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Data range: {assignment.start_index} - {assignment.end_index}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Selection Controls */}
        {labelingData.length > 0 && (
          <div className="p-6 border-b bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Batch Actions:</span>
                <button
                  onClick={() => handleSelectAll('MATCH')}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Select All MATCH</span>
                </button>
                <button
                  onClick={() => handleSelectAll('UNMATCH')}
                  className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center space-x-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Select All UNMATCH</span>
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Selection</span>
                </button>
              </div>

              <div className="flex items-center space-x-4">
                {selectedCount > 0 && (
                  <div className="text-sm text-gray-600 bg-white px-3 py-2 rounded border">
                    Selected: {selectedCount} ({matchCount} MATCH, {unmatchCount} UNMATCH)
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* Labeling Interface */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <ClipboardList className="w-5 h-5 mr-2" />
              Data Labeling
            </h3>
            <button
              onClick={fetchEmployeeLabelingData}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>

          {labelingData.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {assignments.length === 0 ? 'Belum Ada Assignment' : 'Semua Data Telah Dilabeling'}
              </h3>
              <p className="text-gray-600">
                {assignments.length === 0
                  ? 'Belum ada assignment yang ditugaskan kepada Anda. Silakan hubungi supervisor.'
                  : 'Anda telah menyelesaikan semua data labeling yang ditugaskan. Terima kasih!'
                }
              </p>
              {assignments.length > 0 && (
                <div className="mt-4 text-sm text-gray-500">
                  <p>Total data yang telah Anda labeling: {summary.total_completed || 0}</p>
                  <p>Dari {assignments.length} assignment yang diberikan</p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="mb-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Petunjuk:</strong> Klik pada opsi MATCH atau UNMATCH untuk memilih label.
                Gunakan checkbox untuk memilih multiple data, lalu klik "Submit Selected" untuk batch submit.
              </div>

              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Data ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opsi 1 (MATCH)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opsi 2 (UNMATCH)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Assignment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Source
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Selection
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {labelingData.map((item, index) => {
                    const isSelected = selectedItems[item.id];
                    const isMatchSelected = isSelected === 'MATCH';
                    const isUnmatchSelected = isSelected === 'UNMATCH';

                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {item.data_id}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <button
                            onClick={() => handleItemSelection(item.id, 'MATCH')}
                            className={`flex items-start space-x-3 p-3 border rounded-lg w-full text-left transition-all ${isMatchSelected
                                ? 'bg-green-100 border-green-300 shadow-md'
                                : 'hover:bg-green-50 border-gray-200'
                              }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 mt-1 flex items-center justify-center ${isMatchSelected
                                ? 'bg-green-600 border-green-600'
                                : 'border-gray-300'
                              }`}>
                              {isMatchSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 mb-1">MATCH</div>
                              <div className="text-sm text-gray-700 break-words">
                                {item.combined_string_1}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <button
                            onClick={() => handleItemSelection(item.id, 'UNMATCH')}
                            className={`flex items-start space-x-3 p-3 border rounded-lg w-full text-left transition-all ${isUnmatchSelected
                                ? 'bg-red-100 border-red-300 shadow-md'
                                : 'hover:bg-red-50 border-gray-200'
                              }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 mt-1 flex items-center justify-center ${isUnmatchSelected
                                ? 'bg-red-600 border-red-600'
                                : 'border-gray-300'
                              }`}>
                              {isUnmatchSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 mb-1">UNMATCH</div>
                              <div className="text-sm text-gray-700 break-words">
                                {item.combined_string_2}
                              </div>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="text-xs text-gray-600">
                            {item.assignment_title}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                          {item.source_table}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                          {item.reference_table}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          {isSelected && (
                            <div className="flex flex-col items-center space-y-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${isSelected === 'MATCH'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                }`}>
                                {isSelected}
                              </span>
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          )

          }

        </div>
        <button
          onClick={submitBatchLabeling}
          disabled={selectedCount === 0 || submitting}
          className={`px-6 py-2 rounded font-medium text-sm flex items-center space-x-2 ${selectedCount > 0 && !submitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
        >
          <Save className="w-4 h-4" />
          <span>{submitting ? 'Submitting...' : `Submit Selected (${selectedCount})`}</span>
        </button>
        {/* Footer Info */}
        <div className="p-6 border-t bg-gray-50 rounded-b-lg">
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-600">
              <div className="flex items-center space-x-4">
                <span>Total data: {labelingData.length}</span>
                <span>•</span>
                <span>Selected: {selectedCount}</span>
                <span>•</span>
                <span>Employee: {employeeInfo.username}</span>
                <span>•</span>
                <span>Email: {employeeInfo.email}</span>
              </div>
            </div>
            <div className="text-gray-500">
              <span>Last updated: {new Date().toLocaleString('id-ID')}</span>
            </div>
          </div>

          {labelingData.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center text-blue-800 text-sm">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>
                  Gunakan batch selection untuk memproses multiple data sekaligus.
                  Data yang sudah disubmit akan tetap tersimpan di sistem untuk tracking.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeLabelingPage;