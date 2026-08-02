import React from "react";
import { getInitials } from "@/shared/utils/initials";

export default function HeaderProfile({ name = "", roleLabel = "" }) {
  const displayName = name.trim();
  const initials = getInitials(displayName);

  return (
    <div className="d-flex align-items-center gap-3 ms-2">
      {/* Help Icon */}
      <button
        type="button"
        className="w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center border-0 text-secondary"
        title="Help & Support"
        aria-label="Help & Support"
      >
        <i className="ri-question-line text-xl text-secondary-light"></i>
      </button>

      {/* Vertical Divider */}
      <div className="header-divider d-none d-sm-block"></div>

      {/* User Info Stack */}
      <div className="d-flex flex-column text-end d-none d-sm-flex">
        <span className="fw-bold text-primary-light text-sm" style={{ lineHeight: 1.2 }}>
          {displayName}
        </span>
        <span className="text-xxs text-secondary-light fw-medium mt-1" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {roleLabel}
        </span>
      </div>

      {/* Profile Avatar with Glowing Border */}
      <div className="profile-avatar-wrapper shadow-sm">
        <div className="w-40-px h-40-px bg-primary-100 text-primary-600 rounded-circle d-flex justify-content-center align-items-center fw-bold text-md border border-white profile-avatar-inner">
          {initials}
        </div>
      </div>
    </div>
  );
}
