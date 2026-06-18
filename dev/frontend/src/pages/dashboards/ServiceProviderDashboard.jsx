// src/pages/dashboards/ServiceProviderDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import InventoryView from "../InventoryView.jsx";
import VendorEntry from "../VendorEntry.jsx";
import RxSection from "../../components/rx/RxSection.jsx";
import LabEntryView from "../LabEntryView.jsx";
import ChatPage from "../chat/ChatPage.jsx";
import ChatBell from "../../components/chat/ChatBell.jsx";
import NotificationPanel from "../../components/chat/NotificationPanel.jsx";
import WowDashLayout from "../../components/layout/WowDashLayout.jsx";
import { API_BASE_URL } from "../../config";
import api from "../../api/api";
import "../../assets/css/wowdash-users.css";

const getInitials = (name) => {
  if (!name) return "SP";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};

const formatValue = (val) =>
  typeof val === "number" ? val.toLocaleString("en-IN") : val;

const PROVIDER_TYPE_LABELS = {
  LAB: "Lab Partner",
  PHARMACY: "Pharmacy Partner",
  BED_MANAGER: "Bed Manager",
  OTHER: "Service Partner",
};

export default function ServiceProviderDashboard({ user, onLogout }) {
  const providerType = user?.providerType || "OTHER";
  const [displayName, setDisplayName] = useState(user?.name || "Service Provider");
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [unreadEvents, setUnreadEvents] = useState([]);

  const [clinics, setClinics] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(() => {
    return localStorage.getItem("hms_active_org_id") || "";
  });

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await api.get("/service-providers/my-clinics");
        const list = res.data || [];
        setClinics(list);
        if (list.length > 0 && !activeOrgId) {
          localStorage.setItem("hms_active_org_id", String(list[0].id));
          setActiveOrgId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load clinics for service provider", err);
      }
    };
    fetchClinics();
  }, [activeOrgId]);

  useEffect(() => {
    const rawName = (user?.name || "").trim();
    if (rawName && rawName.toLowerCase() !== "service provider") {
      setDisplayName(rawName);
      return;
    }
    const userId = user?.id ?? user?.userId;
    if (!userId) return;

    let cancelled = false;
    const loadProviderName = async () => {
      try {
        const res = await api.get("/service-providers");
        const match = (res.data || []).find(
          (p) => String(p.id) === String(userId) || String(p.userId) === String(userId)
        );
        if (!cancelled && match?.name) {
          setDisplayName(match.name);
        }
      } catch (err) {
        console.error("Failed to load service provider name", err);
      }
    };

    loadProviderName();
    return () => {
      cancelled = true;
    };
  }, [user?.name, user?.id, user?.userId]);

  useEffect(() => {
    const loadUnreadMessages = async () => {
      const userId = user?.id ?? user?.userId;
      if (!userId) return;

      try {
        const [unreadResponse, patientsResponse, doctorsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/chat/unread/by-sender?userId=${userId}`),
          fetch(`${API_BASE_URL}/patients`),
          fetch(`${API_BASE_URL}/doctors`),
        ]);

        if (!unreadResponse.ok) return;

        const unreadData = await unreadResponse.json();
        const patientsData = patientsResponse.ok ? await patientsResponse.json() : [];
        const doctorsData = doctorsResponse.ok ? await doctorsResponse.json() : [];

        const userMap = {};
        (patientsData || []).forEach((p) => {
          const id = String(p.userId ?? p.id);
          userMap[id] = p.name || p.mobile || "Patient";
        });
        (doctorsData || []).forEach((d) => {
          const id = String(d.id);
          userMap[id] = d.name || d.mobile || "Doctor";
        });

        if (Array.isArray(unreadData) && unreadData.length > 0) {
          setUnreadMessages(
            unreadData.map((item) => {
              const senderId = String(item.senderUserId);
              return {
                id: item.senderUserId || Math.random(),
                senderName: userMap[senderId] || item.senderName || "Unknown User",
                preview: `${item.count} unread message${item.count > 1 ? "s" : ""}`,
                count: item.count,
              };
            })
          );
        } else {
          setUnreadMessages([]);
        }
      } catch (err) {
        console.error("Failed to load unread messages", err);
      }
    };

    const loadUnreadEvents = async () => {
      const userId = user?.id ?? user?.userId;
      if (!userId) return;

      try {
        const eventsResponse = await fetch(
          `${API_BASE_URL}/events?userId=${userId}&role=${encodeURIComponent("SERVICE_PROVIDER")}`
        );
        if (!eventsResponse.ok) return;

        const eventsData = await eventsResponse.json();
        const lastSeenKey = `hms_events_last_seen_${userId}`;
        const lastSeen = localStorage.getItem(lastSeenKey) || "";

        const unreadEventsList = (Array.isArray(eventsData) ? eventsData : []).filter(
          (item) => item?.timestamp && item.timestamp > lastSeen
        );
        setUnreadEvents(unreadEventsList);
      } catch (err) {
        console.error("Failed to load unread events", err);
      }
    };

    if (notificationPanelOpen) {
      loadUnreadMessages();
      loadUnreadEvents();
    }
  }, [notificationPanelOpen, user?.id, user?.userId]);

  const handleClinicChange = (id) => {
    localStorage.setItem("hms_active_org_id", String(id));
    setActiveOrgId(id);
  };

  const navItems = useMemo(() => {
    const base = [
      { type: "link", label: "Overview", to: "/provider/overview", end: true, icon: "ri-home-5-line" },
    ];

    if (providerType === "LAB") {
      base.push(
        { type: "group", label: "Lab Operations" },
        { type: "link", label: "Lab Orders", to: "/provider/orders", icon: "ri-flask-line" },
        { type: "link", label: "Lab Configurations", to: "/provider/labs", icon: "ri-settings-4-line" }
      );
    } else if (providerType === "PHARMACY") {
      base.push(
        { type: "group", label: "Pharmacy & Inventory" },
        { type: "link", label: "Inventory Stock", to: "/provider/inventory", icon: "ri-archive-line" },
        { type: "link", label: "Suppliers / Vendors", to: "/provider/vendors", icon: "ri-store-2-line" },
        { type: "link", label: "Prescriptions", to: "/provider/rx", icon: "ri-file-list-3-line" }
      );
    } else if (providerType === "BED_MANAGER") {
      base.push(
        { type: "group", label: "Accommodation" },
        { type: "link", label: "Beds Allocation", to: "/provider/beds", icon: "ri-hotel-bed-line" }
      );
    }

    base.push(
      { type: "group", label: "Communication" },
      { type: "link", label: "Chat", to: "/provider/chat", icon: "ri-chat-1-line" }
    );

    return base;
  }, [providerType]);

  return (
    <WowDashLayout
      brandLabel="Partner Hub"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search files, requests, messages"
      headerActions={
        <>
          <ChatBell
            userId={user?.id ?? user?.userId}
            role="SERVICE_PROVIDER"
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          />
          {clinics.length > 0 && (
            <select
              className="form-select form-select-sm border-primary text-primary fw-semibold radius-8 ms-2"
              style={{ width: "auto" }}
              value={activeOrgId}
              onChange={(e) => handleClinicChange(e.target.value)}
            >
              {clinics.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <div className="d-flex align-items-center gap-2 ms-2">
            <div className="w-40-px h-40-px bg-primary-100 text-primary-600 rounded-circle d-flex justify-content-center align-items-center fw-bold text-md shadow-sm border border-white">
              {getInitials(displayName)}
            </div>
            <div className="d-flex flex-column text-start">
              <span className="text-xs text-secondary-light" style={{ lineHeight: 1 }}>Welcome,</span>
              <span className="fw-semibold text-primary-light text-sm" style={{ lineHeight: 1.2 }}>
                {displayName}
              </span>
            </div>
          </div>
        </>
      }
    >
      <Routes key={activeOrgId}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ProviderOverview user={user} />} />

        <Route path="orders" element={<LabOrdersView />} />
        <Route path="labs" element={<LabEntryView />} />

        <Route path="inventory" element={<InventoryView />} />
        <Route path="vendors" element={<VendorEntry />} />
        <Route
          path="rx"
          element={
            <RxSection
              apiBaseUrl={API_BASE_URL}
              panelType="ORG"
              currentUser={user}
            />
          }
        />

        <Route path="beds" element={<BedsAllocationView />} />
        <Route path="chat" element={<ChatPage role="SERVICE_PROVIDER" currentUser={user} />} />

        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>

      <NotificationPanel
        unreadMessages={unreadMessages}
        unreadEvents={unreadEvents}
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        userId={user?.id ?? user?.userId}
        role="SERVICE_PROVIDER"
      />
    </WowDashLayout>
  );
}

function ProviderOverview({ user }) {
  const providerType = user?.providerType || "OTHER";

  const overviewMetrics = useMemo(() => {
    let metrics = [];
    if (providerType === "LAB") {
      metrics = [
        { key: "pending", label: "Pending Lab Orders", value: 3, icon: "ri-flask-line", tone: "bg-warning-100 text-warning-600" },
        { key: "completed", label: "Completed Reports", value: 24, icon: "ri-checkbox-circle-line", tone: "bg-success-100 text-success-600" },
        { key: "critical", label: "Critical Notifications", value: 1, icon: "ri-alert-line", tone: "bg-danger-100 text-danger-600" },
      ];
    } else if (providerType === "PHARMACY") {
      metrics = [
        { key: "lowstock", label: "Low Stock Items", value: 8, icon: "ri-alert-line", tone: "bg-danger-100 text-danger-600" },
        { key: "rx", label: "Active Rx Orders", value: 5, icon: "ri-file-list-3-line", tone: "bg-primary-100 text-primary-600" },
        { key: "vendors", label: "Total Vendors", value: 4, icon: "ri-store-2-line", tone: "bg-success-100 text-success-600" },
      ];
    } else if (providerType === "BED_MANAGER") {
      metrics = [
        { key: "capacity", label: "Total Beds Capacity", value: 30, icon: "ri-hotel-bed-line", tone: "bg-primary-100 text-primary-600" },
        { key: "occupied", label: "Beds Occupied", value: 12, icon: "ri-user-shared-line", tone: "bg-warning-100 text-warning-600" },
        { key: "available", label: "Beds Available", value: 18, icon: "ri-checkbox-circle-line", tone: "bg-success-100 text-success-600" },
      ];
    } else {
      metrics = [
        { key: "requests", label: "Pending Requests", value: 0, icon: "ri-question-line", tone: "bg-neutral-200 text-secondary-light" },
      ];
    }

    const values = metrics.map((m) => m.value);
    const maxVal = Math.max(...values, 0);
    const pct = (value) =>
      maxVal > 0 ? Math.min(100, Math.round((value / maxVal) * 100)) : 0;

    return metrics.map((m) => ({ ...m, percent: pct(m.value) }));
  }, [providerType]);

  const recentAlerts = useMemo(() => {
    if (providerType === "LAB") {
      return [
        "CBC report pending upload for Misha Patient",
        "Thyroid profile requested by Dr. Mishan",
      ];
    }
    if (providerType === "PHARMACY") {
      return [
        "8 inventory items below minimum stock level",
        "5 prescriptions awaiting fulfillment",
      ];
    }
    if (providerType === "BED_MANAGER") {
      return [
        "12 beds currently occupied across the ward",
        "3 beds marked for cleaning/maintenance",
      ];
    }
    return ["No active alerts at this time."];
  }, [providerType]);

  return (
    <section className="view show wowdash-users">
      <div className="row gy-4">
        {overviewMetrics.map((metric) => (
          <div className="col-xxl-3 col-sm-6" key={metric.key}>
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">{formatValue(metric.value)}</h6>
                  <span className="text-secondary-light text-sm">{metric.label}</span>
                </div>
                <span
                  className={`w-48-px h-48-px ${metric.tone} flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle`}
                >
                  <i className={`${metric.icon} text-xl`}></i>
                </span>
              </div>
              <div className="progress mt-3" style={{ height: 6 }}>
                <div
                  className="progress-bar"
                  style={{ width: `${metric.percent}%` }}
                  role="progressbar"
                  aria-valuenow={metric.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          </div>
        ))}

        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom">
              <h6 className="mb-0 fw-bold text-lg">Partner Profile</h6>
            </div>
            <div className="card-body">
              <div className="d-flex flex-column gap-2 text-secondary-light">
                <div className="d-flex justify-content-between gap-2">
                  <span>Partner Type</span>
                  <span className="fw-semibold text-primary-light">
                    {PROVIDER_TYPE_LABELS[providerType] || providerType}
                  </span>
                </div>
                <div className="d-flex justify-content-between gap-2">
                  <span>Account Status</span>
                  <span className="fw-semibold text-success-600">Active</span>
                </div>
                <div className="d-flex justify-content-between gap-2">
                  <span>Linked Clinics</span>
                  <span className="fw-semibold text-primary-light">
                    {localStorage.getItem("hms_active_org_id") ? "1 selected" : "None"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom">
              <h6 className="mb-0 fw-bold text-lg">Recent Alerts</h6>
            </div>
            <div className="card-body">
              {recentAlerts.length === 0 ? (
                <div className="text-secondary-light">No recent alerts.</div>
              ) : (
                <ul className="mb-0 text-secondary-light">
                  {recentAlerts.map((alert, idx) => (
                    <li key={`alert-${idx}`}>{alert}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LabOrdersView() {
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem("hms_lab_orders");
    if (saved) return JSON.parse(saved);
    return [
      { id: "LAB-29381", patient: "Misha Patient", testName: "CBC (Complete Blood Count)", doctor: "Dr. Mishan", status: "PENDING", date: "2026-06-18", findings: "" },
      { id: "LAB-29382", patient: "Jane Smith", testName: "Thyroid Profile (T3, T4, TSH)", doctor: "Dr. Mishan", status: "PENDING", date: "2026-06-17", findings: "" },
      { id: "LAB-29383", patient: "Alice Brown", testName: "HbA1c (Glycated Hemoglobin)", doctor: "Dr. Mishan", status: "COMPLETED", date: "2026-06-15", findings: "HbA1c: 5.8% (Normal)" },
    ];
  });

  const [activeOrder, setActiveOrder] = useState(null);
  const [findingsText, setFindingsText] = useState("");

  const saveOrders = (updated) => {
    setOrders(updated);
    localStorage.setItem("hms_lab_orders", JSON.stringify(updated));
  };

  const handleOpenResultsForm = (order) => {
    setActiveOrder(order);
    setFindingsText(order.findings);
  };

  const handleSaveResults = () => {
    if (!activeOrder) return;
    const updated = orders.map((o) => {
      if (o.id === activeOrder.id) {
        return { ...o, findings: findingsText, status: "COMPLETED" };
      }
      return o;
    });
    saveOrders(updated);
    setActiveOrder(null);
    alert(`Results uploaded and report marked COMPLETED for ${activeOrder.patient}`);
  };

  const renderStatusPill = (status) => {
    const isCompleted = status === "COMPLETED";
    const color = isCompleted ? "#15803d" : "#c05621";
    const bg = isCompleted ? "rgba(22,163,74,0.08)" : "rgba(192,86,33,0.08)";
    return (
      <span
        style={{
          color,
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "999px",
          fontSize: "0.75rem",
          background: bg,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>Lab Orders</h2>
          <div className="page-subtitle">Review pending requests and upload diagnostic findings.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <h6 className="mb-0 fw-semibold text-lg">Lab Orders Queue</h6>
            <span className="text-md fw-medium text-secondary-light mb-0">
              {orders.length} order{orders.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="card-body p-24">
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Patient</th>
                    <th>Test Name</th>
                    <th>Prescribing Doctor</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", fontSize: 12 }}>
                        No lab orders in queue.
                      </td>
                    </tr>
                  )}
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="fw-semibold">{o.id}</td>
                      <td>{o.patient}</td>
                      <td>{o.testName}</td>
                      <td>{o.doctor}</td>
                      <td>{o.date}</td>
                      <td>{renderStatusPill(o.status)}</td>
                      <td className="text-right">
                        <div className="table-actions">
                          {o.status === "PENDING" ? (
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => handleOpenResultsForm(o)}
                            >
                              Upload Results
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => alert(`Report findings:\n${o.findings}`)}
                            >
                              View Findings
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {activeOrder && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setActiveOrder(null)}
        >
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 radius-12">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Enter Lab Findings</h5>
                <button type="button" className="btn-close" onClick={() => setActiveOrder(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Patient</label>
                  <input type="text" className="form-control" value={activeOrder.patient} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Test Name</label>
                  <input type="text" className="form-control" value={activeOrder.testName} disabled />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold text-sm">Findings / Diagnostic Details</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    placeholder="Enter lab values, ranges, and diagnostic summary..."
                    value={findingsText}
                    onChange={(e) => setFindingsText(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setActiveOrder(null)}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveResults}>
                  Submit Lab Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function BedsAllocationView() {
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
