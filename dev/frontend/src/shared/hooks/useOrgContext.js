import { useCallback, useState } from "react";
import {
  LOGTO_ORG_KEY,
  ORG_KEY,
  OWN_PRACTICE_VALUE,
  readStoredOrgRaw,
  resolveActiveOrgHeaderValue,
} from "@/shared/orgContextStorage";

/**
 * Active org context for multi-tenant API calls (X-Active-Org-Id header).
 * null = Own practice (INDEPENDENT doctor/SP).
 */
export function useOrgContext() {
  const [activeOrgId, setActiveOrgIdState] = useState(() => resolveActiveOrgHeaderValue());

  const setActiveOrgId = useCallback((orgId) => {
    if (orgId == null || orgId === "" || orgId === OWN_PRACTICE_VALUE) {
      localStorage.setItem(ORG_KEY, OWN_PRACTICE_VALUE);
      localStorage.removeItem(LOGTO_ORG_KEY);
      setActiveOrgIdState(null);
    } else {
      localStorage.setItem(ORG_KEY, String(orgId));
      localStorage.setItem(LOGTO_ORG_KEY, String(orgId));
      setActiveOrgIdState(String(orgId));
    }
  }, []);

  return { activeOrgId, setActiveOrgId, isOwnPractice: isOwnPracticeFromState(activeOrgId) };
}

function isOwnPracticeFromState(activeOrgId) {
  if (activeOrgId == null || activeOrgId === "") return true;
  if (activeOrgId === OWN_PRACTICE_VALUE) return true;
  return readStoredOrgRaw() === OWN_PRACTICE_VALUE;
}
