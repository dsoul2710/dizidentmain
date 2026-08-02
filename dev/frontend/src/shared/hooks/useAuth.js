import { useCallback, useState } from "react";
import { useAuthSession } from "@/features/auth/context/AuthSessionProvider";

const STORAGE_KEY = "hms_user";

/**
 * Auth session hook — prefers AuthSessionProvider; falls back to localStorage.
 */
export function useAuth() {
  const session = useAuthSession();
  const [localUser, setLocalUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  });

  const user = session.user ?? localUser;

  const login = useCallback(
    (userObj) => {
      const normalized = session.loginLegacy(userObj);
      setLocalUser(normalized);
      return normalized;
    },
    [session]
  );

  const logout = useCallback(async () => {
    await session.logout();
    setLocalUser(null);
  }, [session]);

  return { user, login, logout, isAuthenticated: !!user };
}
