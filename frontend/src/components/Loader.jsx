// frontend/src/components/Loader.jsx
import React from 'react';
import ClipLoader from 'react-spinners/ClipLoader';

const Loader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
    <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-4 border border-gray-100">
      <div className="flex items-center space-x-4">
        <ClipLoader color="#3B82F6" size={35} speedMultiplier={0.8} />
        <span className="text-gray-800 text-lg font-semibold">Sedang diproses...</span>
      </div>
    </div>
  </div>
);

export default Loader;