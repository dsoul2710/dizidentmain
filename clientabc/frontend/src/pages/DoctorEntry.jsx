// src/pages/DoctorEntry.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api"; // axios instance
import "../assets/css/wowdash-users.css";

export default function DoctorEntry() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [serverPaging, setServerPaging] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [formValues, setFormValues] = useState({
    name: "",
    mobile: "",
    speciality: "",
    password: "",
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        const res = await api.get("/doctors", {
          params: {
            page,
            pagesize: pageSize,
            search: doctorSearch || undefined,
          },
        });
        const data = res.data;
        if (Array.isArray(data)) {
          setServerPaging(false);
          setDoctors(data || []);
          setTotalItems(data.length);
          setTotalPages(1);
        } else {
          setServerPaging(true);
          setDoctors(data.items || []);
          setTotalItems(Number(data.totalItems || 0));
          setTotalPages(Number(data.totalPages || 1));
        }
      } catch (err) {
        console.error("Error loading doctors", err);
        alert("Unable to load doctors from server.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [page, pageSize, doctorSearch, refreshTick]);

  const resetForm = () => {
    setFormValues({
      name: "",
      mobile: "",
      speciality: "",
      password: "",
    });
    setEditingDoctor(null);
    setShowDoctorModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      name: (formValues.name || "").trim(),
      mobile: (formValues.mobile || "").trim(),
      speciality: (formValues.speciality || "").trim(),
    };
    if (!editingDoctor && formValues.password) {
      body.password = formValues.password;
    }
    if (editingDoctor && formValues.password) {
      body.password = formValues.password;
    }

    try {
      if (editingDoctor) {
        const res = await api.put(`/doctors/${editingDoctor.id}`, body);
        const updatedDoctor = res.data;
        setDoctors((prev) =>
          prev.map((d) => (d.id === updatedDoctor.id ? updatedDoctor : d))
        );
        alert("Doctor updated successfully.");
      } else {
        const res = await api.post("/doctors", body);
        const savedDoctor = res.data;
        setDoctors((prev) => [savedDoctor, ...prev]);
        alert("Doctor Added Successfully");
      }

      resetForm();
      setPage(1);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error saving doctor", err);
      alert("Unable to save doctor. Please try again.");
    }
  };

  const handleEdit = (doctor) => {
    setEditingDoctor(doctor);
    setShowDoctorModal(true);
    setFormValues({
      name: doctor.name || "",
      mobile: doctor.mobile || "",
      speciality: doctor.speciality || "",
      password: "",
    });
  };

  const handleNew = () => {
    setEditingDoctor(null);
    setFormValues({
      name: "",
      mobile: "",
      speciality: "",
      password: "",
    });
    setShowDoctorModal(true);
  };

  const handleDelete = async (doctor) => {
    if (!window.confirm(`Delete doctor "${doctor.name}"?`)) return;

    try {
      await api.delete(`/doctors/${doctor.id}`);
      setDoctors((prev) => prev.filter((d) => d.id !== doctor.id));
      alert("Doctor deleted successfully.");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error deleting doctor", err);
      alert("Unable to delete doctor. Please try again.");
    }
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setShowDoctorModal(false);
      setEditingDoctor(null);
    }
  };

  const filteredDoctors = useMemo(() => {
    if (serverPaging) return doctors;
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) => {
      const name = (d.name || "").toLowerCase();
      const mobile = String(d.mobile || "").toLowerCase();
      const speciality = (d.speciality || "").toLowerCase();
      return name.includes(q) || mobile.includes(q) || speciality.includes(q);
    });
  }, [doctors, doctorSearch, serverPaging]);

  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>Doctor Entry</h2>
          <div className="page-subtitle">Register doctors and manage their details.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <h6 className="mb-0 fw-semibold text-lg">Saved Doctors</h6>
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
                <option value={100}>100</option>
              </select>
              <form className="navbar-search" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  className="bg-base h-40-px w-auto"
                  placeholder="Search doctors"
                  value={doctorSearch}
                  onChange={(e) => {
                    setDoctorSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </form>
              <select className="form-select form-select-sm w-auto ps-12 py-6 radius-12 h-40-px">
                <option>Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
              onClick={handleNew}
            >
              Add Doctor
            </button>
          </div>
          <div className="card-body p-24">
            {loading && (
              <p style={{ fontSize: 12, opacity: 0.7 }}>Loading doctors.</p>
            )}
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>S.L</th>
                    <th>ID</th>
                    <th>Doctor Name</th>
                    <th>Mobile</th>
                    <th>Speciality</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.length === 0 && !loading && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", fontSize: 12 }}>
                        {doctorSearch ? "No doctors found." : "No doctors added yet."}
                      </td>
                    </tr>
                  )}

                  {filteredDoctors.map((doc, idx) => (
                    <tr key={doc.id}>
                      <td>{String(idx + 1).padStart(2, "0")}</td>
                      <td>{doc.id}</td>
                      <td>{doc.name}</td>
                      <td>{doc.mobile}</td>
                      <td>{doc.speciality}</td>
                      <td className="text-right">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleEdit(doc)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => handleDelete(doc)}
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
              <span>
                {totalItems
                  ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalItems)} of ${totalItems} entries`
                  : "Showing 0 to 0 of 0 entries"}
              </span>
              {totalPages > 1 && (
                <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                  <li className="page-item">
                    <button
                      type="button"
                      className="page-link bg-neutral-300 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      ‹
                    </button>
                  </li>
                  {(() => {
                    const pages = [];
                    const maxButtons = 5;
                    let start = Math.max(1, page - Math.floor(maxButtons / 2));
                    let end = Math.min(totalPages, start + maxButtons - 1);
                    if (end - start + 1 < maxButtons) {
                      start = Math.max(1, end - maxButtons + 1);
                    }
                    for (let p = start; p <= end; p += 1) {
                      pages.push(
                        <li className="page-item" key={`page-${p}`}>
                          <button
                            type="button"
                            className={
                              "page-link fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md " +
                              (p === page
                                ? "bg-primary-600 text-white"
                                : "bg-neutral-300 text-secondary-light")
                            }
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </button>
                        </li>
                      );
                    }
                    return pages;
                  })()}
                  <li className="page-item">
                    <button
                      type="button"
                      className="page-link bg-neutral-300 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      ›
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {showDoctorModal && (
        <div className="modal show wow-modal" onClick={handleModalBackdropClick}>
          <div className="modal-card modal-card-lg wow-modal-card">
            <div className="wow-modal-header">
              <h3 className="wow-modal-title">
                {editingDoctor ? "Edit Doctor" : "Add Doctor"}
              </h3>
              <p className="wow-modal-subtitle">
                {editingDoctor
                  ? "Update doctor details."
                  : "Create a doctor profile with basic details."}
              </p>
            </div>
            <form
              onSubmit={handleSubmit}
              className="form-grid wow-modal-form"
              noValidate
            >
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="form-control radius-8"
                  value={formValues.name}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Mobile</label>
                <input
                  name="mobile"
                  type="tel"
                  pattern="[0-9]{10}"
                  placeholder="10-digit mobile"
                  required
                  className="form-control radius-8"
                  value={formValues.mobile}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, mobile: e.target.value }))
                  }
                />
              </div>

              <div className="wow-colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Speciality</label>
                <input
                  name="speciality"
                  type="text"
                  placeholder="e.g., Dentist, Orthodontist"
                  required
                  className="form-control radius-8"
                  value={formValues.speciality}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, speciality: e.target.value }))
                  }
                />
              </div>

              <div className="wow-colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Password</label>
                <input
                  name="password"
                  type="password"
                  required={!editingDoctor}
                  className="form-control radius-8"
                  value={formValues.password}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>

              <div className="actions wow-modal-actions">
                <button className="btn btn-primary" type="submit">
                  {editingDoctor ? "Update Doctor" : "Save Doctor"}
                </button>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
