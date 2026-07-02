// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "@/features/auth/pages/LoginPage";
import UnifiedDashboard from "@/features/dashboard/pages/UnifiedDashboard";
import { ToastProvider } from "@/shared/components/common/ToastProvider";
import GlobalLoader from "@/shared/components/common/GlobalLoader";
import { API_BASE_URL } from "@/config";

export default function App() {
  const [user, setUser] = useState(null);
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  // OPTIONAL: restore from localStorage if you want persistence on refresh
  useEffect(() => {
    const saved = localStorage.getItem("hms_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let role = parsed.role;
        if (role === "SUPER_ADMIN") role = "SUPERADMIN";
        if (role === "ORG_HOSPITAL") role = "ORG";
        const normalized = {
          ...parsed,
          id: parsed.id ?? parsed.userId ?? null,
          role,
        };
        setUser(normalized);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => setIsBackendOffline(true);
    const handleOnline = () => setIsBackendOffline(false);

    window.addEventListener("backend-offline", handleOffline);
    window.addEventListener("backend-online", handleOnline);

    return () => {
      window.removeEventListener("backend-offline", handleOffline);
      window.removeEventListener("backend-online", handleOnline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__fetchPatched) return;
    window.__fetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      const url = typeof args[0] === "string" ? args[0] : (args[0] instanceof Request ? args[0].url : "");
      const isBackend = url.includes(API_BASE_URL) || url.startsWith("/api");

      window.dispatchEvent(new CustomEvent("app-loading", { detail: 1 }));
      return originalFetch(...args)
        .then((response) => {
          if (isBackend) {
            window.dispatchEvent(new CustomEvent("backend-online"));
          }
          return response;
        })
        .catch((error) => {
          if (isBackend) {
            window.dispatchEvent(new CustomEvent("backend-offline"));
          }
          throw error;
        })
        .finally(() => {
          window.dispatchEvent(new CustomEvent("app-loading", { detail: -1 }));
        });
    };
  }, []);

  const handleLogin = (userObj) => {
    // Normalize so we always have user.id = backend users.id
    let role = userObj.role;
    if (role === "SUPER_ADMIN") role = "SUPERADMIN";
    if (role === "ORG_HOSPITAL") role = "ORG";
    const normalized = {
      ...userObj,
      id: userObj.id ?? userObj.userId ?? null,
      role,
    };

    setUser(normalized);
    localStorage.setItem("hms_user", JSON.stringify(normalized));
  };
  const handleLogout = () => {
    // Clear user state
    setUser(null);

    // Clear localStorage
    localStorage.clear();

    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
      if (name) {
        // Set expiry to past date to delete the cookie
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
      }
    });

    // Call Spring Boot logout endpoint if available
    // await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
  };

  // Helper to send logged-in user to correct dashboard
  const getDefaultRouteForUser = () => {
    if (!user) return "/login";
    return "/dashboard/overview";
  };

  return (
    <ToastProvider>
      <GlobalLoader />
      {isBackendOffline && (
        <div className="backend-offline-banner">
          <i className="ri-error-warning-line text-lg"></i>
          <span>Backend server is offline. Please check your connection or restart the server.</span>
        </div>
      )}
      <Router>
        <Routes>
          {/* Default route */}
          <Route
            path="/"
            element={<Navigate to={getDefaultRouteForUser()} replace />}
          />

        {/* Login */}
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={getDefaultRouteForUser()} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />

        {/* Unified Dashboard */}
        <Route
          path="/dashboard/*"
          element={
            user ? (
              <UnifiedDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}
