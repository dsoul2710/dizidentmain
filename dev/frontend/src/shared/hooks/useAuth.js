import { useCallback, useState } from "react";

const STORAGE_KEY = "hms_user";

function normalizeUser(userObj) {
  if (!userObj) return null;
  let role = userObj.role;
  if (role === "SUPER_ADMIN") role = "SUPERADMIN";
  if (role === "ORG_HOSPITAL") role = "ORG";
  return {
    ...userObj,
    id: userObj.id ?? userObj.userId ?? null,
    role,
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

/**
 * Auth session hook — reads/writes hms_user from localStorage.
 * App.jsx owns top-level routing; this hook is for feature pages.
 */
export function useAuth() {
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((userObj) => {
    const normalized = normalizeUser(userObj);
    setUser(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.clear();
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      }
    });
  }, []);

  return { user, login, logout, isAuthenticated: !!user };
}
