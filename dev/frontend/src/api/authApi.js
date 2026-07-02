import api from "./client";

export function login(mobile, password) {
  return api.post("/auth/login", { mobile, password });
}

export function logout() {
  return api.post("/auth/logout");
}
