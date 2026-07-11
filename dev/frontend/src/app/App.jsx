// src/App.jsx
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "@/features/auth/pages/LoginPage";
import CallbackPage from "@/features/auth/pages/CallbackPage";
import LogtoAccountPendingPage from "@/features/auth/pages/LogtoAccountPendingPage";
import UnifiedDashboard from "@/features/dashboard/pages/UnifiedDashboard";
import { ToastProvider } from "@/shared/components/common/ToastProvider";
import GlobalLoader from "@/shared/components/common/GlobalLoader";
import { API_BASE_URL } from "@/config";
import { useAuthSession } from "@/features/auth/context/AuthSessionProvider";
import { LOGTO_ENABLED } from "@/config/logto";

function AppRoutes() {
  const { user, sessionLoading, logout, refreshSession, isLogtoAuthenticated } = useAuthSession();
  const [isBackendOffline, setIsBackendOffline] = useState(false);

  const isLoggedIn = !!user || (LOGTO_ENABLED && isLogtoAuthenticated);
  const needsAccountLink = !!user && user.linked === false;

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

  const getDefaultRouteForUser = () => {
    if (!isLoggedIn) return "/login";
    return "/dashboard/overview";
  };

  if (sessionLoading && LOGTO_ENABLED && isLogtoAuthenticated) {
    return (
      <div className="p-32 text-center">
        <p>Loading session…</p>
      </div>
    );
  }

  return (
    <>
      {isBackendOffline && (
        <div className="backend-offline-banner">
          <i className="ri-error-warning-line text-lg"></i>
          <span>Backend server is offline. Please check your connection or restart the server.</span>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Navigate to={getDefaultRouteForUser()} replace />} />

        <Route path="/callback" element={<CallbackPage />} />

        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to={getDefaultRouteForUser()} replace />
            ) : sessionLoading ? (
              <div className="p-32 text-center"><p>Loading session…</p></div>
            ) : (
              <LoginPage />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            sessionLoading && isLogtoAuthenticated ? (
              <div className="p-32 text-center"><p>Loading profile…</p></div>
            ) : needsAccountLink ? (
              <LogtoAccountPendingPage
                user={user}
                onLogout={logout}
                onRetry={refreshSession}
              />
            ) : user ? (
              <UnifiedDashboard user={user} onLogout={logout} />
            ) : isLoggedIn ? (
              <div className="p-32 text-center"><p>Loading profile…</p></div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <GlobalLoader />
      <Router>
        <AppRoutes />
      </Router>
    </ToastProvider>
  );
}
