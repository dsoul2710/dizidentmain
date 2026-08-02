import api from "@/api/client";

export function login(mobile, password) {
  return api.post("/auth/login", { mobile, password });
}

export function logout() {
  return api.post("/auth/logout");
}

export async function fetchMe() {
  const res = await api.get("/auth/me");
  return res.data;
}
