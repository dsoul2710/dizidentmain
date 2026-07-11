import React from 'react';
import ReactDOM from 'react-dom/client';
import { LogtoProvider } from '@logto/react';
import App from '@/app/App.jsx';
import { logtoConfig, LOGTO_ENABLED } from '@/config/logto';
import { AuthSessionProvider } from '@/features/auth/context/AuthSessionProvider';
import { getLogtoAccessToken } from '@/features/auth/logto/tokenStore';
import './assets/css/clinic-overrides.css';

const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  let url = "";
  if (typeof input === "string") {
    url = input;
  } else if (input && typeof input === "object" && "url" in input) {
    url = input.url;
  }

  const isApiRequest = url.includes("/api/") || url.includes("/api");

  if (isApiRequest) {
    const token = await getLogtoAccessToken();
    const activeOrgId =
      localStorage.getItem("hms_active_logto_org_id") ||
      localStorage.getItem("hms_active_org_id");

    if (input instanceof Request) {
      const newHeaders = new Headers(input.headers);
      if (token) {
        newHeaders.set("Authorization", `Bearer ${token}`);
      }
      if (activeOrgId) {
        newHeaders.set("X-Active-Org-Id", activeOrgId);
      }

      input = new Request(input, {
        ...init,
        credentials: "include",
        headers: newHeaders,
      });
    } else {
      init = init || {};
      init.credentials = "include";
      init.headers = init.headers || {};
      if (init.headers instanceof Headers) {
        if (token) init.headers.set("Authorization", `Bearer ${token}`);
        if (activeOrgId) init.headers.set("X-Active-Org-Id", activeOrgId);
      } else if (Array.isArray(init.headers)) {
        if (token) init.headers.push(["Authorization", `Bearer ${token}`]);
        if (activeOrgId) init.headers.push(["X-Active-Org-Id", activeOrgId]);
      } else {
        if (token) init.headers["Authorization"] = `Bearer ${token}`;
        if (activeOrgId) init.headers["X-Active-Org-Id"] = activeOrgId;
      }
    }
  }

  return originalFetch(input, init);
};

const tree = LOGTO_ENABLED ? (
  <LogtoProvider config={logtoConfig}>
    <AuthSessionProvider>
      <App />
    </AuthSessionProvider>
  </LogtoProvider>
) : (
  <AuthSessionProvider>
    <App />
  </AuthSessionProvider>
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {tree}
  </React.StrictMode>
);
