// frontend/src/components/MatchingTypeSelector.jsx
import React from "react";

const MatchingTypeSelector = ({ matchingType, onTypeChange }) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Tipe Matching:
      </label>
      <div className="flex gap-4">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="matchingType"
            value="self"
            checked={matchingType === "self"}
            onChange={(e) => onTypeChange(e.target.value)}
            className="mr-2"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🔄 Self Matching</span>
            <span className="text-xs text-gray-500">(dalam satu tabel)</span>
          </div>
        </label>
        
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="matchingType"
            value="cross"
            checked={matchingType === "cross"}
            onChange={(e) => onTypeChange(e.target.value)}
            className="mr-2"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🔀 Cross Matching</span>
            <span className="text-xs text-gray-500">(antara dua tabel)</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default MatchingTypeSelector;