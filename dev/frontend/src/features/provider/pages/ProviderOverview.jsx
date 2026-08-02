import React, { useMemo, useState } from "react";

const formatValue = (val) =>
  typeof val === "number" ? val.toLocaleString("en-IN") : val;

const PROVIDER_TYPE_LABELS = {
  LAB: "Lab Partner",
  PHARMACY: "Pharmacy Partner",
  BED_MANAGER: "Bed Manager",
  RADIOLOGY: "Radiology Partner",
  PATHOLOGY: "Pathology Partner",
  BLOOD_BANK: "Blood Bank Partner",
  AMBULANCE: "Ambulance Partner",
  ORTHODONTIC_LAB: "Orthodontic Lab Partner",
  OTHER: "Service Partner",
};

export default function ProviderOverview({ user }) {
  const types = useMemo(() => {
    if (user?.providerTypes && user.providerTypes.length > 0) {
      return Array.from(user.providerTypes);
    }
    return [user?.providerType || "OTHER"];
  }, [user]);

  const [activeTab, setActiveTab] = useState(types[0] || "OTHER");

  // Reset activeTab if types list changes (e.g. on profile reload/re-login)
  React.useEffect(() => {
    if (types.length > 0 && !types.includes(activeTab)) {
      setActiveTab(types[0]);
    }
  }, [types, activeTab]);

  const overviewMetrics = useMemo(() => {
    let metrics = [];
    if (activeTab === "LAB") {
      metrics = [
        { key: "pending", label: "Pending Lab Orders", value: 3, icon: "ri-flask-line", tone: "bg-warning-100 text-warning-600" },
        { key: "completed", label: "Completed Reports", value: 24, icon: "ri-checkbox-circle-line", tone: "bg-success-100 text-success-600" },
        { key: "critical", label: "Critical Notifications", value: 1, icon: "ri-alert-line", tone: "bg-danger-100 text-danger-600" },
      ];
    } else if (activeTab === "PHARMACY") {
      metrics = [
        { key: "lowstock", label: "Low Stock Items", value: 8, icon: "ri-alert-line", tone: "bg-danger-100 text-danger-600" },
        { key: "rx", label: "Active Rx Orders", value: 5, icon: "ri-file-list-3-line", tone: "bg-primary-100 text-primary-600" },
        { key: "vendors", label: "Total Vendors", value: 4, icon: "ri-store-2-line", tone: "bg-success-100 text-success-600" },
      ];
    } else if (activeTab === "BED_MANAGER") {
      metrics = [
        { key: "capacity", label: "Total Beds Capacity", value: 30, icon: "ri-hotel-bed-line", tone: "bg-primary-100 text-primary-600" },
        { key: "occupied", label: "Beds Occupied", value: 12, icon: "ri-user-shared-line", tone: "bg-warning-100 text-warning-600" },
        { key: "available", label: "Beds Available", value: 18, icon: "ri-checkbox-circle-line", tone: "bg-success-100 text-success-600" },
      ];
    } else {
      metrics = [
        { key: "requests", label: "Pending Requests", value: 0, icon: "ri-question-line", tone: "bg-neutral-200 text-secondary-light" },
      ];
    }

    const values = metrics.map((m) => m.value);
    const maxVal = Math.max(...values, 0);
    const pct = (value) =>
      maxVal > 0 ? Math.min(100, Math.round((value / maxVal) * 100)) : 0;

    return metrics.map((m) => ({ ...m, percent: pct(m.value) }));
  }, [activeTab]);

  const recentAlerts = useMemo(() => {
    if (activeTab === "LAB") {
      return [
        "CBC report pending upload for Misha Patient",
        "Thyroid profile requested by Dr. Mishan",
      ];
    }
    if (activeTab === "PHARMACY") {
      return [
        "8 inventory items below minimum stock level",
        "5 prescriptions awaiting fulfillment",
      ];
    }
    if (activeTab === "BED_MANAGER") {
      return [
        "12 beds currently occupied across the ward",
        "3 beds marked for cleaning/maintenance",
      ];
    }
    return ["No active alerts at this time."];
  }, [activeTab]);

  return (
    <section className="view show wowdash-users">
      {types.length > 1 && (
        <div className="d-flex flex-wrap gap-2 mb-4 border-bottom pb-3">
          {types.map((t) => (
            <button
              key={t}
              className={`btn btn-sm px-3 py-2 radius-4 fw-semibold ${activeTab === t ? "btn-primary text-white" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab(t)}
            >
              {PROVIDER_TYPE_LABELS[t] || t}
            </button>
          ))}
        </div>
      )}
      <div className="row gy-4">
        {overviewMetrics.map((metric) => (
          <div className="col-xxl-3 col-sm-6" key={metric.key}>
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{formatValue(metric.value)}</h6>
                  <span className="text-secondary-light text-sm">{metric.label}</span>
                </div>
                <span
                  className={`w-48-px h-48-px ${metric.tone} flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle`}
                >
                  <i className={`${metric.icon} text-xl`}></i>
                </span>
              </div>
              <div className="progress mt-3" style={{ height: 6 }}>
                <div
                  className="progress-bar"
                  style={{ width: `${metric.percent}%` }}
                  role="progressbar"
                  aria-valuenow={metric.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          </div>
        ))}

        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom">
              <h6 className="mb-0 fw-bold text-lg">Partner Profile</h6>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column gap-2 text-secondary-light">
                <div className="d-flex justify-content-between gap-2">
                  <span>Partner Types</span>
                  <span className="fw-semibold text-primary-light text-end">
                    {types.map((t) => PROVIDER_TYPE_LABELS[t] || t).join(", ")}
                  </span>
                </div>
                <div className="d-flex justify-content-between gap-2">
                  <span>Account Status</span>
                  <span className="fw-semibold text-success-600">Active</span>
                </div>
                <div className="d-flex justify-content-between gap-2">
                  <span>Linked Clinics</span>
                  <span className="fw-semibold text-primary-light">
                    {localStorage.getItem("hms_active_org_id") ? "1 selected" : "None"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom">
              <h6 className="mb-0 fw-bold text-lg">Recent Alerts</h6>
            </div>
            <div className="card-body">
              {recentAlerts.length === 0 ? (
                <div className="text-secondary-light">No recent alerts.</div>
              ) : (
                <ul className="mb-0 text-secondary-light">
                  {recentAlerts.map((alert, idx) => (
                    <li key={`alert-${idx}`}>{alert}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
