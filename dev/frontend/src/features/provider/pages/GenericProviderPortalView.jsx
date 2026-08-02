import React, { useState, useMemo } from "react";

const PROVIDER_METADATA = {
  PHARMACY: {
    title: "Pharmacy Portal",
    subtitle: "Manage prescription fulfillment and inventory dispensary.",
    testLabel: "Prescribed Items",
    actionLabel: "Fulfill & Dispense",
    successMsg: "Prescription successfully marked as FULFILLED.",
    defaultOrders: [
      { id: "RX-101", patient: "Alice Cooper", detail: "Amoxicillin 500mg (15 tabs), Paracetamol 650mg (10 tabs)", doctor: "Dr. Mishan", date: "2026-06-20", status: "PENDING" },
      { id: "RX-102", patient: "Robert Brown", detail: "Ibuprofen 400mg (20 tabs), Omeprazole 20mg (10 caps)", doctor: "Dr. Mishan", date: "2026-06-19", status: "PENDING" },
      { id: "RX-103", patient: "Clara Oswald", detail: "Metformin 500mg (30 tabs), Atorvastatin 10mg (30 tabs)", doctor: "Dr. Mishan", date: "2026-06-18", status: "COMPLETED" },
    ]
  },
  RADIOLOGY: {
    title: "Radiology Portal",
    subtitle: "Process diagnostic imaging requests and upload scans.",
    testLabel: "Modality & Area",
    actionLabel: "Upload Image & Complete",
    successMsg: "Radiology report and scan uploaded successfully.",
    defaultOrders: [
      { id: "RAD-201", patient: "John Watson", detail: "Chest X-Ray (PA View)", doctor: "Dr. Mishan", date: "2026-06-20", status: "PENDING" },
      { id: "RAD-202", patient: "Eleanor Vance", detail: "Brain MRI (Contrast)", doctor: "Dr. Mishan", date: "2026-06-19", status: "PENDING" },
      { id: "RAD-203", patient: "Luke Crain", detail: "Right Knee CT Scan", doctor: "Dr. Mishan", date: "2026-06-17", status: "COMPLETED" },
    ]
  },
  PATHOLOGY: {
    title: "Pathology Portal",
    subtitle: "Analyze specimens, blood samples, and submit pathology reports.",
    testLabel: "Investigation Required",
    actionLabel: "Submit Lab Findings",
    successMsg: "Pathology investigation results submitted successfully.",
    defaultOrders: [
      { id: "PAT-301", patient: "Donna Noble", detail: "Liver Function Test (LFT)", doctor: "Dr. Mishan", date: "2026-06-20", status: "PENDING" },
      { id: "PAT-302", patient: "Martha Jones", detail: "Lipid Profile Panel", doctor: "Dr. Mishan", date: "2026-06-19", status: "PENDING" },
      { id: "PAT-303", patient: "Jack Harkness", detail: "Complete Blood Count (CBC)", doctor: "Dr. Mishan", date: "2026-06-16", status: "COMPLETED" },
    ]
  },
  BLOOD_BANK: {
    title: "Blood Bank Management",
    subtitle: "Manage blood component requisition and cross-matching.",
    testLabel: "Blood Type & Units",
    actionLabel: "Release Units & Dispatch",
    successMsg: "Blood units successfully issued and dispatched.",
    defaultOrders: [
      { id: "BLD-401", patient: "Mickey Smith", detail: "O Negative [O-] (2 Units)", doctor: "Dr. Mishan", date: "2026-06-20", status: "PENDING" },
      { id: "BLD-402", patient: "Rose Tyler", detail: "A Positive [A+] (1 Unit)", doctor: "Dr. Mishan", date: "2026-06-19", status: "PENDING" },
      { id: "BLD-403", patient: "Wilfred Mott", detail: "AB Positive [AB+] (3 Units)", doctor: "Dr. Mishan", date: "2026-06-15", status: "COMPLETED" },
    ]
  },
  AMBULANCE: {
    title: "Ambulance Dispatch Portal",
    subtitle: "Manage emergency response requests and fleet allocation.",
    testLabel: "Destination & Priority",
    actionLabel: "Dispatch Vehicle",
    successMsg: "Ambulance vehicle successfully dispatched.",
    defaultOrders: [
      { id: "AMB-501", patient: "Rory Williams", detail: "St. Jude Hospital (High Priority)", doctor: "Dr. Mishan", date: "2026-06-20", status: "PENDING" },
      { id: "AMB-502", patient: "Amy Pond", detail: "City Clinic West (Standard Priority)", doctor: "Dr. Mishan", date: "2026-06-20", status: "PENDING" },
      { id: "AMB-503", patient: "River Song", detail: "General Medical Center (Normal)", doctor: "Dr. Mishan", date: "2026-06-18", status: "COMPLETED" },
    ]
  },
  ORTHODONTIC_LAB: {
    title: "Orthodontic Dental Lab",
    subtitle: "Manage physical impression castings, aligners, and dental models.",
    testLabel: "Orthodontic Design Specification",
    actionLabel: "Submit Fabrication Specs",
    successMsg: "Dental mold and fabrication specifications recorded.",
    defaultOrders: [
      { id: "ORTHO-601", patient: "Melody Pond", detail: "Clear Aligner Case (Upper & Lower)", doctor: "Dr. Mishan", date: "2026-06-20", status: "PENDING" },
      { id: "ORTHO-602", patient: "Danny Pink", detail: "Physical Impression Cast (Stone Model)", doctor: "Dr. Mishan", date: "2026-06-19", status: "PENDING" },
      { id: "ORTHO-603", patient: "Jenny Flint", detail: "Night Guard Fabrication", doctor: "Dr. Mishan", date: "2026-06-14", status: "COMPLETED" },
    ]
  }
};

export default function GenericProviderPortalView({ type }) {
  const config = useMemo(() => PROVIDER_METADATA[type] || PROVIDER_METADATA.PHARMACY, [type]);

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem(`hms_sp_${type}_orders`);
    if (saved) return JSON.parse(saved);
    return config.defaultOrders;
  });

  const [activeOrder, setActiveOrder] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const updateOrders = (newList) => {
    setOrders(newList);
    localStorage.setItem(`hms_sp_${type}_orders`, JSON.stringify(newList));
  };

  const handleOpenActionForm = (order) => {
    setActiveOrder(order);
    setRemarks("");
  };

  const handleProcessOrder = () => {
    if (!activeOrder) return;
    const updated = orders.map((o) => {
      if (o.id === activeOrder.id) {
        return { ...o, status: "COMPLETED", findings: remarks };
      }
      return o;
    });
    updateOrders(updated);
    setActiveOrder(null);
    alert(config.successMsg);
  };

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.detail.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  const metrics = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const completed = total - pending;
    return { total, pending, completed };
  }, [orders]);

  const renderStatusPill = (status) => {
    const isCompleted = status === "COMPLETED";
    const color = isCompleted ? "#15803d" : "#c05621";
    const bg = isCompleted ? "rgba(22,163,74,0.08)" : "rgba(192,86,33,0.08)";
    return (
      <span
        style={{
          color,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "999px",
          fontSize: "0.75rem",
          background: bg,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>{config.title}</h2>
          <div className="page-subtitle">{config.subtitle}</div>
        </div>
      </div>

      <div className="page-body">
        {/* Metric Cards */}
        <div className="row gy-4 mb-4">
          <div className="col-sm-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{metrics.total}</h6>
                  <span className="text-secondary-light text-sm">Total Requests</span>
                </div>
                <span className="w-48-px h-48-px bg-primary-100 text-primary-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-file-list-3-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{metrics.pending}</h6>
                  <span className="text-secondary-light text-sm">Awaiting Action</span>
                </div>
                <span className="w-48-px h-48-px bg-warning-100 text-warning-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-time-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{metrics.completed}</h6>
                  <span className="text-secondary-light text-sm">Completed Tasks</span>
                </div>
                <span className="w-48-px h-48-px bg-success-100 text-success-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-checkbox-circle-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table Card */}
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <h6 className="mb-0 fw-semibold text-lg">Active Requisitions</h6>
            <div className="d-flex align-items-center gap-2">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "200px", height: "36px" }}
              />
            </div>
          </div>
          <div className="card-body p-24">
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Patient</th>
                    <th>{config.testLabel}</th>
                    <th>Prescribing Doctor</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center text-sm py-4">
                        No requests matching query.
                      </td>
                    </tr>
                  )}
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="fw-semibold text-primary-light">{o.id}</td>
                      <td>{o.patient}</td>
                      <td>{o.detail}</td>
                      <td>{o.doctor}</td>
                      <td>{o.date}</td>
                      <td>{renderStatusPill(o.status)}</td>
                      <td className="text-right">
                        <div className="table-actions">
                          {o.status === "PENDING" ? (
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleOpenActionForm(o)}
                            >
                              Process Request
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => alert(`Remarks:\n${o.findings || "No remarks saved."}`)}
                            >
                              View Specs
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {activeOrder && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setActiveOrder(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 radius-12">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Process Request {activeOrder.id}</h5>
                <button type="button" className="btn-close" onClick={() => setActiveOrder(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Patient</label>
                  <input type="text" className="form-control" value={activeOrder.patient} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">{config.testLabel}</label>
                  <textarea className="form-control" value={activeOrder.detail} disabled rows="2" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Action Remarks / Dispatch Details</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter process remarks, batch IDs, or notes..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setActiveOrder(null)}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleProcessOrder}>
                  {config.actionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
