import React, { useState } from "react";
import SourceOrgBadge from "@/shared/components/attribution/SourceOrgBadge";

export default function LabOrdersView() {
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("hms_lab_orders");
    if (saved) return JSON.parse(saved);
    return [
      { id: "LAB-29381", patient: "Misha Patient", testName: "CBC (Complete Blood Count)", doctor: "Dr. Mishan", status: "PENDING", date: "2026-06-18", findings: "", sourceType: "HOSPITAL", sourceOrgName: "City Dental" },
      { id: "LAB-29382", patient: "Jane Smith", testName: "Thyroid Profile (T3, T4, TSH)", doctor: "Dr. Mishan", status: "PENDING", date: "2026-06-17", findings: "", sourceType: "HOSPITAL", sourceOrgName: "City Dental" },
      { id: "LAB-29383", patient: "Alice Brown", testName: "HbA1c (Glycated Hemoglobin)", doctor: "Dr. Mishan", status: "COMPLETED", date: "2026-06-15", findings: "HbA1c: 5.8% (Normal)", sourceType: "OWN_PRACTICE" },
    ];
  });

  const [activeOrder, setActiveOrder] = useState(null);
  const [findingsText, setFindingsText] = useState("");

  const saveOrders = (updated) => {
    setOrders(updated);
    localStorage.setItem("hms_lab_orders", JSON.stringify(updated));
  };

  const handleOpenResultsForm = (order) => {
    setActiveOrder(order);
    setFindingsText(order.findings);
  };

  const handleSaveResults = () => {
    if (!activeOrder) return;
    const updated = orders.map((o) => {
      if (o.id === activeOrder.id) {
        return { ...o, findings: findingsText, status: "COMPLETED" };
      }
      return o;
    });
    saveOrders(updated);
    setActiveOrder(null);
    alert(`Results uploaded and report marked COMPLETED for ${activeOrder.patient}`);
  };

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
          <h2>Lab Orders</h2>
          <div className="page-subtitle">Review pending requests and upload diagnostic findings.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <h6 className="mb-0 fw-semibold text-lg">Lab Orders Queue</h6>
            <span className="text-md fw-medium text-secondary-light mb-0">
              {orders.length} order{orders.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="card-body p-24">
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Patient</th>
                    <th>Test Name</th>
                    <th>Prescribing Doctor</th>
                    <th>Source</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center", fontSize: 12 }}>
                        No lab orders in queue.
                      </td>
                    </tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="fw-semibold">{o.id}</td>
                      <td>{o.patient}</td>
                      <td>{o.testName}</td>
                      <td>{o.doctor}</td>
                      <td>
                        <SourceOrgBadge sourceType={o.sourceType} sourceOrgName={o.sourceOrgName} />
                      </td>
                      <td>{o.date}</td>
                      <td>{renderStatusPill(o.status)}</td>
                      <td className="text-right">
                        <div className="table-actions">
                          {o.status === "PENDING" ? (
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => handleOpenResultsForm(o)}
                            >
                              Upload Results
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => alert(`Report findings:\n${o.findings}`)}
                            >
                              View Findings
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
                <h5 className="modal-title fw-bold">Enter Lab Findings</h5>
                <button type="button" className="btn-close" onClick={() => setActiveOrder(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Patient</label>
                  <input type="text" className="form-control" value={activeOrder.patient} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Test Name</label>
                  <input type="text" className="form-control" value={activeOrder.testName} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Findings / Diagnostic Details</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Enter lab values, ranges, and diagnostic summary..."
                    value={findingsText}
                    onChange={(e) => setFindingsText(e.target.value)}
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
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveResults}>
                  Submit Lab Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
