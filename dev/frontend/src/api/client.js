import axios from "axios";
import { API_BASE_URL } from "@/config";
import { getLogtoAccessToken } from "@/features/auth/logto/tokenStore";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-loading", { detail: 1 }));

      const token = await getLogtoAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const activeOrgId =
        localStorage.getItem("hms_active_logto_org_id") ||
        localStorage.getItem("hms_active_org_id");
      if (activeOrgId) {
        config.headers["X-Active-Org-Id"] = activeOrgId;
      }
    }
    return config;
  },
  (error) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-loading", { detail: -1 }));
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-loading", { detail: -1 }));
      window.dispatchEvent(new CustomEvent("backend-online"));
    }
    return response;
  },
  (error) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-loading", { detail: -1 }));
      if (!error.response) {
        window.dispatchEvent(new CustomEvent("backend-offline"));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
