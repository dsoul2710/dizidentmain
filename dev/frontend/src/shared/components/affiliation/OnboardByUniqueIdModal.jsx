import React, { useState } from "react";
import { lookupDoctor, onboardDoctor } from "@/features/admin/api/doctorsApi";
import { lookupProvider, onboardProvider } from "@/features/admin/api/serviceProvidersApi";
import { useToast } from "@/shared/components/common/ToastProvider";
import OperationScopeBadge from "@/shared/components/attribution/OperationScopeBadge";

/**
 * Lookup + onboard by unique ID for doctors or service providers.
 */
export default function OnboardByUniqueIdModal({ entityType = "doctor", onSuccess, onClose }) {
  const toast = useToast();
  const [uniqueId, setUniqueId] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const isProvider = entityType === "provider";
  const entityLabel = isProvider ? "Provider" : "Doctor";
  const placeholder = isProvider ? "SP-123456" : "DOC-123456";

  const mapError = (err) => {
    const status = err?.response?.status;
    if (status === 404) return `${entityLabel} not found`;
    if (status === 409) return "Already linked";
    if (status === 403) return "Not allowed";
    return err?.response?.data?.message || "Action failed";
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    const id = uniqueId.trim().toUpperCase();
    if (!id) {
      toast?.error("Enter a unique ID");
      return;
    }
    setBusy(true);
    setPreview(null);
    try {
      const res = isProvider ? await lookupProvider(id) : await lookupDoctor(id);
      setPreview(res.data);
      setUniqueId(id);
    } catch (err) {
      toast?.error(mapError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleOnboard = async () => {
    if (!preview?.uniqueId) return;
    if (preview.alreadyLinked) {
      toast?.error("Already linked");
      return;
    }
    if (!preview.linkable) {
      toast?.error(`${entityLabel} cannot be linked`);
      return;
    }
    setBusy(true);
    try {
      if (isProvider) {
        await onboardProvider(preview.uniqueId);
      } else {
        await onboardDoctor(preview.uniqueId);
      }
      toast?.success(`${entityLabel} linked successfully`);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast?.error(mapError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleBackdrop = (e) => {
    if (e.target.classList.contains("modal")) {
      onClose?.();
    }
  };

  const displayName = isProvider ? preview?.providerName : preview?.fullName;
  const displaySub = isProvider
    ? (preview?.providerTypes?.length ? preview.providerTypes.join(", ") : "—")
    : preview?.speciality || "—";

  return (
    <div className="modal show wow-modal" onClick={handleBackdrop} role="dialog" aria-modal="true">
      <div className="modal-card wow-modal-card">
        <div className="wow-modal-header d-flex justify-content-between align-items-center">
          <div>
            <h3 className="wow-modal-title">Add existing {entityLabel.toLowerCase()}</h3>
            <p className="wow-modal-subtitle">
              Link by unique ID to collaborate across hospitals.
            </p>
          </div>
          <button
            type="button"
            className="btn-close border-0 bg-transparent text-secondary-light"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>

        <form onSubmit={handleLookup} className="wow-modal-form">
          <div className="colspan">
            <label className="form-label fw-semibold text-sm text-primary-light" htmlFor="onboard-unique-id">
              Unique ID
            </label>
            <input
              id="onboard-unique-id"
              type="text"
              className="form-control w-100"
              placeholder={placeholder}
              value={uniqueId}
              onChange={(e) => {
                setUniqueId(e.target.value);
                setPreview(null);
              }}
              autoFocus
            />
          </div>

          {preview && (
            <div className="colspan border radius-8 p-3 bg-neutral-50">
              <div className="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div className="fw-semibold text-primary-light">{displayName}</div>
                  <div className="text-sm text-secondary-light">{displaySub}</div>
                  <div className="text-sm mt-1">{preview.uniqueId}</div>
                </div>
                <OperationScopeBadge operationScope={preview.operationScope} />
              </div>
              {preview.alreadyLinked && (
                <div className="text-warning text-sm mt-2">Already linked to this clinic.</div>
              )}
            </div>
          )}

          <div className="actions wow-modal-actions colspan">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            {!preview ? (
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Look up
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOnboard}
                disabled={busy || preview.alreadyLinked || !preview.linkable}
              >
                Confirm link
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
