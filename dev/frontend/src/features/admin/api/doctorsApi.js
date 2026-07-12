import api from "@/api/client";

export function lookupDoctor(uniqueId) {
  return api.get("/doctors/lookup", { params: { uniqueId } });
}

export function onboardDoctor(uniqueId) {
  return api.post("/doctors/onboard", null, { params: { uniqueId } });
}

export function unlinkDoctor(doctorUserId) {
  return api.post(`/doctors/${doctorUserId}/unlink`);
}

export function myClinics() {
  return api.get("/doctors/my-clinics");
}
