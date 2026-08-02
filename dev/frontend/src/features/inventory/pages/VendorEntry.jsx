// src/pages/VendorEntry.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "@/api/client";
import "@/assets/css/wowdash-users.css";

export default function VendorEntry() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [serverPaging, setServerPaging] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [formValues, setFormValues] = useState({
    name: "",
    mobile: "",
    address: "",
    category: "",
    gst_no: "",
  });

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true);
        const res = await api.get("/vendors", {
          params: {
            page,
            pagesize: pageSize,
            search: vendorSearch || undefined,
          },
        });
        const data = res.data;
        if (Array.isArray(data)) {
          setServerPaging(false);
          setVendors(data || []);
          setTotalItems(data.length);
          setTotalPages(1);
        } else {
          setServerPaging(true);
          setVendors(data.items || []);
          setTotalItems(Number(data.totalItems || 0));
          setTotalPages(Number(data.totalPages || 1));
        }
      } catch (err) {
        console.error("Error loading vendors", err);
        alert("Unable to load vendors from server.");
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, [page, pageSize, vendorSearch, refreshTick]);

  const resetForm = () => {
    setFormValues({
      name: "",
      mobile: "",
      address: "",
      category: "",
      gst_no: "",
    });
    setShowVendorModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      name: (formValues.name || "").trim(),
      address: (formValues.address || "").trim(),
      mobile: (formValues.mobile || "").trim(),
      category: (formValues.category || "").trim(),
      gstNo: (formValues.gst_no || "").trim(),
    };

    try {
      const res = await api.post("/vendors", body);
      const savedVendor = res.data;
      setVendors((prev) => [savedVendor, ...prev]);
      alert("Vendor added successfully.");
      resetForm();
      setPage(1);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error saving vendor", err);
      alert("Unable to save vendor. Please try again.");
    }
  };

  const handleDelete = async (vendor) => {
    if (!window.confirm(`Delete vendor "${vendor.name}"?`)) return;

    try {
      await api.delete(`/vendors/${vendor.id}`);
      setVendors((prev) => prev.filter((v) => v.id !== vendor.id));
      alert("Vendor deleted successfully.");
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error deleting vendor", err);
      alert("Unable to delete vendor. Please try again.");
    }
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setShowVendorModal(false);
    }
  };

  const filteredVendors = useMemo(() => {
    if (serverPaging) return vendors;
    const q = vendorSearch.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => {
      const name = (v.name || "").toLowerCase();
      const mobile = String(v.mobile || "").toLowerCase();
      const category = (v.category || "").toLowerCase();
      const gstNo = (v.gstNo || "").toLowerCase();
      const address = (v.address || "").toLowerCase();
      return (
        name.includes(q) ||
        mobile.includes(q) ||
        category.includes(q) ||
        gstNo.includes(q) ||
        address.includes(q)
      );
    });
  }, [vendors, vendorSearch, serverPaging]);

  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>Vendor Entry</h2>
          <div className="page-subtitle">Manage suppliers for inventory and medicines.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <h6 className="mb-0 fw-semibold text-lg">Saved Vendors</h6>
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
                  placeholder="Search vendors"
                  value={vendorSearch}
                  onChange={(e) => {
                    setVendorSearch(e.target.value);
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
              onClick={() => setShowVendorModal(true)}
            >
              Add Vendor
            </button>
          </div>
          <div className="card-body p-24">
            {loading && (
              <p style={{ fontSize: 12, opacity: 0.7 }}>Loading vendors.</p>
            )}
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>S.L</th>
                    <th>Vendor Name</th>
                    <th>Category</th>
                    <th>Mobile</th>
                    <th>GST No.</th>
                    <th>Address</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.length === 0 && !loading && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", fontSize: 12 }}>
                        {vendorSearch ? "No vendors found." : "No vendors added yet."}
                      </td>
                    </tr>
                  )}

                  {filteredVendors.map((v, idx) => (
                    <tr key={v.id || idx}>
                      <td>{String(idx + 1).padStart(2, "0")}</td>
                      <td>{v.name}</td>
                      <td>{v.category}</td>
                      <td>{v.mobile}</td>
                      <td>{v.gstNo || ""}</td>
                      <td>{v.address || ""}</td>
                      <td className="text-right">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleDelete(v)}
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
                      �
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
                      �
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {showVendorModal && (
        <div className="modal show wow-modal" onClick={handleModalBackdropClick}>
          <div className="modal-card modal-card-lg wow-modal-card">
            <div className="wow-modal-header">
              <h3 className="wow-modal-title">Add Vendor</h3>
              <p className="wow-modal-subtitle">Create a vendor profile with basic details.</p>
            </div>
            <form onSubmit={handleSubmit} className="form-grid wow-modal-form" noValidate>
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
                <label className="form-label fw-semibold text-sm text-primary-light">Address</label>
                <input
                  name="address"
                  type="text"
                  className="form-control radius-8"
                  value={formValues.address}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">Category</label>
                <select
                  name="category"
                  required
                  className="form-select radius-8"
                  value={formValues.category}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, category: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  <option value="consumable">Consumable</option>
                  <option value="non-consumable">Non-Consumable</option>
                  <option value="medicine">Medicine</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="form-label fw-semibold text-sm text-primary-light">GST No.</label>
                <input
                  name="gst_no"
                  type="text"
                  placeholder="Enter GST number"
                  className="form-control radius-8"
                  value={formValues.gst_no}
                  onChange={(e) =>
                    setFormValues((prev) => ({ ...prev, gst_no: e.target.value }))
                  }
                />
              </div>

              <div className="actions wow-modal-actions">
                <button className="btn btn-primary" type="submit">
                  Save Vendor
                </button>
                <button className="btn btn-outline" type="button" onClick={resetForm}>
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
