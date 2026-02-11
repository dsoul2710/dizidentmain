// src/components/Odontogram.jsx
import React from "react";
import AdultRaphaelChart from "./AdultRaphaelChart.jsx";
import ChildRaphaelChart from "./ChildRaphaelChart.jsx";

/* MAIN ODONTOGRAM WRAPPER */

export default function Odontogram({
  value = [],
  onChange,
  mode = "adult",
  onModeChange,
}) {
  const updateMode = (m) => {
    if (m === mode) return;
    onModeChange && onModeChange(m);
    // clear selection when switching
    onChange && onChange([]);
  };

  return (
    <div className="odo-wrap">
      {/* MODE SWITCH */}
      <div className="odo-mode-row">
  <label className="odo-radio">
    <input
      type="radio"
      name="odoMode"
      checked={mode === 'adult'}
      onChange={() => updateMode('adult')}
    />
    <span>Adult</span>
  </label>

  <label className="odo-radio">
    <input
      type="radio"
      name="odoMode"
      checked={mode === 'child'}
      onChange={() => updateMode('child')}
    />
    <span>Child</span>
  </label>

  {/* Legend */}
      <div className="odo-legend">
        <span className="pill">
          {mode === "adult"
            ? "Adult: 11-18 · 21-28 · 31-38 · 41-48"
            : "Child: 51-55 · 61-65 · 71-75 · 81-85"}
        </span>
      </div>
      
</div>


      

      {/* CHARTS */}
      {mode === "adult" ? (
        <AdultRaphaelChart value={value} onChange={onChange} />
      ) : (
        <ChildRaphaelChart value={value} onChange={onChange} />
      )}
    </div>
  );
}

