import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function BedsAllocationView() {
  const [beds, setBeds] = useState(() => {
    const list = [];
    for (let i = 1; i <= 20; i++) {
      list.push({
        id: i,
        name: `Bed-0${i}`,
        status: i % 4 === 0 ? "OCCUPIED" : i % 7 === 0 ? "CLEANING" : "AVAILABLE",
        patient: i % 4 === 0 ? "John Patient" : "",
      });
    }
    return list;
  });

  const [selectedBed, setSelectedBed] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatientName, setSelectedPatientName] = useState("");

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await api.get("/patients");
        setPatients(res.data || []);
      } catch (err) {
        console.error("Failed to load patients for bed manager", err);
      }
    };
    loadPatients();
  }, []);

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    setSelectedPatientName(bed.patient || "");
  };

  const handleSaveBedStatus = (newStatus) => {
    if (!selectedBed) return;
    const updated = beds.map((b) => {
      if (b.id === selectedBed.id) {
        return {
          ...b,
          status: newStatus,
          patient: newStatus === "OCCUPIED" ? selectedPatientName : "",
        };
      }
      return b;
    });
    setBeds(updated);
    setSelectedBed(null);
  };

  const statusTone = (status) => {
    if (status === "OCCUPIED") return "border-warning-500 bg-warning-50";
    if (status === "CLEANING") return "border-neutral-400 bg-neutral-100";
    return "border-success-500 bg-success-50";
  };

  const statusTextTone = (status) => {
    if (status === "OCCUPIED") return "text-warning-600";
    if (status === "CLEANING") return "text-secondary-light";
    return "text-success-600";
  };

  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>Beds Allocation</h2>
          <div className="page-subtitle">Manage ward capacity, occupancy, and patient assignments.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold text-lg">Ward Accommodation Layout</h6>
          </div>
          <div className="card-body p-24">
            <div className="d-flex gap-4 mb-24 flex-wrap text-sm text-secondary-light">
              <span className="d-flex align-items-center gap-2">
                <span className="w-12-px h-12-px rounded bg-success-500 d-inline-block"></span>
                Available
              </span>
              <span className="d-flex align-items-center gap-2">
                <span className="w-12-px h-12-px rounded bg-warning-500 d-inline-block"></span>
                Occupied
              </span>
              <span className="d-flex align-items-center gap-2">
                <span className="w-12-px h-12-px rounded bg-neutral-400 d-inline-block"></span>
                Cleaning / Maintenance
              </span>
            </div>

            <div className="row g-3">
              {beds.map((b) => (
                <div className="col-6 col-md-3 col-lg-2" key={b.id}>
                  <div
                    className={`card border border-2 ${statusTone(b.status)} text-center radius-8 p-3 cursor-pointer h-100`}
                    onClick={() => handleBedClick(b)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleBedClick(b)}
                  >
                    <i className="ri-hotel-bed-line fs-2 text-secondary-light"></i>
                    <div className="fw-semibold text-sm mt-1 text-primary-light">{b.name}</div>
                    <div className={`text-xs fw-semibold ${statusTextTone(b.status)}`}>{b.status}</div>
                    {b.patient && (
                      <div
                        className="text-xs text-secondary-light mt-1"
                        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                      >
                        {b.patient}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedBed && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelectedBed(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 radius-12">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Manage {selectedBed.name}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedBed(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Assign Patient (Optional)</label>
                  <select
                    className="form-select"
                    value={selectedPatientName}
                    onChange={(e) => setSelectedPatientName(e.target.value)}
                  >
                    <option value="">No Patient (Unassigned)</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.name || p.fullName}>
                        {p.name || p.fullName} ({p.mobile})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer border-top d-flex justify-content-between">
                <div>
                  <button
                    type="button"
                    className="btn btn-success btn-sm me-2"
                    onClick={() => handleSaveBedStatus("AVAILABLE")}
                  >
                    Make Available
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSaveBedStatus("CLEANING")}
                  >
                    Clean / Blocked
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  onClick={() => handleSaveBedStatus("OCCUPIED")}
                  disabled={!selectedPatientName}
                >
                  Assign & Occupy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
