// frontend/src/components/sidebar.jsx
import { FiUpload, FiDatabase, FiGitMerge, FiXCircle, FiClipboard, FiTag } from "react-icons/fi";

const Sidebar = ({ isOpen, toggleSidebar, onMenuSelect, activeMenu }) => {
  const menus = [
    { key: "upload", label: "Upload", icon: <FiUpload /> },
    { key: "match", label: "Matching", icon: <FiGitMerge /> },
    { key: "unmatch", label: "Matching Result", icon: <FiXCircle /> },
    { key: "assignment", label: "Assignment", icon: <FiClipboard /> },
    { key: "labeling", label: "Labeling", icon: <FiTag /> },
    // { key: "tables", label: "Data Tabel", icon: <FiDatabase /> },
  ];

  return (
    <div className={`fixed left-0 top-0 h-full bg-[#ffffff] text-black shadow-lg z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform w-64`}>
  <div className="p-4 border-b border-gray-700 font-semibold">Menu</div>
  <ul className="space-y-2 p-4">
    {menus.map(menu => (
      <li key={menu.key}>
        <button
          onClick={() => onMenuSelect(menu.key)}
          className={`flex items-center space-x-2 w-full text-left px-3 py-2 rounded-lg transition ${
            activeMenu === menu.key 
              ? 'bg-blue-400 text-white' 
              : 'hover:bg-blue-400'
          }`}

            >
              {menu.icon}
              <span>{menu.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;