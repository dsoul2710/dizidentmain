import React, { useEffect, useState } from "react";
import api from "@/api/client";
import { useToast } from "@/shared/components/common/ToastProvider";

/**
 * Super Admin: change doctor/SP operation scope.
 * entityType: 'doctor' | 'provider'
 */
export default function ChangeOperationScopeModal({
  entityType = "doctor",
  entity,
  onSuccess,
  onClose,
}) {
  const toast = useToast();
  const [operationScope, setOperationScope] = useState(entity?.operationScope || "INDEPENDENT");
  const [hospitalOrgId, setHospitalOrgId] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/organizations")
      .then((res) => setHospitals(res.data || []))
      .catch(() => toast?.warning?.("Could not load hospitals"));
  }, []);

  const endpoint =
    entityType === "provider"
      ? `/service-providers/${entity.id}/operation-scope`
      : `/doctors/${entity.id}/operation-scope`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (operationScope === "INTERNAL" && !hospitalOrgId) {
      toast?.error("Select a hospital for INTERNAL scope");
      return;
    }
    setBusy(true);
    try {
      const body = { operationScope };
      if (operationScope === "INTERNAL") {
        body.hospitalOrgId = Number(hospitalOrgId);
      }
      await api.post(endpoint, body);
      toast?.success("Operation scope updated");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) toast?.error("Not allowed");
      else if (status === 400) toast?.error(err?.response?.data?.message || "Invalid request");
      else toast?.error(err?.response?.data?.message || "Scope change failed");
    } finally {
      setBusy(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target.classList.contains("modal")) onClose?.();
  };

  const label = entityType === "provider" ? entity?.providerName : entity?.name;

  return (
    <div className="modal show wow-modal" onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div className="modal-card wow-modal-card">
        <div className="wow-modal-header d-flex justify-content-between align-items-center">
          <div>
            <h3 className="wow-modal-title">Change operation scope</h3>
            <p className="wow-modal-subtitle">{label} ({entity?.uniqueId})</p>
          </div>
          <button type="button" className="btn-close border-0 bg-transparent" onClick={onClose} aria-label="Close">
            <i className="ri-close-line"></i>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="wow-modal-form">
          <div className="colspan">
            <label className="form-label fw-semibold text-sm" htmlFor="scope-select">
              Operation scope
            </label>
            <select
              id="scope-select"
              className="form-select w-100"
              value={operationScope}
              onChange={(e) => setOperationScope(e.target.value)}
            >
              <option value="INDEPENDENT">Independent</option>
              <option value="INTERNAL">Internal</option>
            </select>
          </div>
          {operationScope === "INTERNAL" && (
            <div className="colspan">
              <label className="form-label fw-semibold text-sm" htmlFor="hospital-select">
                Hospital (required)
              </label>
              <select
                id="hospital-select"
                className="form-select w-100"
                value={hospitalOrgId}
                onChange={(e) => setHospitalOrgId(e.target.value)}
                required
              >
                <option value="">Select hospital…</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name || h.orgName || `Org ${h.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="actions wow-modal-actions colspan">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save scope
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
