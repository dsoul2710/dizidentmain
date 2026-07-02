import { useCallback, useState } from "react";

const ORG_KEY = "hms_active_org_id";

/**
 * Active org context for multi-tenant API calls (X-Active-Org-Id header).
 */
export function useOrgContext() {
  const [activeOrgId, setActiveOrgIdState] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(ORG_KEY) : null
  );

  const setActiveOrgId = useCallback((orgId) => {
    if (orgId == null || orgId === "") {
      localStorage.removeItem(ORG_KEY);
      setActiveOrgIdState(null);
    } else {
      localStorage.setItem(ORG_KEY, String(orgId));
      setActiveOrgIdState(String(orgId));
    }
  }, []);

  return { activeOrgId, setActiveOrgId };
}
