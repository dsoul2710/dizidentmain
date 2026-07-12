import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/client";
import { unlinkDoctor } from "@/features/admin/api/doctorsApi";
import OnboardByUniqueIdModal from "@/shared/components/affiliation/OnboardByUniqueIdModal";
import OperationScopeBadge from "@/shared/components/attribution/OperationScopeBadge";
import { useToast } from "@/shared/components/common/ToastProvider";
import { useAuth } from "@/shared/hooks/useAuth";

export default function ManageDoctors() {
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" || user?.role === "SUPERADMIN";

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [operationScope, setOperationScope] = useState("INDEPENDENT");
  const [hospitalOrgId, setHospitalOrgId] = useState("");
  const [hospitals, setHospitals] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/organizations").then((res) => setHospitals(res.data || [])).catch(() => {});
  }, [isSuperAdmin]);

  const loadDoctors = () => {
    setLoading(true);
    api
      .get("/doctors")
      .then((res) => setDoctors(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const openAddModal = () => {
    setEditingDoctor(null);
    setName("");
    setMobile("");
    setSpeciality("");
    setPassword("");
    setIsActive(true);
    setOperationScope("INDEPENDENT");
    setHospitalOrgId("");
    setModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setName(doc.name || "");
    setMobile(doc.mobile || "");
    setSpeciality(doc.speciality || "");
    setPassword("");
    setIsActive(doc.isActive ?? true);
    setOperationScope(doc.operationScope || "INDEPENDENT");
    setHospitalOrgId("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      toast?.error("Name and Mobile are required");
      return;
    }

    try {
      if (editingDoctor) {
        if (isSuperAdmin) {
          const prevScope = editingDoctor.operationScope || "INDEPENDENT";
          if (operationScope !== prevScope && operationScope === "INTERNAL" && !hospitalOrgId) {
            toast?.error("Select a hospital for INTERNAL scope");
            return;
          }
        }
        const payload = { name, mobile, speciality, isActive };
        if (password) payload.password = password;
        await api.put(`/doctors/${editingDoctor.id}`, payload);

        if (isSuperAdmin) {
          const prevScope = editingDoctor.operationScope || "INDEPENDENT";
          if (operationScope !== prevScope) {
            const body = { operationScope };
            if (operationScope === "INTERNAL") {
              body.hospitalOrgId = Number(hospitalOrgId);
            }
            await api.post(`/doctors/${editingDoctor.id}/operation-scope`, body);
          }
        }
      } else {
        const payload = {
          name,
          mobile,
          speciality,
          password: password || "1234",
        };
        if (isSuperAdmin) {
          payload.operationScope = operationScope;
          if (operationScope === "INTERNAL") {
            if (!hospitalOrgId) {
              toast?.error("Select a hospital for INTERNAL scope");
              return;
            }
            payload.hospitalOrgId = Number(hospitalOrgId);
          }
        }
        await api.post("/doctors", payload);
      }
      setModalOpen(false);
      loadDoctors();
      toast?.success(editingDoctor ? "Doctor updated" : "Doctor created");
    } catch (err) {
      console.error(err);
      toast?.error(err.response?.data?.message || "Action failed. Please verify inputs.");
    }
  };

  const handleToggleStatus = async (doc) => {
    try {
      await api.put(`/doctors/${doc.id}`, {
        isActive: !doc.isActive,
      });
      loadDoctors();
    } catch (err) {
      console.error(err);
      toast?.error("Failed to toggle doctor status.");
    }
  };

  const handleDeleteDoctor = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete Doctor: ${doc.name}?`)) return;
    try {
      await api.delete(`/doctors/${doc.id}`);
      loadDoctors();
    } catch (err) {
      console.error(err);
      toast?.error("Failed to delete doctor.");
    }
  };

  const handleUnlink = async (doc) => {
    if (
      !window.confirm(
        `Unlink ${doc.name} from this clinic? Their account and private practice data remain.`
      )
    ) {
      return;
    }
    try {
      await unlinkDoctor(doc.id);
      toast?.success("Doctor unlinked");
      loadDoctors();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) toast?.error("Doctor not found");
      else if (status === 403) toast?.error("Not allowed");
      else toast?.error(err?.response?.data?.message || "Unlink failed");
    }
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setModalOpen(false);
    }
  };

  const filteredDoctors = useMemo(() => {
    let list = doctors;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((doc) => {
        const docName = (doc.name || "").toLowerCase();
        const docMobile = (doc.mobile || "").toLowerCase();
        const docSpec = (doc.speciality || "").toLowerCase();
        const docUid = (doc.uniqueId || "").toLowerCase();
        return (
          docName.includes(q) ||
          docMobile.includes(q) ||
          docSpec.includes(q) ||
          docUid.includes(q)
        );
      });
    }
    if (statusFilter === "ACTIVE") {
      list = list.filter((doc) => doc.isActive);
    } else if (statusFilter === "SUSPENDED") {
      list = list.filter((doc) => !doc.isActive);
    }
    return list;
  }, [doctors, searchQuery, statusFilter]);

  const totalItems = filteredDoctors.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages);

  const paginatedDoctors = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredDoctors.slice(start, start + pageSize);
  }, [filteredDoctors, safePage, pageSize]);

  return (
    <div className="container-fluid py-4 wowdash-users">
      <div className="page-header mb-4">
        <div>
          <h2 className="fw-bold mb-1">Doctors</h2>
          <div className="page-subtitle text-secondary-light">
            Manage platform doctor profiles, specialities and accounts.
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm radius-12 overflow-hidden">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
          <div className="d-flex align-items-center flex-wrap gap-3">
            <h6 className="mb-0 fw-semibold text-lg text-primary-light">Registered Doctors</h6>
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
                placeholder="Search doctors"
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
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {!isSuperAdmin && (
              <button
                type="button"
                className="btn btn-outline-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
                onClick={() => setOnboardOpen(true)}
              >
                <i className="ri-link"></i> Add existing (Unique ID)
              </button>
            )}
            <button
              type="button"
              className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
              onClick={openAddModal}
            >
              <i className="ri-add-line"></i> Add Doctor
            </button>
          </div>
        </div>

        <div className="card-body p-24">
          {loading ? (
            <div className="p-4 text-secondary">Loading doctor list...</div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-4 text-secondary text-center">
              No doctors found. Link by unique ID to collaborate across hospitals, or create a
              new internal doctor.
            </div>
          ) : (
            <>
              <div className="table-responsive scroll-sm">
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>S.L</th>
                      <th>Unique ID</th>
                      <th>Doctor Name</th>
                      <th>Speciality</th>
                      <th>Scope</th>
                      <th>Mobile Contact</th>
                      <th>Status</th>
                      <th>Registered At</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDoctors.map((doc, idx) => (
                      <tr key={doc.id}>
                        <td>{String((safePage - 1) * pageSize + idx + 1).padStart(2, "0")}</td>
                        <td>{doc.uniqueId || doc.id}</td>
                        <td className="fw-semibold text-primary-light">{doc.name}</td>
                        <td>{doc.speciality || "-"}</td>
                        <td>
                          <OperationScopeBadge operationScope={doc.operationScope} />
                        </td>
                        <td>{doc.mobile}</td>
                        <td>
                          <span
                            className={`badge px-2.5 py-1.5 radius-4 text-xs ${
                              doc.isActive
                                ? "bg-success-100 text-success"
                                : "bg-danger-100 text-danger"
                            }`}
                          >
                            {doc.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="text-secondary text-sm">
                          {doc.createdAt
                            ? new Date(doc.createdAt).toLocaleDateString("en-IN")
                            : "-"}
                        </td>
                        <td className="text-right">
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => openEditModal(doc)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => handleUnlink(doc)}
                            >
                              Unlink
                            </button>
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => handleToggleStatus(doc)}
                              style={{
                                borderColor: doc.isActive ? "#fecaca" : "#bbf7d0",
                                background: doc.isActive ? "#fee2e2" : "#f0fdf4",
                                color: doc.isActive ? "#b91c1c" : "#166534",
                              }}
                            >
                              {doc.isActive ? "Suspend" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="btn sm text-danger border-danger-200 bg-danger-50"
                              onClick={() => handleDeleteDoctor(doc)}
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
                  Showing {(safePage - 1) * pageSize + 1} to{" "}
                  {Math.min(safePage * pageSize, totalItems)} of {totalItems} entries
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
                <h3 className="wow-modal-title">
                  {editingDoctor ? "Edit Doctor" : "Create New Doctor"}
                </h3>
                <p className="wow-modal-subtitle">
                  {editingDoctor
                    ? "Update doctor details and credentials."
                    : "Register a new hospital doctor (internal scope)."}
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
            <form onSubmit={handleSubmit} className="wow-modal-form">
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Doctor Full Name
                </label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Dr. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Mobile Number
                </label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  disabled={!!editingDoctor}
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Speciality
                </label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Dentist, Orthodontist"
                  value={speciality}
                  onChange={(e) => setSpeciality(e.target.value)}
                  required
                />
              </div>
              {isSuperAdmin && (
                <>
                  <div className="colspan">
                    <label className="form-label fw-semibold text-sm text-primary-light" htmlFor="doc-scope">
                      Operation scope
                    </label>
                    <select
                      id="doc-scope"
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
                      <label className="form-label fw-semibold text-sm text-primary-light" htmlFor="doc-hospital">
                        Hospital{editingDoctor ? " (required when changing to Internal)" : ""}
                      </label>
                      <select
                        id="doc-hospital"
                        className="form-select w-100"
                        value={hospitalOrgId}
                        onChange={(e) => setHospitalOrgId(e.target.value)}
                        required={!editingDoctor || operationScope === "INTERNAL"}
                      >
                        <option value="">Select hospital…</option>
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name || `Org ${h.id}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Password{" "}
                  {editingDoctor && (
                    <span className="text-secondary-light fw-normal">
                      (leave blank to keep unchanged)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  className="form-control w-100"
                  placeholder={
                    editingDoctor
                      ? "New Password"
                      : "Default password is '1234' if blank"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {editingDoctor && (
                <div className="form-check form-switch mt-2 colspan d-flex align-items-center gap-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="docActiveSwitch"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label
                    className="form-check-label fw-semibold text-sm text-primary-light mb-0"
                    htmlFor="docActiveSwitch"
                  >
                    Active Doctor Account
                  </label>
                </div>
              )}
              <div className="actions wow-modal-actions colspan">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Doctor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {onboardOpen && !isSuperAdmin && (
        <OnboardByUniqueIdModal
          entityType="doctor"
          onClose={() => setOnboardOpen(false)}
          onSuccess={loadDoctors}
        />
      )}
    </div>
  );
}
