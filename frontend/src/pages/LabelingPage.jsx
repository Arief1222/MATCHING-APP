import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Save, AlertCircle } from 'lucide-react';

const LabelingInterface = () => {
  const [labelingData, setLabelingData] = useState([]);
  const [selectedLabels, setSelectedLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLabelingData();
  }, []);

 const fetchLabelingData = async () => {
  try {
    setLoading(true);

    const token = localStorage.getItem('token');
    const response = await fetch('http://127.0.0.1:8001/labeling-data/', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Token ${token}` })
      }
    });

    const data = await response.json();

    if (response.ok) {
      setLabelingData(data.unlabeled_data || []);
      const initialLabels = {};
      data.unlabeled_data?.forEach(item => {
        initialLabels[item.id] = null;
      });
      setSelectedLabels(initialLabels);
    } else {
      setMessage('Error fetching data: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    setMessage('Error fetching data: ' + error.message);
    console.error('Fetch error:', error);
  } finally {
    setLoading(false);
  }
};


  const handleLabelSelection = (itemId, label) => {
    setSelectedLabels(prev => ({
      ...prev,
      [itemId]: label
    }));
  };

  const submitLabeling = async (itemId, label) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const response = await fetch('http://127.0.0.1:8001/submit-labeling/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Token ${token}` })
        },
        body: JSON.stringify({
          labeling_id: itemId,
          label: label
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Data ${itemId} berhasil di-label sebagai ${label} dan disimpan ke db_final`);
        setLabelingData(prev => prev.filter(item => item.id !== itemId));
        setSelectedLabels(prev => {
          const newLabels = { ...prev };
          delete newLabels[itemId];
          return newLabels;
        });
      } else {
        setMessage('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      setMessage('Error submitting label: ' + error.message);
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (itemId) => {
    const selectedLabel = selectedLabels[itemId];
    if (!selectedLabel) {
      setMessage('Pilih salah satu opsi terlebih dahulu');
      return;
    }
    await submitLabeling(itemId, selectedLabel);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading data labeling...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Data Labeling</h1>
          <p className="text-gray-600">Pilih data yang benar dari pasangan data berikut</p>

          {message && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800">{message}</span>
            </div>
          )}
        </div>

        {labelingData.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Semua Data Telah Dilabeling</h3>
            <p className="text-gray-600">Tidak ada data yang perlu dilabeling saat ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                    <input type="checkbox" className="rounded" disabled />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Data ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Combined String 1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Combined String 2
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Matched Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Source Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Reference Table
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {labelingData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input type="checkbox" className="rounded" disabled />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {item.data_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`string1_${item.id}`}
                          name={`data_${item.id}`}
                          value="MATCH"
                          checked={selectedLabels[item.id] === 'MATCH'}
                          onChange={(e) => handleLabelSelection(item.id, e.target.value)}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 focus:ring-green-500"
                        />
                        <span className="truncate" title={item.combined_string_1}>
                          {item.combined_string_1}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`string2_${item.id}`}
                          name={`data_${item.id}`}
                          value="UNMATCH"
                          checked={selectedLabels[item.id] === 'UNMATCH'}
                          onChange={(e) => handleLabelSelection(item.id, e.target.value)}
                          className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                        />
                        <span className="truncate" title={item.combined_string_2}>
                          {item.combined_string_2}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {selectedLabels[item.id] === 'MATCH' ? item.combined_string_1 :
                         selectedLabels[item.id] === 'UNMATCH' ? item.combined_string_2 :
                         'NULL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.source_table}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.reference_table}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.created_at}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => handleSubmit(item.id)}
                        disabled={!selectedLabels[item.id] || submitting}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          selectedLabels[item.id]
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Submit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total: {labelingData.length} data yang perlu dilabeling
            </div>
            <button
              onClick={fetchLabelingData}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelingInterface;