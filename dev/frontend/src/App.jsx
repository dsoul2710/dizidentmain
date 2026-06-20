// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage";
import UnifiedDashboard from "./pages/dashboards/UnifiedDashboard";
import { ToastProvider } from "./components/common/ToastProvider";
import GlobalLoader from "./components/common/GlobalLoader";

export default function App() {
  const [user, setUser] = useState(null);

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
    if (typeof window === "undefined") return;
    if (window.__fetchPatched) return;
    window.__fetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      window.dispatchEvent(new CustomEvent("app-loading", { detail: 1 }));
      return originalFetch(...args).finally(() => {
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
