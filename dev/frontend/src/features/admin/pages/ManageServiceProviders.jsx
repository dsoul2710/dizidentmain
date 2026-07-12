import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/client";
import { unlinkProvider } from "@/features/admin/api/serviceProvidersApi";
import OnboardByUniqueIdModal from "@/shared/components/affiliation/OnboardByUniqueIdModal";
import OperationScopeBadge from "@/shared/components/attribution/OperationScopeBadge";
import { useToast } from "@/shared/components/common/ToastProvider";
import { useAuth } from "@/shared/hooks/useAuth";

export default function ManageServiceProviders() {
  const toast = useToast();
  const { user } = useAuth();
  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" || user?.role === "SUPERADMIN";
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);

  // Form states
  const [providerName, setProviderName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [providerTypes, setProviderTypes] = useState(["LAB"]);
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [operationScope, setOperationScope] = useState("INDEPENDENT");
  const [hospitalOrgId, setHospitalOrgId] = useState("");
  const [hospitals, setHospitals] = useState([]);

  // Search, Status and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get("/organizations").then((res) => setHospitals(res.data || [])).catch(() => {});
  }, [isSuperAdmin]);

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
    setProviderTypes(["LAB"]);
    setAddress("");
    setIsActive(true);
    setOperationScope("INDEPENDENT");
    setHospitalOrgId("");
    setModalOpen(true);
  };

  const openEditModal = (prov) => {
    setEditingProvider(prov);
    setProviderName(prov.providerName || "");
    setMobile(prov.mobile || "");
    setPassword("");
    setProviderTypes(prov.providerTypes || (prov.providerType ? [prov.providerType] : ["LAB"]));
    setAddress(prov.address || "");
    setIsActive(prov.isActive ?? true);
    setOperationScope(prov.operationScope || "INDEPENDENT");
    setHospitalOrgId("");
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!providerName || !mobile) {
      toast?.error("Provider Name and Mobile are required");
      return;
    }
    if (!providerTypes || providerTypes.length === 0) {
      toast?.error("Please select at least one Provider Type");
      return;
    }

    try {
      if (editingProvider) {
        if (isSuperAdmin) {
          const prevScope = editingProvider.operationScope || "INDEPENDENT";
          if (operationScope !== prevScope && operationScope === "INTERNAL" && !hospitalOrgId) {
            toast?.error("Select a hospital for INTERNAL scope");
            return;
          }
        }
        const payload = { providerName, mobile, providerTypes, address, isActive };
        if (password) payload.password = password;
        await api.put(`/service-providers/${editingProvider.id}`, payload);

        if (isSuperAdmin) {
          const prevScope = editingProvider.operationScope || "INDEPENDENT";
          if (operationScope !== prevScope) {
            const body = { operationScope };
            if (operationScope === "INTERNAL") {
              body.hospitalOrgId = Number(hospitalOrgId);
            }
            await api.post(`/service-providers/${editingProvider.id}/operation-scope`, body);
          }
        }
      } else {
        const payload = {
          providerName,
          mobile,
          password: password || "provider123",
          providerTypes,
          address,
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
        await api.post("/service-providers", payload);
      }
      setModalOpen(false);
      loadProviders();
      toast?.success(editingProvider ? "Provider updated" : "Provider created");
    } catch (err) {
      console.error(err);
      toast?.error(err.response?.data?.message || "Action failed. Please verify inputs.");
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
      toast?.error("Failed to toggle provider status.");
    }
  };

  const handleDeleteProvider = async (prov) => {
    if (!window.confirm(`Are you sure you want to delete Provider: ${prov.providerName}?`)) return;
    try {
      await api.delete(`/service-providers/${prov.id}`);
      loadProviders();
    } catch (err) {
      console.error(err);
      toast?.error("Failed to delete service provider.");
    }
  };

  const handleUnlink = async (prov) => {
    if (
      !window.confirm(
        `Unlink ${prov.providerName} from this clinic? Their account remains.`
      )
    ) {
      return;
    }
    try {
      await unlinkProvider(prov.id);
      toast?.success("Provider unlinked");
      loadProviders();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) toast?.error("Provider not found");
      else if (status === 403) toast?.error("Not allowed");
      else toast?.error(err?.response?.data?.message || "Unlink failed");
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
        const provType = (prov.providerTypes ? prov.providerTypes.join(" ") : (prov.providerType || "")).toLowerCase();
        const provUid = (prov.uniqueId || "").toLowerCase();
        return provName.includes(q) || provMobile.includes(q) || provType.includes(q) || provUid.includes(q);
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
              <i className="ri-add-line"></i> Add Service Provider
            </button>
          </div>
        </div>

        <div className="card-body p-24">
          {loading ? (
            <div className="p-4 text-secondary">Loading provider list...</div>
          ) : filteredProviders.length === 0 ? (
            <div className="p-4 text-secondary text-center">
              No service providers found. Link by unique ID (`SP-######`) or create an internal provider.
            </div>
          ) : (
            <>
              <div className="table-responsive scroll-sm">
                <table className="table bordered-table sm-table mb-0">
                  <thead>
                    <tr>
                      <th>S.L</th>
                      <th>Unique ID</th>
                      <th>Provider Name</th>
                      <th>Provider Type</th>
                      <th>Scope</th>
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
                          <div className="d-flex flex-wrap gap-1">
                            {prov.providerTypes && prov.providerTypes.length > 0 ? (
                              prov.providerTypes.map((type) => (
                                <span key={type} className="badge bg-info-100 text-info px-2.5 py-1.5 radius-4 text-xs fw-semibold">
                                  {type}
                                </span>
                              ))
                            ) : (
                              <span className="badge bg-info-100 text-info px-2.5 py-1.5 radius-4 text-xs fw-semibold">
                                {prov.providerType || "OTHER"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <OperationScopeBadge operationScope={prov.operationScope} />
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
                              onClick={() => handleUnlink(prov)}
                            >
                              Unlink
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
                  {editingProvider
                    ? "Update service provider details and credentials."
                    : "Register a new hospital service provider (internal scope)."}
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
                <label className="form-label fw-semibold text-sm text-primary-light">Provider Types (Select all that apply)</label>
                <div className="d-flex flex-wrap gap-3 mt-1 p-2 border rounded" style={{ borderColor: "#e3e6ec" }}>
                  {["LAB", "PHARMACY", "BED_MANAGER", "RADIOLOGY", "PATHOLOGY", "BLOOD_BANK", "AMBULANCE", "ORTHODONTIC_LAB", "OTHER"].map((type) => (
                    <div key={type} className="form-check d-flex align-items-center gap-2" style={{ minWidth: "125px" }}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`typeCheck-${type}`}
                        checked={providerTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProviderTypes((prev) => [...prev, type]);
                          } else {
                            setProviderTypes((prev) => prev.filter((t) => t !== type));
                          }
                        }}
                      />
                      <label className="form-check-label text-sm mb-0 cursor-pointer" htmlFor={`typeCheck-${type}`}>
                        {type.replace("_", " ")}
                      </label>
                    </div>
                  ))}
                </div>
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
              {isSuperAdmin && (
                <>
                  <div className="colspan">
                    <label className="form-label fw-semibold text-sm text-primary-light" htmlFor="sp-scope">
                      Operation scope
                    </label>
                    <select
                      id="sp-scope"
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
                      <label className="form-label fw-semibold text-sm text-primary-light" htmlFor="sp-hospital">
                        Hospital{editingProvider ? " (required when changing to Internal)" : ""}
                      </label>
                      <select
                        id="sp-hospital"
                        className="form-select w-100"
                        value={hospitalOrgId}
                        onChange={(e) => setHospitalOrgId(e.target.value)}
                        required={!editingProvider || operationScope === "INTERNAL"}
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

      {onboardOpen && !isSuperAdmin && (
        <OnboardByUniqueIdModal
          entityType="provider"
          onClose={() => setOnboardOpen(false)}
          onSuccess={loadProviders}
        />
      )}
    </div>
  );
}
