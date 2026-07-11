import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLogto } from "@logto/react";
import { fetchMe, logout as apiLogout } from "@/api/authApi";
import { LOGTO_API_RESOURCE, LOGTO_ENABLED } from "@/config/logto";
import { setLogtoTokenProvider } from "@/features/auth/logto/tokenStore";

const STORAGE_KEY = "hms_user";
const LOGTO_ORG_KEY = "hms_active_logto_org_id";

function normalizeUser(userObj) {
  if (!userObj) return null;
  let role = userObj.role;
  if (role === "SUPER_ADMIN") role = "SUPERADMIN";
  if (role === "ORG_HOSPITAL") role = "ORG";
  return {
    ...userObj,
    id: userObj.id ?? userObj.hmsUserId ?? userObj.userId ?? null,
    name: userObj.name ?? userObj.displayName ?? userObj.mobile ?? "User",
    role,
    permissions: userObj.modulePermissions ?? userObj.permissions ?? [],
    organizationIds: userObj.organizationIds ?? [],
    organizationRoles: userObj.organizationRoles ?? [],
    linked: userObj.linked === true,
    logtoSub: userObj.logtoSub ?? userObj.sub ?? null,
  };
}

function readStoredUser() {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    return normalizeUser(JSON.parse(saved));
  } catch {
    return null;
  }
}

async function buildFallbackLogtoUser(logtoClient) {
  const claims = await logtoClient.getIdTokenClaims?.();
  if (!claims?.sub) return null;
  return normalizeUser({
    logtoSub: claims.sub,
    name: claims.name ?? claims.username ?? claims.email ?? "User",
    linked: false,
    organizationIds: claims.organizations ?? [],
    organizationRoles: claims.organization_roles ?? [],
  });
}

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const logto = useLogto();
  const logtoRef = useRef(logto);
  logtoRef.current = logto;

  const [user, setUser] = useState(readStoredUser);
  const [sessionLoading, setSessionLoading] = useState(LOGTO_ENABLED);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    const logtoClient = logtoRef.current;

    if (!LOGTO_ENABLED || !logtoClient.isAuthenticated) {
      setLogtoTokenProvider(null);
      return;
    }

    setLogtoTokenProvider(async () => {
      const client = logtoRef.current;
      const logtoOrgId = localStorage.getItem(LOGTO_ORG_KEY);
      if (logtoOrgId) {
        try {
          return await client.getOrganizationToken(logtoOrgId);
        } catch (e) {
          console.warn("Organization token unavailable, falling back to API token", e);
        }
      }
      try {
        return await client.getAccessToken(LOGTO_API_RESOURCE);
      } catch (e) {
        console.warn("API resource token unavailable, using app token", e);
        return client.getAccessToken();
      }
    });
  }, [logto.isAuthenticated]);

  const bootstrapFromBackend = useCallback(async () => {
    const me = await fetchMe();
    const normalized = normalizeUser({
      ...me,
      permissions: me.modulePermissions,
    });
    setUser(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

    if (me.organizationIds?.length === 1 && !localStorage.getItem(LOGTO_ORG_KEY)) {
      localStorage.setItem(LOGTO_ORG_KEY, me.organizationIds[0]);
    }
    return normalized;
  }, []);

  useEffect(() => {
    if (!LOGTO_ENABLED) {
      setSessionLoading(false);
      return;
    }

    let cancelled = false;

    async function syncSession() {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;

      if (!logto.isAuthenticated) {
        if (!readStoredUser() && !cancelled) {
          setUser(null);
        }
        if (!cancelled) setSessionLoading(false);
        syncInFlightRef.current = false;
        return;
      }

      setSessionLoading(true);

      try {
        await bootstrapFromBackend();
      } catch (err) {
        console.error("Failed to bootstrap session from /auth/me", err);
        try {
          const fallback = await buildFallbackLogtoUser(logtoRef.current);
          if (!cancelled) {
            if (fallback) {
              setUser(fallback);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
            } else {
              setUser(null);
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        } catch (fallbackErr) {
          console.error("Failed to read Logto ID token claims", fallbackErr);
          if (!cancelled) {
            setUser(null);
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
        syncInFlightRef.current = false;
      }
    }

    syncSession();
    return () => {
      cancelled = true;
    };
  }, [logto.isAuthenticated, bootstrapFromBackend]);

  const loginLegacy = useCallback((userObj) => {
    const normalized = normalizeUser({ ...userObj, linked: true });
    setUser(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    if (LOGTO_ENABLED && logtoRef.current.isAuthenticated) {
      await logtoRef.current.signOut(window.location.origin + "/login");
    }
    setUser(null);
    localStorage.clear();
  }, []);

  const refreshSession = useCallback(async () => {
    if (!logtoRef.current.isAuthenticated) return null;
    setSessionLoading(true);
    try {
      return await bootstrapFromBackend();
    } catch (err) {
      console.error("Failed to refresh session", err);
      const fallback = await buildFallbackLogtoUser(logtoRef.current);
      if (fallback) {
        setUser(fallback);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
      }
      throw err;
    } finally {
      setSessionLoading(false);
    }
  }, [bootstrapFromBackend]);

  const value = useMemo(
    () => ({
      user,
      sessionLoading,
      loginLegacy,
      logout,
      refreshSession,
      isAuthenticated: !!user,
      isLogtoAuthenticated: logto.isAuthenticated,
    }),
    [user, sessionLoading, loginLegacy, logout, refreshSession, logto.isAuthenticated]
  );

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return ctx;
}
