import React from "react";
import { FiMenu } from "react-icons/fi";

function Header({ onToggleSidebar }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm p-6 mb-6 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <FiMenu className="text-slate-600" />
        </button>

        {/* Logo Section - Choose one of these options */}
        
        {/* Option 1: Image Logo */}
        <div className="flex items-center gap-3">
          <img 
            src="\src\assets\image.png" 
            alt="Company Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Matching App</h1>
            <p className="text-slate-600 text-sm">Sistem pencocokan data duplikat</p>
          </div>
        </div>

        {/* Option 2: Logo with rounded background */}
        {/* 
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center p-2">
            <img 
              src="/path/to/your/logo.png" 
              alt="Company Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Matching App</h1>
            <p className="text-slate-600 text-sm">Sistem pencocokan data duplikat</p>
          </div>
        </div>
        */}

        {/* Option 3: SVG Logo (inline) */}
        {/* 
        <div className="flex items-center gap-3">
          <div className="w-12 h-12">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="45" fill="#475569" />
              <text x="50" y="60" textAnchor="middle" fill="white" fontSize="40" fontWeight="bold">
                M
              </text>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Matching App</h1>
            <p className="text-slate-600 text-sm">Sistem pencocokan data duplikat</p>
          </div>
        </div>
        */}

        {/* Option 4: Logo from public folder */}
        {/* 
        <div className="flex items-center gap-3">
          <img 
            src={`${process.env.PUBLIC_URL}/logo.png`}
            alt="Company Logo" 
            className="w-12 h-12 object-contain"
            onError={(e) => {
              // Fallback if logo doesn't exist
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl items-center justify-center hidden">
            <span className="text-xl">📊</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Matching App</h1>
            <p className="text-slate-600 text-sm">Sistem pencocokan data duplikat</p>
          </div>
        </div>
        */}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-800">
            {user?.username || "Pengguna"}
          </p>
          <p className="text-xs text-slate-500">{user?.email || "-"}</p>
        </div>
      </div>
    </div>
  );
}

export default Header;