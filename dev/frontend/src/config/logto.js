import { UserScope } from "@logto/react";

const endpoint =
  (import.meta.env.VITE_LOGTO_ENDPOINT || "https://npm5w2.logto.app").replace(/\/+$/, "");

export const LOGTO_ENDPOINT = endpoint;
export const LOGTO_APP_ID = import.meta.env.VITE_LOGTO_APP_ID || "saj00uitdlkjzdu8ebwgq";
export const LOGTO_API_RESOURCE =
  import.meta.env.VITE_LOGTO_API_RESOURCE || "http://localhost:8081/api";

/** Enable after Organization template is configured in Logto Console */
export const LOGTO_ORG_ENABLED = import.meta.env.VITE_LOGTO_ORG_ENABLED === "true";

export const LOGTO_ENABLED = import.meta.env.VITE_LOGTO_ENABLED !== "false";
export const LEGACY_AUTH_ENABLED = import.meta.env.VITE_LEGACY_AUTH_ENABLED !== "false";

export const LOGTO_CALLBACK_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/callback`
    : "http://localhost:5173/callback";

/**
 * Sign-in config — intentionally omits `resources`.
 * Requesting the API resource during OAuth redirect causes invalid_target if the
 * Console identifier does not match exactly. Tokens are fetched after sign-in via
 * getAccessToken(LOGTO_API_RESOURCE) when Default API is set in Logto Console.
 */
export const logtoConfig = {
  endpoint: LOGTO_ENDPOINT,
  appId: LOGTO_APP_ID,
  scopes: [
    UserScope.Profile,
    UserScope.Email,
    UserScope.Phone,
    UserScope.Roles,
    "read:profile",
    "write:profile",
    ...(LOGTO_ORG_ENABLED
      ? [UserScope.Organizations, UserScope.OrganizationRoles]
      : []),
  ],
};
