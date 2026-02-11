// src/pages/LabEntryView.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import "../assets/css/wowdash-users.css";

export default function LabEntryView() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [showLabModal, setShowLabModal] = useState(false);
  const [labSearch, setLabSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [serverPaging, setServerPaging] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [formValues, setFormValues] = useState({
    name: "",
    address: "",
    mobile: "",
  });

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        setLoading(true);
        const res = await api.get("/labs", {
          params: {
            page,
            pagesize: pageSize,
            search: labSearch || undefined,
          },
        });
        const data = res.data;
        if (Array.isArray(data)) {
          setServerPaging(false);
          setLabs(data || []);
          setTotalItems(data.length);
          setTotalPages(1);
        } else {
          setServerPaging(true);
          setLabs(data.items || []);
          setTotalItems(Number(data.totalItems || 0));
          setTotalPages(Number(data.totalPages || 1));
        }
      } catch (err) {
        console.error("Error loading labs", err);
        alert("Unable to load labs from server.");
      } finally {
        setLoading(false);
      }
    };

    fetchLabs();
  }, [page, pageSize, labSearch, refreshTick]);

  const resetForm = () => {
    setFormValues({
      name: "",
      address: "",
      mobile: "",
    });
    setEditingLab(null);
    setShowLabModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      name: (formValues.name || "").trim(),
      address: (formValues.address || "").trim(),
      mobile: (formValues.mobile || "").trim(),
    };

    try {
      if (editingLab) {
        const res = await api.put(`/labs/${editingLab.id}`, body);
        const updatedLab = res.data;
        setLabs((prev) =>
          prev.map((l) => (l.id === updatedLab.id ? updatedLab : l))
        );
        alert("Lab updated successfully.");
      } else {
        const res = await api.post("/labs", body);
        const savedLab = res.data;
        setLabs((prev) => [savedLab, ...prev]);
        alert("Lab added successfully.");
      }

      resetForm();
      setPage(1);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error saving lab", err);
      alert("Unable to save lab. Please try again.");
    }
  };

  const handleEdit = (lab) => {
    setEditingLab(lab);
    setShowLabModal(true);
    setFormValues({
      name: lab.name || "",
      address: lab.address || "",
      mobile: lab.mobile || "",
    });
  };

  const handleNew = () => {
    setEditingLab(null);
    setFormValues({
      name: "",
      address: "",
      mobile: "",
    });
    setShowLabModal(true);
  };

  const handleDelete = async (lab) => {
    if (!window.confirm(`Delete lab "${lab.name}"?`)) return;

    try {
      await api.delete(`/labs/${lab.id}`);
      setLabs((prev) => prev.filter((l) => l.id !== lab.id));
      alert("Lab deleted successfully.");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error deleting lab", err);
      alert("Unable to delete lab. Please try again.");
    }
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setShowLabModal(false);
      setEditingLab(null);
    }
  };

  const filteredLabs = useMemo(() => {
    if (serverPaging) return labs;
    const q = labSearch.trim().toLowerCase();
    if (!q) return labs;
    return labs.filter((l) => {
      const name = (l.name || "").toLowerCase();
      const address = (l.address || "").toLowerCase();
      const mobile = String(l.mobile || "").toLowerCase();
      return name.includes(q) || address.includes(q) || mobile.includes(q);
    });
  }, [labs, labSearch, serverPaging]);

  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>Lab Entry</h2>
          <div className="page-subtitle">Manage labs, contact details, and quick actions.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <h6 className="mb-0 fw-semibold text-lg">Saved Labs</h6>
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
                  placeholder="Search labs"
                  value={labSearch}
                  onChange={(e) => {
                    setLabSearch(e.target.value);
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
              Add Lab
            </button>
          </div>
          <div className="card-body p-24">
            {loading && (
              <p style={{ fontSize: 12, opacity: 0.7 }}>Loading labs.</p>
            )}
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>S.L</th>
                    <th>Lab Name</th>
                    <th>Address</th>
                    <th>Mobile</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLabs.length === 0 && !loading && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", fontSize: 12 }}>
                        {labSearch ? "No labs found." : "No labs added yet."}
                      </td>
                    </tr>
                  )}

                  {filteredLabs.map((lab, idx) => (
                    <tr key={lab.id || idx}>
                      <td>{String(idx + 1).padStart(2, "0")}</td>
                      <td>{lab.name}</td>
                      <td>{lab.address}</td>
                      <td>{lab.mobile}</td>
                      <td className="text-right">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleEdit(lab)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleDelete(lab)}
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
              <span className="text-secondary-light text-sm">
                {totalItems > 0
                  ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(
                      page * pageSize,
                      totalItems
                    )} of ${totalItems} entries`
                  : "Showing 0 entries"}
              </span>
              {totalPages > 1 && (
                <ul className="pagination d-flex align-items-center gap-2 justify-content-center">
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

      {showLabModal && (
        <div className="modal show wow-modal" onClick={handleModalBackdropClick}>
          <div className="modal-card modal-card-lg wow-modal-card">
            <div className="wow-modal-header">
              <h3 className="wow-modal-title">
                {editingLab ? "Edit Lab" : "Add Lab"}
              </h3>
              <p className="wow-modal-subtitle">
                {editingLab
                  ? "Update lab details."
                  : "Create a lab profile with basic details."}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="form-grid wow-modal-form" noValidate>
              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Lab Name</label>
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
                  className="form-control radius-8"
                  value={formValues.mobile}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, mobile: e.target.value }))
                  }
                />
              </div>

              <div className="wow-colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Address</label>
                <input
                  name="address"
                  type="text"
                  placeholder="Address"
                  className="form-control radius-8"
                  value={formValues.address}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>

              <div className="actions wow-modal-actions">
                <button className="btn btn-primary" type="submit">
                  {editingLab ? "Update Lab" : "Save Lab"}
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
