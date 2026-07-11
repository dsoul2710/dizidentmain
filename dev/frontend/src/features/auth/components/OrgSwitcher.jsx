import React from "react";
import { useOrgContext } from "@/shared/hooks/useOrgContext";

const LOGTO_ORG_KEY = "hms_active_logto_org_id";

/**
 * Switch active Logto organization (org-scoped API token + X-Active-Org-Id header).
 */
export default function OrgSwitcher({ organizationIds = [], organizationRoles = [] }) {
  const { activeOrgId, setActiveOrgId } = useOrgContext();

  if (!organizationIds || organizationIds.length <= 1) {
    return null;
  }

  const activeLogtoOrg =
    localStorage.getItem(LOGTO_ORG_KEY) || organizationIds[0] || "";

  const handleChange = (e) => {
    const logtoOrgId = e.target.value;
    localStorage.setItem(LOGTO_ORG_KEY, logtoOrgId);
    setActiveOrgId(logtoOrgId);
    window.location.reload();
  };

  const labelForOrg = (orgId) => {
    const roleEntry = organizationRoles.find((r) => r.startsWith(`${orgId}:`));
    const role = roleEntry ? roleEntry.split(":").slice(1).join(":") : "member";
    return `${orgId.slice(0, 8)}… (${role})`;
  };

  return (
    <select
      className="form-select form-select-sm w-auto"
      value={activeLogtoOrg}
      onChange={handleChange}
      aria-label="Active organization"
    >
      {organizationIds.map((orgId) => (
        <option key={orgId} value={orgId}>
          {labelForOrg(orgId)}
        </option>
      ))}
    </select>
  );
}
