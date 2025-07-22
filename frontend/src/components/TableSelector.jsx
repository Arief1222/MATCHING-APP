// frontend/src/components/TableSelector.jsx
import React from "react";

const TableSelector = ({
  availableTables,
  selectedTableA,
  selectedTableB,
  matchingType,
  onTableASelection,
  onTableBSelection
}) => {
  return (
    <div className="space-y-4">
      {/* Pilih Tabel Utama */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pilih Tabel Utama:
        </label>
        <select
          value={selectedTableA?.name || ""}
          onChange={(e) => {
            const table = availableTables.find(t => t.name === e.target.value);
            if (table) onTableASelection(table);
          }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">-- Pilih Tabel --</option>
          {availableTables.map((table) => (
            <option key={table.name} value={table.name}>
              {table.name} ({table.records?.toLocaleString()} baris, {table.columns} kolom)
            </option>
          ))}
        </select>
      </div>

      {/* Pilih Tabel Kedua (hanya untuk cross matching) */}
      {matchingType === "cross" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Tabel Kedua:
          </label>
          <select
            value={selectedTableB?.name || ""}
            onChange={(e) => {
              const table = availableTables.find(t => t.name === e.target.value);
              if (table) onTableBSelection(table);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={!selectedTableA}
          >
            <option value="">-- Pilih Tabel Kedua --</option>
            {availableTables
              .filter(table => table.name !== selectedTableA?.name)
              .map((table) => (
                <option key={table.name} value={table.name}>
                  {table.name} ({table.records?.toLocaleString()} baris, {table.columns} kolom)
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default TableSelector;