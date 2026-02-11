const normalizeUrl = (url) =>
  typeof url === "string" ? url.replace(/\/+$/, "") : "";

const API_BASE =
  normalizeUrl(import.meta.env.VITE_API_BASE) || "http://localhost:8080";

const API_BASE_URL =
  normalizeUrl(import.meta.env.VITE_API_BASE_URL) || `${API_BASE}/api`;

export { API_BASE, API_BASE_URL };
