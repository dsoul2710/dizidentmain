import React, { useEffect, useMemo, useState } from "react";
import { useOrgContext } from "@/shared/hooks/useOrgContext";
import { useToast } from "@/shared/components/common/ToastProvider";
import { myClinics } from "@/features/admin/api/doctorsApi";
import { myProviderClinics } from "@/features/admin/api/serviceProvidersApi";
import { OWN_PRACTICE_VALUE } from "@/shared/orgContextStorage";

const LOGTO_ORG_KEY = "hms_active_logto_org_id";

/**
 * Switch active organization.
 * Doctor / Service Provider: HMS my-clinics; INDEPENDENT gets Own practice.
 */
export default function OrgSwitcher({
  organizationIds = [],
  organizationRoles = [],
  userRole,
}) {
  const { activeOrgId, setActiveOrgId } = useOrgContext();
  const toast = useToast();
  const role = String(userRole || "").toUpperCase();
  const isDoctor = role === "DOCTOR";
  const isProvider = role === "SERVICE_PROVIDER";
  const usesHmsClinics = isDoctor || isProvider;

  const [clinics, setClinics] = useState([]);
  const [operationScope, setOperationScope] = useState("INDEPENDENT");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!usesHmsClinics) return;
    let cancelled = false;
    const fetchClinics = isDoctor ? myClinics() : myProviderClinics();
    fetchClinics
      .then((res) => {
        if (cancelled) return;
        const data = res.data || {};
        setClinics(Array.isArray(data.clinics) ? data.clinics : []);
        setOperationScope(data.operationScope || "INDEPENDENT");
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        toast?.warning?.("Could not refresh clinics; keeping last selection");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [usesHmsClinics, isDoctor]);

  useEffect(() => {
    if (!usesHmsClinics || !loaded) return;
    if (String(operationScope).toUpperCase() === "INTERNAL" && clinics.length > 0) {
      const boundId = String(clinics[0].id);
      if (String(activeOrgId || "") !== boundId) {
        setActiveOrgId(boundId);
      }
    }
  }, [usesHmsClinics, loaded, operationScope, clinics, activeOrgId, setActiveOrgId]);

  const clinicOptions = useMemo(() => {
    const opts = clinics.map((c) => ({
      value: String(c.id),
      label: c.name || `Clinic ${c.id}`,
    }));
    if (String(operationScope).toUpperCase() !== "INTERNAL") {
      opts.push({ value: OWN_PRACTICE_VALUE, label: "Own practice" });
    }
    return opts;
  }, [clinics, operationScope]);

  if (usesHmsClinics) {
    if (!loaded && clinicOptions.length === 0) return null;
    if (clinicOptions.length === 0) return null;

    const isOwnPractice =
      activeOrgId == null ||
      activeOrgId === "" ||
      activeOrgId === OWN_PRACTICE_VALUE;

    const selectValue = isOwnPractice ? OWN_PRACTICE_VALUE : String(activeOrgId);

    const resolvedValue = (() => {
      if (isOwnPractice) {
        // Never fall back to first clinic while in Own practice context
        return clinicOptions.some((o) => o.value === OWN_PRACTICE_VALUE)
          ? OWN_PRACTICE_VALUE
          : selectValue;
      }
      if (clinicOptions.some((o) => o.value === selectValue)) {
        return selectValue;
      }
      return clinicOptions[0]?.value;
    })();

    const handleClinicChange = (e) => {
      const value = e.target.value;
      if (value === OWN_PRACTICE_VALUE) {
        setActiveOrgId(null);
      } else {
        setActiveOrgId(value);
      }
      window.location.reload();
    };

    return (
      <select
        className="form-select form-select-sm w-auto"
        value={resolvedValue}
        onChange={handleClinicChange}
        aria-label="Active clinic"
      >
        {clinicOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (!organizationIds || organizationIds.length <= 1) {
    return null;
  }

  const activeLogtoOrg =
    localStorage.getItem(LOGTO_ORG_KEY) || organizationIds[0] || "";

  const handleChange = (e) => {
    const logtoOrgId = e.target.value;
    localStorage.setItem(LOGTO_ORG_KEY, logtoOrgId);
    setActiveOrgId(logtoOrgId);
    window.location.reload();
  };

  const labelForOrg = (orgId) => {
    const roleEntry = organizationRoles.find((r) => r.startsWith(`${orgId}:`));
    const roleLabel = roleEntry ? roleEntry.split(":").slice(1).join(":") : "member";
    return `${orgId.slice(0, 8)}… (${roleLabel})`;
  };

  return (
    <select
      className="form-select form-select-sm w-auto"
      value={activeLogtoOrg}
      onChange={handleChange}
      aria-label="Active organization"
    >
      {organizationIds.map((orgId) => (
        <option key={orgId} value={orgId}>
          {labelForOrg(orgId)}
        </option>
      ))}
    </select>
  );
}
