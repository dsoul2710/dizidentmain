/** Shared active-org localStorage keys for multi-clinic context. */

export const ORG_KEY = "hms_active_org_id";
export const LOGTO_ORG_KEY = "hms_active_logto_org_id";
/** Sentinel stored when doctor/SP selects Own practice (no X-Active-Org-Id). */
export const OWN_PRACTICE_VALUE = "__OWN_PRACTICE__";

/**
 * Raw value from storage (may be OWN_PRACTICE_VALUE or an org id).
 * Prefers HMS org key over Logto key so Own practice is not overwritten by a stale Logto id.
 */
export function readStoredOrgRaw() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_KEY) || localStorage.getItem(LOGTO_ORG_KEY);
}

/** Org id for X-Active-Org-Id, or null for Own practice / unset. */
export function resolveActiveOrgHeaderValue() {
  const raw = readStoredOrgRaw();
  if (!raw || raw === OWN_PRACTICE_VALUE) return null;
  return raw;
}

export function isOwnPracticeStored() {
  const raw = readStoredOrgRaw();
  return !raw || raw === OWN_PRACTICE_VALUE;
}
