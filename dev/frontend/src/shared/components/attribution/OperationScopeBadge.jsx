import React from "react";

/**
 * Shows doctor/provider operation scope (INDEPENDENT | INTERNAL).
 */
export default function OperationScopeBadge({ operationScope }) {
  const scope = String(operationScope || "INDEPENDENT").toUpperCase();
  const isInternal = scope === "INTERNAL";
  const label = isInternal ? "Internal" : "Independent";

  return (
    <span
      className={`badge text-xs px-2 py-1 radius-4 ${
        isInternal ? "bg-warning-100 text-warning" : "bg-success-100 text-success"
      }`}
      title={label}
    >
      {label}
    </span>
  );
}
