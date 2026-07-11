import { useCallback, useState } from "react";

const ORG_KEY = "hms_active_org_id";
const LOGTO_ORG_KEY = "hms_active_logto_org_id";

/**
 * Active org context for multi-tenant API calls (X-Active-Org-Id header).
 */
export function useOrgContext() {
  const [activeOrgId, setActiveOrgIdState] = useState(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LOGTO_ORG_KEY) || localStorage.getItem(ORG_KEY);
  });

  const setActiveOrgId = useCallback((orgId) => {
    if (orgId == null || orgId === "") {
      localStorage.removeItem(ORG_KEY);
      localStorage.removeItem(LOGTO_ORG_KEY);
      setActiveOrgIdState(null);
    } else {
      localStorage.setItem(ORG_KEY, String(orgId));
      localStorage.setItem(LOGTO_ORG_KEY, String(orgId));
      setActiveOrgIdState(String(orgId));
    }
  }, []);

  return { activeOrgId, setActiveOrgId };
}
