// src/App.jsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/dashboards/Dashboard";
import DoctorDashboard from "./pages/dashboards/DoctorDashboard";
import PatientDashboard from "./pages/dashboards/PatientDashboard";
import SuperAdminDashboard from "./pages/dashboards/SuperAdminDashboard";
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
        const normalized = {
          ...parsed,
          id: parsed.id ?? parsed.userId ?? null,
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
    const normalized = {
      ...userObj,
      id: userObj.id ?? userObj.userId ?? null,
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
    if (user.role === "SUPERADMIN") return "/super-admin/overview";
    if (user.role === "ORG") return "/org/overview";
    if (user.role === "DOCTOR") return "/doctor/overview";
    if (user.role === "PATIENT") return "/patient/overview";
    return "/login";
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

        {/* Super Admin dashboard */}
        <Route
          path="/super-admin/*"
          element={
            user?.role === "SUPERADMIN" ? (
              <SuperAdminDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Org dashboard */}
        <Route
          path="/org/*"
          element={
            user?.role === "ORG" ? (
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Doctor dashboard */}
        <Route
          path="/doctor/*"
          element={
            user?.role === "DOCTOR" ? (
              <DoctorDashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Patient dashboard */}
        <Route
          path="/patient/*"
          element={
            user?.role === "PATIENT" ? (
              <PatientDashboard user={user} onLogout={handleLogout} />
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
