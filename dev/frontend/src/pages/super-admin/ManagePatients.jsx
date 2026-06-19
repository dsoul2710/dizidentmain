import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/api";

export default function ManagePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [city, setCity] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalHx, setMedicalHx] = useState("");
  const [primaryComplaint, setPrimaryComplaint] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Search, Status and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadPatients = () => {
    setLoading(true);
    api.get("/patients")
      .then((res) => setPatients(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const openAddModal = () => {
    setEditingPatient(null);
    setName("");
    setMobile("");
    setPassword("");
    setDob("");
    setAge("");
    setGender("Male");
    setCity("");
    setAllergies("");
    setMedicalHx("");
    setPrimaryComplaint("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (pat) => {
    setEditingPatient(pat);
    setName(pat.name || "");
    setMobile(pat.mobile || "");
    setPassword("");
    setDob(pat.dob || "");
    setAge(pat.age ?? "");
    setGender(pat.gender || "Male");
    setCity(pat.city || "");
    setAllergies(pat.allergies || "");
    setMedicalHx(pat.medical_hx || "");
    setPrimaryComplaint(pat.primary_complaint || "");
    setIsActive(pat.isActive ?? true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      alert("Name and Mobile are required");
      return;
    }

    const payload = {
      name,
      mobile,
      dob: dob || null,
      age: age ? Number(age) : null,
      gender,
      city,
      allergies,
      medical_hx: medicalHx,
      primary_complaint: primaryComplaint,
    };
    if (password) payload.password = password;

    try {
      if (editingPatient) {
        payload.isActive = isActive;
        await api.put(`/patients/${editingPatient.id}`, payload);
      } else {
        await api.post("/patients", payload);
      }
      setModalOpen(false);
      loadPatients();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Action failed. Please verify inputs.");
    }
  };

  const handleToggleStatus = async (pat) => {
    try {
      await api.put(`/patients/${pat.id}`, {
        isActive: !pat.isActive,
      });
      loadPatients();
    } catch (err) {
      console.error(err);
      alert("Failed to toggle patient status.");
    }
  };

  const handleDeletePatient = async (pat) => {
    if (!window.confirm(`Are you sure you want to delete Patient: ${pat.name}?`)) return;
    try {
      await api.delete(`/patients/${pat.id}`);
      loadPatients();
    } catch (err) {
      console.error(err);
      alert("Failed to delete patient.");
    }
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setModalOpen(false);
    }
  };

  const filteredPatients = useMemo(() => {
    let list = patients;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((pat) => {
        const patName = (pat.name || "").toLowerCase();
        const patMobile = (pat.mobile || "").toLowerCase();
        const patCity = (pat.city || "").toLowerCase();
        const patUniqueId = (pat.unique_id || "").toLowerCase();
        return patName.includes(q) || patMobile.includes(q) || patCity.includes(q) || patUniqueId.includes(q);
      });
    }
    if (statusFilter === "ACTIVE") {
      list = list.filter((pat) => pat.isActive);
    } else if (statusFilter === "SUSPENDED") {
      list = list.filter((pat) => !pat.isActive);
    }
    return list;
  }, [patients, searchQuery, statusFilter]);

  const totalItems = filteredPatients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages);

  const paginatedPatients = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, safePage, pageSize]);

  return (
    <div className="container-fluid py-4 wowdash-users">
      <div className="page-header mb-4">
        <div>
          <h2 className="fw-bold mb-1">Patients</h2>
          <div className="page-subtitle text-secondary-light">Manage platform patient registers, details, and accounts.</div>
        </div>
      </div>

      <div className="card border-0 shadow-sm radius-12 overflow-hidden">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
          <div className="d-flex align-items-center flex-wrap gap-3">
            <h6 className="mb-0 fw-semibold text-lg text-primary-light">Registered Patients</h6>
            <span className="text-md fw-medium text-secondary-light mb-0">Show</span>
            <select
              className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <form className="navbar-search" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                className="bg-base h-40-px w-auto"
                placeholder="Search patients"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </form>
            <select
              className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
            onClick={openAddModal}
          >
            <i className="ri-add-line"></i> Add Patient
          </button>
        </div>

        <div className="card-body p-24">
          {loading ? (
            <div className="p-4 text-secondary">Loading patient list...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-4 text-secondary text-center">
              No patients found.
            </div>
          ) : (
            <>
              <div className="table-responsive scroll-sm">
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>S.L</th>
                      <th>ID</th>
                      <th>Patient Name</th>
                      <th>Age/Gender</th>
                      <th>City</th>
                      <th>Mobile Contact</th>
                      <th>Status</th>
                      <th>Registered At</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPatients.map((pat, idx) => (
                      <tr key={pat.id}>
                        <td>{String((safePage - 1) * pageSize + idx + 1).padStart(2, "0")}</td>
                        <td>{pat.unique_id || pat.id}</td>
                        <td className="fw-semibold text-primary-light">{pat.name}</td>
                        <td>{pat.age ? `${pat.age} yrs` : "-"} / {pat.gender || "-"}</td>
                        <td>{pat.city || "-"}</td>
                        <td>{pat.mobile}</td>
                        <td>
                          <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${pat.isActive ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                            {pat.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="text-secondary text-sm">
                          {pat.createdAt ? new Date(pat.createdAt).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="text-right">
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => openEditModal(pat)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => handleToggleStatus(pat)}
                              style={{
                                borderColor: pat.isActive ? "#fecaca" : "#bbf7d0",
                                background: pat.isActive ? "#fee2e2" : "#f0fdf4",
                                color: pat.isActive ? "#b91c1c" : "#166534"
                              }}
                            >
                              {pat.isActive ? "Suspend" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="btn sm text-danger border-danger-200 bg-danger-50"
                              onClick={() => handleDeletePatient(pat)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
                <span className="text-sm text-secondary-light">
                  Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, totalItems)} of {totalItems} entries
                </span>
                {totalPages > 1 && (
                  <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                    <li className="page-item">
                      <button
                        type="button"
                        className="page-link bg-neutral-300 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                      >
                        ‹
                      </button>
                    </li>
                    {Array.from({ length: totalPages }).map((_, pIdx) => {
                      const p = pIdx + 1;
                      return (
                        <li className="page-item" key={`page-${p}`}>
                          <button
                            type="button"
                            className={
                              "page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md " +
                              (p === safePage
                                ? "bg-primary-600 text-white"
                                : "bg-neutral-300 text-secondary-light")
                            }
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </li>
                      );
                    })}
                    <li className="page-item">
                      <button
                        type="button"
                        className="page-link bg-neutral-300 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                      >
                        ›
                      </button>
                    </li>
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="modal show wow-modal" onClick={handleModalBackdropClick}>
          <div className="modal-card wow-modal-card">
            <div className="wow-modal-header d-flex justify-content-between align-items-center">
              <div>
                <h3 className="wow-modal-title">{editingPatient ? "Edit Patient" : "Create New Patient"}</h3>
                <p className="wow-modal-subtitle">
                  {editingPatient ? "Update patient records and settings." : "Register a new patient profile."}
                </p>
              </div>
              <button
                type="button"
                className="btn-close border-0 bg-transparent text-secondary-light"
                onClick={() => setModalOpen(false)}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="wow-modal-form scroll-sm" style={{ maxHeight: "70vh", overflowY: "auto" }}>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Patient Full Name</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Mobile Number</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  disabled={!!editingPatient}
                />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Password {editingPatient && <span className="text-secondary-light fw-normal">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  className="form-control w-100"
                  placeholder={editingPatient ? "New Password" : "Default password is their Mobile Number if blank"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label fw-semibold text-sm text-primary-light">Date of Birth</label>
                  <input
                    type="date"
                    className="form-control w-100"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label fw-semibold text-sm text-primary-light">Age (Years)</label>
                  <input
                    type="number"
                    className="form-control w-100"
                    placeholder="e.g. 30"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Gender</label>
                <select className="form-select w-100" value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">City</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Allergies</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Peanuts, Penicillin"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Medical History Summary</label>
                <textarea
                  className="form-control w-100"
                  placeholder="e.g. Hypertension, Diabetes"
                  value={medicalHx}
                  onChange={(e) => setMedicalHx(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Primary Complaint</label>
                <textarea
                  className="form-control w-100"
                  placeholder="e.g. Tooth ache in upper jaw"
                  value={primaryComplaint}
                  onChange={(e) => setPrimaryComplaint(e.target.value)}
                  rows={2}
                />
              </div>
              {editingPatient && (
                <div className="form-check form-switch mt-2 d-flex align-items-center gap-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="patActiveSwitch"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold text-sm text-primary-light mb-0" htmlFor="patActiveSwitch">
                    Active Patient Account
                  </label>
                </div>
              )}
              <div className="actions wow-modal-actions mt-3">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Patient</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
