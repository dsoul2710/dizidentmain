import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App.jsx';
import './assets/css/clinic-overrides.css';

// Global Fetch Interceptor to inject cookies & active org headers
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
    if (input instanceof Request) {
      const activeOrgId = localStorage.getItem("hms_active_org_id");
      const newHeaders = new Headers(input.headers);
      if (activeOrgId) {
        newHeaders.set("X-Active-Org-Id", activeOrgId);
      }
      
      const newInit = {
        ...init,
        credentials: "include",
        headers: newHeaders
      };
      
      input = new Request(input, newInit);
    } else {
      init = init || {};
      init.credentials = "include";
      
      const activeOrgId = localStorage.getItem("hms_active_org_id");
      if (activeOrgId) {
        if (!init.headers) {
          init.headers = {};
        }
        if (init.headers instanceof Headers) {
          init.headers.set("X-Active-Org-Id", activeOrgId);
        } else if (Array.isArray(init.headers)) {
          const exists = init.headers.some(h => h[0].toLowerCase() === "x-active-org-id");
          if (!exists) {
            init.headers.push(["X-Active-Org-Id", activeOrgId]);
          }
        } else {
          init.headers["X-Active-Org-Id"] = activeOrgId;
        }
      }
    }
  }

  return originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
