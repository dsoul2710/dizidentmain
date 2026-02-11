import axios from "axios";
import { API_BASE_URL } from "../config";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-loading", { detail: 1 }));
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
    }
    return response;
  },
  (error) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("app-loading", { detail: -1 }));
    }
    return Promise.reject(error);
  }
);

export default api;
