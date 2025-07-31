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

        <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl flex items-center justify-center">
          <span className="text-xl">📊</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Matching App</h1>
          <p className="text-slate-600 text-sm">Sistem pencocokan data duplikat</p>
        </div>
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