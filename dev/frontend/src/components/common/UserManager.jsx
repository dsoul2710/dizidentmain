import React, { useEffect, useState } from "react";
import api from "../../api/api";

export default function UserManager({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // For ORG managers managing doctors, providers, and patients
  const [activeTab, setActiveTab] = useState("doctors");
  const [doctors, setDoctors] = useState([]);
  const [providers, setProviders] = useState([]);
  const [patients, setPatients] = useState([]);

  const isSuperAdmin = currentUser?.role === "SUPERADMIN" || currentUser?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (isSuperAdmin) {
      loadAllUsers();
    } else if (currentUser?.role === "ORG") {
      loadOrgData();
    }
  }, [isSuperAdmin, activeTab]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load users", err);
      alert("Unable to fetch users from server.");
    } finally {
      setLoading(false);
    }
  };

  const loadOrgData = async () => {
    setLoading(true);
    try {
      if (activeTab === "doctors") {
        const res = await api.get("/doctors");
        setDoctors(res.data || []);
      } else if (activeTab === "providers") {
        const res = await api.get("/service-providers");
        setProviders(res.data || []);
      } else if (activeTab === "patients") {
        const res = await api.get("/patients");
        setPatients(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load org branch data", err);
      alert("Unable to fetch staff/patient records.");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = !user.isActive;
    try {
      const res = await api.put(`/users/${user.id}/status`, null, {
        params: { active: newStatus }
      });
      alert(`User status updated to ${newStatus ? "Active" : "Inactive"}`);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
    } catch (err) {
      console.error("Failed to update user status", err);
      alert("Unable to update user status.");
    }
  };

  const openPermissionDialog = async (user) => {
    setSelectedUser(user);
    setShowPermissionModal(true);
    setLoading(true);
    try {
      const res = await api.get(`/users/${user.id}/permissions`);
      setPermissions(res.data || []);
    } catch (err) {
      console.error("Failed to load permissions", err);
      alert("Unable to fetch permissions list.");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionCheckboxChange = (index, field) => {
    setPermissions(prev => prev.map((p, idx) => {
      if (idx === index) {
        return { ...p, [field]: !p[field] };
      }
      return p;
    }));
  };

  const saveUserPermissions = async () => {
    if (!selectedUser) return;
    setSavingPermissions(true);
    try {
      const res = await api.put(`/users/${selectedUser.id}/permissions`, permissions);
      alert("Permissions saved successfully!");
      setShowPermissionModal(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Failed to save permissions", err);
      alert("Unable to save user permissions.");
    } finally {
      setSavingPermissions(false);
    }
  };

  const toggleMappingStatus = async (item, type) => {
    const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const userId = item.userId || item.id;
      await api.put(`/users/${userId}/status`, null, {
        params: { active: newStatus === "ACTIVE" }
      });
      alert(`${type} status toggled successfully.`);
      loadOrgData();
    } catch (err) {
      console.error("Failed to toggle mapping status", err);
      alert("Unable to update status.");
    }
  };

  return (
    <div className="view show wowdash-users clinical-hms">
      <div className="page-header mb-4">
        <div>
          <h2 className="fw-bold mb-1">User Manager</h2>
          <div className="page-subtitle text-secondary-light">
            {isSuperAdmin 
              ? "Super Administrator dashboard to manage all system users and roles." 
              : "Organization administrator control panel for clinic staff & patients."}
          </div>
        </div>
      </div>

      <div className="page-body">
        {isSuperAdmin ? (
          <div className="card border-0 shadow-sm radius-12 overflow-hidden">
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center justify-content-between">
              <h6 className="mb-0 fw-semibold text-lg text-primary-light">All System Users</h6>
            </div>
            <div className="card-body p-24">
              {loading && <div className="text-secondary-light mb-3">Loading users...</div>}
              
              <div className="table-responsive scroll-sm">
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Name</th>
                      <th>Mobile</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="text-center text-secondary-light">No users found.</td>
                      </tr>
                    )}
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td className="fw-semibold text-primary-light">{u.name || "N/A"}</td>
                        <td>{u.mobile}</td>
                        <td>
                          <span className="badge bg-info-100 text-info px-2.5 py-1.5 radius-4 text-xs fw-semibold">
                            {u.role || "PATIENT"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${u.isActive !== false ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                            {u.isActive !== false ? "Active" : "Blocked"}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="table-actions">
                            <button
                              type="button"
                              className={`btn btn-sm ${u.isActive !== false ? "btn-outline-danger" : "btn-outline-success"}`}
                              onClick={() => toggleUserStatus(u)}
                            >
                              {u.isActive !== false ? "Block" : "Activate"}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => openPermissionDialog(u)}
                            >
                              <i className="ri-lock-password-line me-1"></i> Permissions
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm radius-12 overflow-hidden">
            <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === "doctors" ? "btn-primary text-white" : "btn-outline-secondary"}`}
                  onClick={() => setActiveTab("doctors")}
                >
                  Doctors
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === "providers" ? "btn-primary text-white" : "btn-outline-secondary"}`}
                  onClick={() => setActiveTab("providers")}
                >
                  Service Providers
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeTab === "patients" ? "btn-primary text-white" : "btn-outline-secondary"}`}
                  onClick={() => setActiveTab("patients")}
                >
                  Patients
                </button>
              </div>
            </div>

            <div className="card-body p-24">
              {loading && <div className="text-secondary-light mb-3">Loading data...</div>}

              <div className="table-responsive scroll-sm">
                {activeTab === "doctors" && (
                  <table className="table bordered-table sm-table mb-0">
                    <thead>
                      <tr>
                        <th>Doctor ID</th>
                        <th>Full Name</th>
                        <th>Speciality</th>
                        <th>Mobile</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doctors.length === 0 && !loading && (
                        <tr>
                          <td colSpan={6} className="text-center text-secondary-light">No doctors registered.</td>
                        </tr>
                      )}
                      {doctors.map(d => (
                        <tr key={d.id}>
                          <td>{d.id}</td>
                          <td className="fw-semibold text-primary-light">{d.fullName || d.name}</td>
                          <td>{d.speciality || "General"}</td>
                          <td>{d.mobile}</td>
                          <td>
                            <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${d.status === "ACTIVE" || d.isActive ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                              {d.status === "ACTIVE" || d.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="table-actions">
                              <button
                                type="button"
                                className={`btn btn-sm ${d.status === "ACTIVE" || d.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                                onClick={() => toggleMappingStatus(d, "Doctor")}
                              >
                                {d.status === "ACTIVE" || d.isActive ? "Suspend" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "providers" && (
                  <table className="table bordered-table sm-table mb-0">
                    <thead>
                      <tr>
                        <th>Provider ID</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Mobile</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.length === 0 && !loading && (
                        <tr>
                          <td colSpan={6} className="text-center text-secondary-light">No service providers found.</td>
                        </tr>
                      )}
                      {providers.map(p => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td className="fw-semibold text-primary-light">{p.providerName || p.name}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {p.providerTypes && p.providerTypes.length > 0 ? (
                                p.providerTypes.map((t) => (
                                  <span key={t} className="badge bg-info-100 text-info px-2.5 py-1.5 radius-4 text-xs fw-semibold">
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span className="badge bg-info-100 text-info px-2.5 py-1.5 radius-4 text-xs fw-semibold">
                                  {p.providerType || "LAB"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{p.mobile}</td>
                          <td>
                            <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${p.isActive ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                              {p.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="table-actions">
                              <button
                                type="button"
                                className={`btn btn-sm ${p.isActive ? "btn-outline-danger" : "btn-outline-success"}`}
                                onClick={() => toggleMappingStatus(p, "Service Provider")}
                              >
                                {p.isActive ? "Suspend" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === "patients" && (
                  <table className="table bordered-table sm-table mb-0">
                    <thead>
                      <tr>
                        <th>Patient ID</th>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Gender</th>
                        <th>City</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.length === 0 && !loading && (
                        <tr>
                          <td colSpan={6} className="text-center text-secondary-light">No patients registered.</td>
                        </tr>
                      )}
                      {patients.map(p => (
                        <tr key={p.id || p.userId}>
                          <td>{p.id || p.userId}</td>
                          <td className="fw-semibold text-primary-light">{p.fullName || p.name}</td>
                          <td>{p.mobile}</td>
                          <td>{p.gender || "-"}</td>
                          <td>{p.city || "-"}</td>
                          <td>
                            <span className={`badge px-2.5 py-1.5 radius-4 text-xs ${p.isActive !== false ? "bg-success-100 text-success" : "bg-danger-100 text-danger"}`}>
                              {p.isActive !== false ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showPermissionModal && selectedUser && (
        <div className="modal show" onClick={() => setShowPermissionModal(false)}>
          <div className="modal-card modal-card-lg" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
              <div>
                <h3 className="mb-0 fw-bold">Manage Module Permissions</h3>
                <p className="text-xs text-secondary-light mb-0">Configure modules access for {selectedUser.name || selectedUser.mobile}</p>
              </div>
              <button type="button" className="btn-close border-0 bg-transparent text-secondary" onClick={() => setShowPermissionModal(false)}>
                <i className="ri-close-line fs-4"></i>
              </button>
            </div>
            
            <div className="modal-body p-0">
              <div className="table-responsive scroll-sm" style={{ maxHeight: "360px" }}>
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>Module Name</th>
                      <th className="text-center">View</th>
                      <th className="text-center">Edit</th>
                      <th className="text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((p, index) => (
                      <tr key={p.moduleName}>
                        <td className="fw-semibold text-primary-light">{p.moduleName}</td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={!!p.canView}
                            onChange={() => handlePermissionCheckboxChange(index, "canView")}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={!!p.canEdit}
                            onChange={() => handlePermissionCheckboxChange(index, "canEdit")}
                          />
                        </td>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={!!p.canDelete}
                            onChange={() => handlePermissionCheckboxChange(index, "canDelete")}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4">
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={saveUserPermissions}
                  disabled={savingPermissions}
                >
                  {savingPermissions ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
