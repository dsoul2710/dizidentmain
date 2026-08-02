import api from "./client";

export function listPatients(params) {
  return api.get("/patients", { params });
}

export function getPatient(id) {
  return api.get(`/patients/${id}`);
}

export function createPatient(body) {
  return api.post("/patients", body);
}

export function updatePatient(id, body) {
  return api.put(`/patients/${id}`, body);
}
