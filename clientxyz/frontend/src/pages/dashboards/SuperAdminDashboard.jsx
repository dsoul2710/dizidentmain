import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import WowDashLayout from "../../components/layout/WowDashLayout";
import api from "../../api/api";

export default function SuperAdminDashboard({ user, onLogout }) {
  const navItems = [
    { type: "link", label: "Overview", to: "/super-admin/overview", end: true, icon: "ri-home-5-line" },
    { type: "group", label: "Administration" },
    { type: "link", label: "Organizations", to: "/super-admin/organizations", icon: "ri-government-line" },
  ];

  return (
    <WowDashLayout
      brandLabel="Super Control Center"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search clinics..."
      headerActions={
        <div className="d-flex flex-column text-end">
          <span className="fw-semibold">Welcome Super Admin</span>
        </div>
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<SuperAdminOverview />} />
        <Route path="organizations" element={<ManageOrganizations />} />
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
    <div className="container-fluid py-4">
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

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">Manage Organizations</h4>
        <button className="btn btn-primary d-flex align-items-center gap-2 radius-8" onClick={openAddModal}>
          <i className="ri-add-line"></i> Add Organization
        </button>
      </div>

      <div className="card border-0 shadow-sm radius-12 overflow-hidden">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-secondary">Loading organization list...</div>
          ) : orgs.length === 0 ? (
            <div className="p-4 text-secondary">No organizations registered yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="py-3">Clinic Name</th>
                    <th className="py-3">Mobile Contact</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Registered At</th>
                    <th className="px-4 py-3 text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id}>
                      <td className="px-4 py-3 text-secondary fw-semibold">#{org.id}</td>
                      <td className="py-3 fw-semibold">{org.name}</td>
                      <td className="py-3">{org.mobile}</td>
                      <td className="py-3">
                        <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${org.isActive ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                          {org.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="py-3 text-secondary text-sm">
                        {org.createdAt ? new Date(org.createdAt).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button className="btn btn-sm btn-outline-secondary me-2 radius-6" onClick={() => openEditModal(org)}>
                          <i className="ri-edit-line"></i> Edit
                        </button>
                        <button className={`btn btn-sm radius-6 ${org.isActive ? "btn-outline-danger" : "btn-outline-success"}`} onClick={() => handleToggleStatus(org)}>
                          <i className={org.isActive ? "ri-close-circle-line" : "ri-checkbox-circle-line"}></i>
                          {org.isActive ? " Suspend" : " Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* High Quality Modal */}
      {modalOpen && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 radius-16 shadow-lg">
              <div className="modal-header border-bottom px-4">
                <h5 className="modal-title fw-bold">{editingOrg ? "Edit Organization" : "Create New Organization"}</h5>
                <button type="button" className="btn-close" onClick={() => setModalOpen(false)} aria-label="Close"></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body px-4 py-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Clinic / Organization Name</label>
                    <input
                      type="text"
                      className="form-control h-44-px radius-8"
                      placeholder="e.g. Dizi Dental Clinic"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Mobile Number</label>
                    <input
                      type="text"
                      className="form-control h-44-px radius-8"
                      placeholder="e.g. 9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      disabled={!!editingOrg}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Password {editingOrg && <span className="text-secondary-light fw-normal">(leave blank to keep unchanged)</span>}
                    </label>
                    <input
                      type="password"
                      className="form-control h-44-px radius-8"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required={!editingOrg}
                    />
                  </div>
                  {editingOrg && (
                    <div className="form-check form-switch mt-4">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="orgActiveSwitch"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <label className="form-check-label fw-semibold" htmlFor="orgActiveSwitch">
                        Active Clinic Account
                      </label>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top px-4">
                  <button type="button" className="btn btn-light radius-8" onClick={() => setModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary radius-8">Save Clinic</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
