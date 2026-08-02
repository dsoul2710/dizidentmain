import React from "react";

/**
 * Displays work source: "From: {hospital}" or "Own practice".
 */
export default function SourceOrgBadge({ sourceType, sourceOrgName }) {
  const isHospital = String(sourceType || "").toUpperCase() === "HOSPITAL";
  const label = isHospital
    ? `From: ${sourceOrgName || "Hospital"}`
    : "Own practice";
  const title = label;

  return (
    <span
      className={`badge text-xs px-2 py-1 radius-4 ${
        isHospital ? "bg-info-100 text-info" : "bg-neutral-200 text-secondary-light"
      }`}
      title={title}
      style={{
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    >
      {label}
    </span>
  );
}
