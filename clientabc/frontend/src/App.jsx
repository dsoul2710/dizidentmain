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
    setUser(null);
    localStorage.removeItem("hms_user");
    // later you can also call Spring Boot /auth/logout here
  };

  // Helper to send logged-in user to correct dashboard
  const getDefaultRouteForUser = () => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin/overview";
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

        {/* Admin dashboard */}
        <Route
          path="/admin/*"
          element={
            user?.role === "ADMIN" ? (
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
