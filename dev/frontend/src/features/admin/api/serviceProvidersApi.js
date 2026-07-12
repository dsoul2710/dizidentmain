import api from "@/api/client";

export function lookupProvider(uniqueId) {
  return api.get("/service-providers/lookup", { params: { uniqueId } });
}

export function onboardProvider(uniqueId) {
  return api.post("/service-providers/onboard", null, { params: { uniqueId } });
}

export function unlinkProvider(providerUserId) {
  return api.post(`/service-providers/${providerUserId}/unlink`);
}

export function myProviderClinics() {
  return api.get("/service-providers/my-clinics");
}
