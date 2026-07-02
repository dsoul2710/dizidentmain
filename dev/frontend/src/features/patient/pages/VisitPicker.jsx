// src/pages/patient/VisitPicker.jsx
import React from "react";
import { formatDateDMY } from "@/shared/utils/dateFormat";

export default function VisitPicker({ visits, visitId, onChange }) {
  if (!visits?.length) return null;
  return (
    <div className="filter-block" style={{ minWidth: 200 }}>
      <span className="filter-label">Select visit</span>
      <select className="neo-input" value={visitId} onChange={(e) => onChange(e.target.value)}>
        {visits.map((v) => (
          <option key={v.id} value={v.id}>
            {formatDateDMY(v.visitDate || v.visit_date) || v.id}
          </option>
        ))}
      </select>
    </div>
  );
}
