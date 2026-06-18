import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import WowDashLayout from "../../components/layout/WowDashLayout";
import api from "../../api/api";

export default function SuperAdminDashboard({ user, onLogout }) {
  const navItems = [
    { type: "link", label: "Overview", to: "/super-admin/overview", end: true, icon: "ri-home-5-line" },
    { type: "group", label: "Administration" },
    { type: "link", label: "Organizations", to: "/super-admin/organizations", icon: "ri-government-line" },
    { type: "link", label: "Doctors", to: "/super-admin/doctors", icon: "ri-user-heart-line" },
    { type: "link", label: "Patients", to: "/super-admin/patients", icon: "ri-user-3-line" },
    { type: "link", label: "Service Providers", to: "/super-admin/service-providers", icon: "ri-customer-service-2-line" },
  ];

  return (
    <WowDashLayout
      brandLabel="Super Control Center"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search clinics..."
      headerActions={
        <div className="d-flex align-items-center gap-2">
          <div className="w-40-px h-40-px bg-primary-100 text-primary-600 rounded-circle d-flex justify-content-center align-items-center fw-bold text-md shadow-sm border border-white">
            SA
          </div>
          <div className="d-flex flex-column text-start">
            <span className="text-xs text-secondary-light" style={{ lineHeight: 1 }}>Welcome,</span>
            <span className="fw-semibold text-primary-light text-sm" style={{ lineHeight: 1.2 }}>
              Super Admin
            </span>
          </div>
        </div>
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<SuperAdminOverview />} />
        <Route path="organizations" element={<ManageOrganizations />} />
        <Route path="doctors" element={<ManageDoctors />} />
        <Route path="patients" element={<ManagePatients />} />
        <Route path="service-providers" element={<ManageServiceProviders />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>
    </WowDashLayout>
  );
}

function SuperAdminOverview() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/organizations")
      .then((res) => {
        const list = res.data || [];
        const active = list.filter((o) => o.isActive).length;
        setStats({
          total: list.length,
          active,
          inactive: list.length - active,
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-fluid py-4 wowdash-users">
      <h4 className="mb-4 fw-bold">Platform Overview</h4>
      {loading ? (
        <div className="text-secondary">Loading metrics...</div>
      ) : (
        <div className="row gy-4">
          <div className="col-md-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{stats.total}</h6>
                  <span className="text-secondary-light text-sm">Total Organizations</span>
                </div>
                <span className="w-48-px h-48-px bg-primary-100 text-primary-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-government-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{stats.active}</h6>
                  <span className="text-secondary-light text-sm">Active Clinics</span>
                </div>
                <span className="w-48-px h-48-px bg-success-100 text-success-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-checkbox-circle-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{stats.inactive}</h6>
                  <span className="text-secondary-light text-sm">Suspended Clinics</span>
                </div>
                <span className="w-48-px h-48-px bg-danger-100 text-danger-600 flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle">
                  <i className="ri-close-circle-line text-xl"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManageOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Search, Status and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadOrgs = () => {
    setLoading(true);
    api.get("/organizations")
      .then((res) => setOrgs(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const openAddModal = () => {
    setEditingOrg(null);
    setName("");
    setMobile("");
    setPassword("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (org) => {
    setEditingOrg(org);
    setName(org.name || "");
    setMobile(org.mobile || "");
    setPassword("");
    setIsActive(org.isActive ?? true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      alert("Name and Mobile are required");
      return;
    }

    try {
      if (editingOrg) {
        // Edit Org
        const payload = { name, mobile, isActive };
        if (password) payload.password = password;
        await api.put(`/organizations/${editingOrg.id}`, payload);
      } else {
        // Add Org
        await api.post("/organizations", { name, mobile, password });
      }
      setModalOpen(false);
      loadOrgs();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Action failed. Please verify inputs.");
    }
  };

  const handleToggleStatus = async (org) => {
    try {
      await api.put(`/organizations/${org.id}`, {
        isActive: !org.isActive,
      });
      loadOrgs();
    } catch (err) {
      console.error(err);
      alert("Failed to toggle organization status.");
    }
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setModalOpen(false);
    }
  };

  // Filter and paginate orgs client-side
  const filteredOrgs = useMemo(() => {
    let list = orgs;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((org) => {
        const orgName = (org.name || "").toLowerCase();
        const orgMobile = (org.mobile || "").toLowerCase();
        return orgName.includes(q) || orgMobile.includes(q);
      });
    }
    if (statusFilter === "ACTIVE") {
      list = list.filter((org) => org.isActive);
    } else if (statusFilter === "SUSPENDED") {
      list = list.filter((org) => !org.isActive);
    }
    return list;
  }, [orgs, searchQuery, statusFilter]);

  const totalItems = filteredOrgs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages);

  const paginatedOrgs = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredOrgs.slice(start, start + pageSize);
  }, [filteredOrgs, safePage, pageSize]);

  return (
    <div className="container-fluid py-4 wowdash-users">
      <div className="page-header mb-4">
        <div>
          <h2 className="fw-bold mb-1">Organizations</h2>
          <div className="page-subtitle text-secondary-light">Manage registered organizations, clinics, and accounts.</div>
        </div>
      </div>

      <div className="card border-0 shadow-sm radius-12 overflow-hidden">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
          <div className="d-flex align-items-center flex-wrap gap-3">
            <h6 className="mb-0 fw-semibold text-lg text-primary-light">Registered Clinics</h6>
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
                placeholder="Search clinics"
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
            <i className="ri-add-line"></i> Add Organization
          </button>
        </div>

        <div className="card-body p-24">
          {loading ? (
            <div className="p-4 text-secondary">Loading organization list...</div>
          ) : filteredOrgs.length === 0 ? (
            <div className="p-4 text-secondary text-center">
              {searchQuery || statusFilter !== "ALL" ? "No clinics match the filters." : "No organizations registered yet."}
            </div>
          ) : (
            <>
              <div className="table-responsive scroll-sm">
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>S.L</th>
                      <th>ID</th>
                      <th>Clinic Name</th>
                      <th>Mobile Contact</th>
                      <th>Status</th>
                      <th>Registered At</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrgs.map((org, idx) => (
                      <tr key={org.id}>
                        <td>{String((safePage - 1) * pageSize + idx + 1).padStart(2, "0")}</td>
                        <td>{org.id}</td>
                        <td className="fw-semibold text-primary-light">{org.name}</td>
                        <td>{org.mobile}</td>
                        <td>
                          <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${org.isActive ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                            {org.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="text-secondary text-sm">
                          {org.createdAt ? new Date(org.createdAt).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="text-right">
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => openEditModal(org)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => handleToggleStatus(org)}
                              style={{
                                borderColor: org.isActive ? "#fecaca" : "#bbf7d0",
                                background: org.isActive ? "#fee2e2" : "#f0fdf4",
                                color: org.isActive ? "#b91c1c" : "#166534"
                              }}
                            >
                              {org.isActive ? "Suspend" : "Activate"}
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
                  {totalItems
                    ? `Showing ${(safePage - 1) * pageSize + 1} to ${Math.min(safePage * pageSize, totalItems)} of ${totalItems} entries`
                    : "Showing 0 to 0 of 0 entries"}
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
                    {(() => {
                      const pages = [];
                      const maxButtons = 5;
                      let start = Math.max(1, safePage - Math.floor(maxButtons / 2));
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
                      }
                      return pages;
                    })()}
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

      {/* High Quality Modal */}
      {modalOpen && (
        <div className="modal show wow-modal" onClick={handleModalBackdropClick}>
          <div className="modal-card wow-modal-card">
            <div className="wow-modal-header d-flex justify-content-between align-items-center">
              <div>
                <h3 className="wow-modal-title">{editingOrg ? "Edit Organization" : "Create New Organization"}</h3>
                <p className="wow-modal-subtitle">
                  {editingOrg ? "Update clinic details and credentials." : "Register a new clinic on the platform."}
                </p>
              </div>
              <button
                type="button"
                className="btn-close border-0 bg-transparent text-secondary-light"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                style={{ fontSize: "1.2rem", cursor: "pointer", outline: "none" }}
              >
                <i className="ri-close-line"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="wow-modal-form">
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Clinic / Organization Name</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Dizi Dental Clinic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Mobile Number</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  disabled={!!editingOrg}
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Password {editingOrg && <span className="text-secondary-light fw-normal">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  className="form-control w-100"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingOrg}
                />
              </div>
              {editingOrg && (
                <div className="form-check form-switch mt-2 colspan d-flex align-items-center gap-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="orgActiveSwitch"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <label className="form-check-label fw-semibold text-sm text-primary-light mb-0" htmlFor="orgActiveSwitch" style={{ cursor: "pointer" }}>
                    Active Clinic Account
                  </label>
                </div>
              )}
              <div className="actions wow-modal-actions colspan">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Clinic</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MANAGE DOCTORS
// -------------------------------------------------------------
function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  // Form states
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Search, Status and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadDoctors = () => {
    setLoading(true);
    api.get("/doctors")
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
    setModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoctor(doc);
    setName(doc.name || "");
    setMobile(doc.mobile || "");
    setSpeciality(doc.speciality || "");
    setPassword("");
    setIsActive(doc.isActive ?? true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !mobile) {
      alert("Name and Mobile are required");
      return;
    }

    try {
      if (editingDoctor) {
        const payload = { name, mobile, speciality, isActive };
        if (password) payload.password = password;
        await api.put(`/doctors/${editingDoctor.id}`, payload);
      } else {
        await api.post("/doctors", { name, mobile, speciality, password: password || "1234" });
      }
      setModalOpen(false);
      loadDoctors();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Action failed. Please verify inputs.");
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
      alert("Failed to toggle doctor status.");
    }
  };

  const handleDeleteDoctor = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete Doctor: ${doc.name}?`)) return;
    try {
      await api.delete(`/doctors/${doc.id}`);
      loadDoctors();
    } catch (err) {
      console.error(err);
      alert("Failed to delete doctor.");
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
        return docName.includes(q) || docMobile.includes(q) || docSpec.includes(q);
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
          <div className="page-subtitle text-secondary-light">Manage platform doctor profiles, specialities and accounts.</div>
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
          <button
            type="button"
            className="btn btn-primary text-sm btn-sm px-12 py-12 radius-8 d-flex align-items-center gap-2"
            onClick={openAddModal}
          >
            <i className="ri-add-line"></i> Add Doctor
          </button>
        </div>

        <div className="card-body p-24">
          {loading ? (
            <div className="p-4 text-secondary">Loading doctor list...</div>
          ) : filteredDoctors.length === 0 ? (
            <div className="p-4 text-secondary text-center">
              No doctors found.
            </div>
          ) : (
            <>
              <div className="table-responsive scroll-sm">
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>S.L</th>
                      <th>ID</th>
                      <th>Doctor Name</th>
                      <th>Speciality</th>
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
                        <td>{doc.mobile}</td>
                        <td>
                          <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${doc.isActive ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                            {doc.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="text-secondary text-sm">
                          {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString("en-IN") : "-"}
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
                              onClick={() => handleToggleStatus(doc)}
                              style={{
                                borderColor: doc.isActive ? "#fecaca" : "#bbf7d0",
                                background: doc.isActive ? "#fee2e2" : "#f0fdf4",
                                color: doc.isActive ? "#b91c1c" : "#166534"
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
                <h3 className="wow-modal-title">{editingDoctor ? "Edit Doctor" : "Create New Doctor"}</h3>
                <p className="wow-modal-subtitle">
                  {editingDoctor ? "Update doctor details and credentials." : "Register a new doctor on the platform."}
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
                <label className="form-label fw-semibold text-sm text-primary-light">Doctor Full Name</label>
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
                <label className="form-label fw-semibold text-sm text-primary-light">Mobile Number</label>
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
                <label className="form-label fw-semibold text-sm text-primary-light">Speciality</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Dentist, Orthodontist"
                  value={speciality}
                  onChange={(e) => setSpeciality(e.target.value)}
                  required
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Password {editingDoctor && <span className="text-secondary-light fw-normal">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  className="form-control w-100"
                  placeholder={editingDoctor ? "New Password" : "Default password is '1234' if blank"}
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
                  <label className="form-check-label fw-semibold text-sm text-primary-light mb-0" htmlFor="docActiveSwitch">
                    Active Doctor Account
                  </label>
                </div>
              )}
              <div className="actions wow-modal-actions colspan">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Doctor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// MANAGE PATIENTS
// -------------------------------------------------------------
function ManagePatients() {
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

// -------------------------------------------------------------
// MANAGE SERVICE PROVIDERS
// -------------------------------------------------------------
function ManageServiceProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

  // Form states
  const [providerName, setProviderName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [providerType, setProviderType] = useState("LAB");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Search, Status and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadProviders = () => {
    setLoading(true);
    api.get("/service-providers")
      .then((res) => setProviders(res.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const openAddModal = () => {
    setEditingProvider(null);
    setProviderName("");
    setMobile("");
    setPassword("");
    setProviderType("LAB");
    setAddress("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (prov) => {
    setEditingProvider(prov);
    setProviderName(prov.providerName || "");
    setMobile(prov.mobile || "");
    setPassword("");
    setProviderType(prov.providerType || "LAB");
    setAddress(prov.address || "");
    setIsActive(prov.isActive ?? true);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerName || !mobile) {
      alert("Provider Name and Mobile are required");
      return;
    }

    try {
      if (editingProvider) {
        const payload = { providerName, mobile, providerType, address, isActive };
        if (password) payload.password = password;
        await api.put(`/service-providers/${editingProvider.id}`, payload);
      } else {
        await api.post("/service-providers", { providerName, mobile, password: password || "provider123", providerType, address });
      }
      setModalOpen(false);
      loadProviders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Action failed. Please verify inputs.");
    }
  };

  const handleToggleStatus = async (prov) => {
    try {
      await api.put(`/service-providers/${prov.id}`, {
        isActive: !prov.isActive,
      });
      loadProviders();
    } catch (err) {
      console.error(err);
      alert("Failed to toggle provider status.");
    }
  };

  const handleDeleteProvider = async (prov) => {
    if (!window.confirm(`Are you sure you want to delete Provider: ${prov.providerName}?`)) return;
    try {
      await api.delete(`/service-providers/${prov.id}`);
      loadProviders();
    } catch (err) {
      console.error(err);
      alert("Failed to delete service provider.");
    }
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setModalOpen(false);
    }
  };

  const filteredProviders = useMemo(() => {
    let list = providers;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((prov) => {
        const provName = (prov.providerName || "").toLowerCase();
        const provMobile = (prov.mobile || "").toLowerCase();
        const provType = (prov.providerType || "").toLowerCase();
        return provName.includes(q) || provMobile.includes(q) || provType.includes(q);
      });
    }
    if (statusFilter === "ACTIVE") {
      list = list.filter((prov) => prov.isActive);
    } else if (statusFilter === "SUSPENDED") {
      list = list.filter((prov) => !prov.isActive);
    }
    return list;
  }, [providers, searchQuery, statusFilter]);

  const totalItems = filteredProviders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages);

  const paginatedProviders = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredProviders.slice(start, start + pageSize);
  }, [filteredProviders, safePage, pageSize]);

  return (
    <div className="container-fluid py-4 wowdash-users">
      <div className="page-header mb-4">
        <div>
          <h2 className="fw-bold mb-1">Service Providers</h2>
          <div className="page-subtitle text-secondary-light">Manage platform third-party partners (LAB, PHARMACY, BED_MANAGER, etc.).</div>
        </div>
      </div>

      <div className="card border-0 shadow-sm radius-12 overflow-hidden">
        <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
          <div className="d-flex align-items-center flex-wrap gap-3">
            <h6 className="mb-0 fw-semibold text-lg text-primary-light">Registered Providers</h6>
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
                placeholder="Search providers"
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
            <i className="ri-add-line"></i> Add Service Provider
          </button>
        </div>

        <div className="card-body p-24">
          {loading ? (
            <div className="p-4 text-secondary">Loading provider list...</div>
          ) : filteredProviders.length === 0 ? (
            <div className="p-4 text-secondary text-center">
              No service providers found.
            </div>
          ) : (
            <>
              <div className="table-responsive scroll-sm">
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>S.L</th>
                      <th>ID</th>
                      <th>Provider Name</th>
                      <th>Provider Type</th>
                      <th>Mobile Contact</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>Registered At</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProviders.map((prov, idx) => (
                      <tr key={prov.id}>
                        <td>{String((safePage - 1) * pageSize + idx + 1).padStart(2, "0")}</td>
                        <td>{prov.uniqueId || prov.id}</td>
                        <td className="fw-semibold text-primary-light">{prov.providerName}</td>
                        <td>
                          <span className="badge bg-info-100 text-info px-2.5 py-1.5 radius-4 text-xs fw-semibold">
                            {prov.providerType}
                          </span>
                        </td>
                        <td>{prov.mobile}</td>
                        <td>{prov.address || "-"}</td>
                        <td>
                          <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${prov.isActive ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                            {prov.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="text-secondary text-sm">
                          {prov.createdAt ? new Date(prov.createdAt).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="text-right">
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => openEditModal(prov)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => handleToggleStatus(prov)}
                              style={{
                                borderColor: prov.isActive ? "#fecaca" : "#bbf7d0",
                                background: prov.isActive ? "#fee2e2" : "#f0fdf4",
                                color: prov.isActive ? "#b91c1c" : "#166534"
                              }}
                            >
                              {prov.isActive ? "Suspend" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="btn sm text-danger border-danger-200 bg-danger-50"
                              onClick={() => handleDeleteProvider(prov)}
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
                <h3 className="wow-modal-title">{editingProvider ? "Edit Service Provider" : "Create Service Provider"}</h3>
                <p className="wow-modal-subtitle">
                  {editingProvider ? "Update service provider details and credentials." : "Register a new service provider."}
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
                <label className="form-label fw-semibold text-sm text-primary-light">Provider / Partner Name</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Apex Diagnostics Lab"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  required
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Mobile Number</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                  disabled={!!editingProvider}
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Provider Type</label>
                <select className="form-select w-100" value={providerType} onChange={(e) => setProviderType(e.target.value)} required>
                  <option value="LAB">LAB</option>
                  <option value="PHARMACY">PHARMACY</option>
                  <option value="BED_MANAGER">BED_MANAGER</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">Address</label>
                <input
                  type="text"
                  className="form-control w-100"
                  placeholder="e.g. Suite 405, Clinic Plaza"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="colspan">
                <label className="form-label fw-semibold text-sm text-primary-light">
                  Password {editingProvider && <span className="text-secondary-light fw-normal">(leave blank to keep unchanged)</span>}
                </label>
                <input
                  type="password"
                  className="form-control w-100"
                  placeholder={editingProvider ? "New Password" : "Default password is 'provider123' if blank"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {editingProvider && (
                <div className="form-check form-switch mt-2 colspan d-flex align-items-center gap-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="provActiveSwitch"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <label className="form-check-label fw-semibold text-sm text-primary-light mb-0" htmlFor="provActiveSwitch">
                    Active Provider Account
                  </label>
                </div>
              )}
              <div className="actions wow-modal-actions colspan">
                <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Provider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
