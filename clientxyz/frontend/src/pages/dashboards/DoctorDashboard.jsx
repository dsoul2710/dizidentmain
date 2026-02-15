// src/pages/dashboards/DoctorDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import TreatmentPlanView from "../TreatmentPlanView.jsx";
import DiagnosisView from "../DiagnosisView.jsx";
import RxSection from "../../components/rx/RxSection.jsx";
import ScheduleView from "../ScheduleView.jsx";
import HeaderPatientSelector from "../../components/layout/HeaderPatientSelector.jsx";
import { API_BASE_URL } from "../../config";
import ChatPage from "../chat/ChatPage.jsx";
import ChatBell from "../../components/chat/ChatBell.jsx";
import NotificationPanel from "../../components/chat/NotificationPanel.jsx";
import WowDashLayout from "../../components/layout/WowDashLayout.jsx";
import { formatDateDMY } from "../../utils/dateFormat";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

export default function DoctorDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPatientId, setSelectedPatientId] = useState(
    () => getCookie("selectedPatientId") || ""
  );
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [diagnosisPreviewText, setDiagnosisPreviewText] = useState("");
  const [treatmentPreviewText, setTreatmentPreviewText] = useState("");
  const [diagnosisPreviewOpen, setDiagnosisPreviewOpen] = useState(false);
  const [treatmentPreviewOpen, setTreatmentPreviewOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [unreadEvents, setUnreadEvents] = useState([]);

  useEffect(() => {
    const rawName = (user?.name || "").trim();
    const isPlaceholder =
      !rawName ||
      rawName.toLowerCase() === "clinic user" ||
      rawName.toLowerCase() === "doctor";
    if (!isPlaceholder) {
      setDisplayName(rawName);
      return;
    }
    const userId = user?.id ?? user?.userId;
    if (!userId) return;

    let cancelled = false;
    const loadDoctorName = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/doctors`);
        if (!res.ok) throw new Error("Doctor fetch failed");
        const data = await res.json();
        const match = (data || []).find(
          (d) => String(d.id) === String(userId) || String(d.userId) === String(userId)
        );
        if (!cancelled && match?.name) {
          setDisplayName(match.name);
        }
      } catch (err) {
        console.error("Failed to load doctor name", err);
      }
    };

    loadDoctorName();
    return () => {
      cancelled = true;
    };
  }, [user?.name, user?.id, user?.userId]);

  useEffect(() => {
    const handler = (event) => {
      const next = (event?.detail || "").trim();
      setDiagnosisPreviewText(next);
      if (!next) setDiagnosisPreviewOpen(false);
    };
    window.addEventListener("diagnosis-preview", handler);
    const initial = (window.__diagnosisPreview || "").trim();
    setDiagnosisPreviewText(initial);
    return () => {
      window.removeEventListener("diagnosis-preview", handler);
    };
  }, []);

  useEffect(() => {
    const handler = (event) => {
      const next = (event?.detail || "").trim();
      setTreatmentPreviewText(next);
      if (!next) setTreatmentPreviewOpen(false);
    };
    window.addEventListener("treatment-preview", handler);
    const initial = (window.__treatmentPreview || "").trim();
    setTreatmentPreviewText(initial);
    return () => {
      window.removeEventListener("treatment-preview", handler);
    };
  }, []);

  useEffect(() => {
    const loadUnreadMessages = async () => {
      const userId = user?.id ?? user?.userId;
      if (!userId) return;

      try {
        const [unreadResponse, patientsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/chat/unread/by-sender?userId=${userId}`),
          fetch(`${API_BASE_URL}/patients`)
        ]);

        if (!unreadResponse.ok) return;

        const unreadData = await unreadResponse.json();
        const patientsData = patientsResponse.ok ? await patientsResponse.json() : [];

        // Create a map of userId to patient name
        const patientMap = {};
        (patientsData || []).forEach((p) => {
          const id = String(p.userId ?? p.id);
          patientMap[id] = p.name || p.mobile || "Patient";
        });

        if (Array.isArray(unreadData) && unreadData.length > 0) {
          const formattedMessages = unreadData.map((item) => {
            const senderId = String(item.senderUserId);
            const senderName = patientMap[senderId] || item.senderName || "Unknown User";
            
            return {
              id: item.senderUserId || Math.random(),
              senderName: senderName,
              preview: `${item.count} unread message${item.count > 1 ? "s" : ""}`,
              count: item.count,
            };
          });
          setUnreadMessages(formattedMessages);
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
          `${API_BASE_URL}/events?userId=${userId}&role=DOCTOR`
        );

        if (!eventsResponse.ok) return;

        const eventsData = await eventsResponse.json();
        
        // Get last seen timestamp from localStorage
        const lastSeenKey = `hms_events_last_seen_${userId}`;
        const lastSeen = localStorage.getItem(lastSeenKey) || "";

        const isEventForUser = (event) => {
          const userIdStr = String(userId);
          const roleName = String(displayName || user?.name || "").trim().toLowerCase();
          const candidates = [
            event?.userId,
            event?.recipientUserId,
            event?.targetUserId,
            event?.patientUserId,
            event?.doctorUserId,
            event?.adminUserId,
            event?.assignedDoctorId,
            event?.patientId,
            event?.doctorId,
            event?.adminId,
          ];
          if (candidates.some((value) => value != null && String(value) === userIdStr)) {
            return true;
          }
          if (roleName) {
            return String(event?.doctorName || "").trim().toLowerCase() === roleName;
          }
          return false;
        };

        // Filter events that are newer than last seen
        const list = Array.isArray(eventsData) ? eventsData : [];
        const unreadEventsList = list.filter((item) => {
          if (!item?.timestamp || item.timestamp <= lastSeen) return false;
          if (!isEventForUser(item)) return false;
          return true;
        });
        setUnreadEvents(unreadEventsList);
      } catch (err) {
        console.error("Failed to load unread events", err);
      }
    };

    // Only load when notification panel is opened
    if (notificationPanelOpen) {
      loadUnreadMessages();
      loadUnreadEvents();
    }
  }, [notificationPanelOpen, user?.id, user?.userId]);



  const isDiagnosis = location.pathname === "/doctor/diagnosis";
  const isTreatment = location.pathname === "/doctor/treatment";
  const activePreviewText = isDiagnosis ? diagnosisPreviewText : isTreatment ? treatmentPreviewText : "";
  const activePreviewOpen = isDiagnosis
    ? diagnosisPreviewOpen
    : isTreatment
      ? treatmentPreviewOpen
      : false;
  const activePreviewLabel = isDiagnosis
    ? "Final Description"
    : isTreatment
      ? "Treatment Plan Summary"
      : "";

  const handleCreateVisit = async () => {
    const activePatientId = getCookie("selectedPatientId");
    if (!activePatientId) {
      alert("Select a patient first.");
      return;
    }

    try {
      const payload = {
        patientUserId: Number(activePatientId),
        doctorUserId: user?.id ?? null,
        visitType: "FOLLOWUP",
        chiefComplaint: "",
        notes: "",
        createdByUserId: user?.id ?? user?.userId ?? null,
      };

      const res = await fetch(`${API_BASE_URL}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create visit");
      }

      const data = await res.json();
      try {
        localStorage.setItem("active_patient_id", String(activePatientId));
        localStorage.setItem("active_visit_id", String(data.id));
      } catch {
        // ignore
      }
      alert(`New visit created. Visit ID: ${data.id}`);
    } catch (err) {
      console.error("Failed to create visit", err);
      alert("Unable to create visit. Please try again.");
    }
  };

  const navItems = [
    { type: "link", label: "Overview", to: "/doctor/overview", end: true, icon: "ri-home-5-line" },
    { type: "group", label: "Patient Care" },
    { type: "link", label: "Examination & Diagnosis", to: "/doctor/diagnosis", icon: "ri-stethoscope-line" },
    { type: "link", label: "Treatment Plan", to: "/doctor/treatment", icon: "ri-clipboard-line" },
    { type: "link", label: "Prescription (Rx)", to: "/doctor/rx", icon: "ri-file-list-3-line" },
    { type: "group", label: "Other" },
    { type: "link", label: "Schedule", to: "/doctor/appointments", icon: "ri-calendar-2-line" },
    { type: "link", label: "Chat", to: "/doctor/chat", icon: "ri-chat-1-line" },
  ];

  return (
    <WowDashLayout
      brandLabel="Doctor Hub"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search patients, visits, notes"
      headerActions={
        <>
          <ChatBell
            userId={user?.userId ?? user?.id}
            role={user?.role || "DOCTOR"}
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          />
          {activePreviewText && (
            <button
              type="button"
              className={`diag-preview-toggle${activePreviewOpen ? " active" : ""}`}
              onClick={() => {
                if (isDiagnosis) {
                  setDiagnosisPreviewOpen((prev) => !prev);
                } else if (isTreatment) {
                  setTreatmentPreviewOpen((prev) => !prev);
                }
              }}
            >
              {activePreviewLabel}
            </button>
          )}
          {user?.role === "DOCTOR" && (
            <>
              <HeaderPatientSelector
                apiBaseUrl={API_BASE_URL}
                onPatientChange={setSelectedPatientId}
                doctorUserId={user?.userId ?? user?.id ?? null}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCreateVisit}
                disabled={!selectedPatientId}
                title={!selectedPatientId ? "Select a patient first" : ""}
              >
                + New Visit
              </button>
            </>
          )}
          <div className="d-flex flex-column text-end">
            <span className="text-sm text-secondary-light">Hello</span>
            <span className="fw-semibold">Dr. {displayName || "Doctor"}</span>
          </div>
        </>
      }
      headerBelow={
        activePreviewText && activePreviewOpen ? (
          <div className="diag-preview-bar">
            <div className="diag-preview-text">{activePreviewText}</div>
          </div>
        ) : null
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<DoctorOverview user={user} />} />
        <Route path="diagnosis" element={<DiagnosisView />} />
        <Route path="treatment" element={<TreatmentPlanView />} />
        <Route
          path="rx"
          element={
            <RxSection
              apiBaseUrl={API_BASE_URL}
              panelType="DOCTOR"
              currentUser={user}
            />
          }
        />
        <Route
          path="appointments"
          element={
            <ScheduleView
              apiBaseUrl={API_BASE_URL}
              panelType="DOCTOR"
              currentUser={user}
            />
          }
        />
        <Route path="chat" element={<ChatPage role="DOCTOR" currentUser={user} />} />
        <Route path="*" element={<Navigate to="/doctor/overview" replace />} />
      </Routes>
      <NotificationPanel
        unreadMessages={unreadMessages}
        unreadEvents={unreadEvents}
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        userId={user?.userId ?? user?.id}
        role="DOCTOR"
      />
    </WowDashLayout>
  );
}


function DoctorOverview({ user }) {
  const [loading, setLoading] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    todayCount: 0,
    completedCount: 0,
    patientsCount: 0,
    pendingCount: 0,
    totalRevenue: 0,
    monthRevenue: 0,
    avgPerAppointment: 0,
  });

  const doctorId = user?.id ?? user?.userId ?? null;

  const fmt = (d) => d.toISOString().slice(0, 10);
  const today = new Date();
  const todayStr = fmt(today);

  const filteredToday = useMemo(() => {
    if (!doctorId) return todayAppointments;
    return (todayAppointments || []).filter(
      (a) => String(a.doctorUserId ?? "") === String(doctorId)
    );
  }, [todayAppointments, doctorId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Fetch today's appointments, patient list, and billing data
        const [dayRes, patientsRes, billRes] = await Promise.all([
          fetch(`${API_BASE_URL}/appointments/day/${todayStr}`),
          fetch(`${API_BASE_URL}/patients`),
          fetch(`${API_BASE_URL}/bills`),
        ]);

        const dayData = dayRes.ok ? await dayRes.json() : [];
        const patientsData = patientsRes.ok ? await patientsRes.json() : [];
        const billData = billRes.ok ? await billRes.json() : [];

        if (cancelled) return;

        // Filter by doctor ID
        const filteredDay = Array.isArray(dayData)
          ? dayData.filter((a) => String(a.doctorUserId ?? "") === String(doctorId))
          : [];

        // Filter bills by doctor ID and calculate revenue
        const filteredBills = Array.isArray(billData)
          ? billData.filter((b) => String(b.doctorUserId ?? "") === String(doctorId))
          : [];

        const totalRevenue = filteredBills.reduce((sum, bill) => {
          return sum + (parseFloat(bill.totalAmount) || 0);
        }, 0);

        const monthStart = new Date();
        monthStart.setDate(1);
        const monthBills = filteredBills.filter((b) => {
          const billDate = new Date(b.createdDate || b.date);
          return billDate >= monthStart && billDate <= new Date();
        });
        const monthRevenue = monthBills.reduce((sum, bill) => {
          return sum + (parseFloat(bill.totalAmount) || 0);
        }, 0);

        const avgPerAppointment = filteredDay.length > 0 ? totalRevenue / filteredDay.length : 0;

        setTodayAppointments(filteredDay);

        // Calculate statistics
        const completedToday = filteredDay.filter(
          (a) => a.status?.toLowerCase() === "completed"
        ).length;
        const pendingToday = filteredDay.filter(
          (a) => {
            const s = a.status?.toLowerCase() || "";
            return s === "scheduled" || s === "booked" || !a.status;
          }
        ).length;

        setStats({
          todayCount: filteredDay.length,
          completedCount: completedToday,
          patientsCount: Array.isArray(patientsData) ? patientsData.length : 0,
          pendingCount: pendingToday,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          monthRevenue: Math.round(monthRevenue * 100) / 100,
          avgPerAppointment: Math.round(avgPerAppointment * 100) / 100,
        });
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to load doctor overview", e);
          setError("Unable to load overview data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [doctorId, todayStr]);

  const renderAppt = (appt, idx) => {
    const label = appt.patientName || "Patient";
    const dateLabel = appt.date ? formatDateDMY(appt.date) : "";
    const slot = appt.slot || "";
    const status = appt.status || "Scheduled";
    const statusLower = status.toLowerCase();
    const badgeColor = 
      statusLower === "completed" ? "success" : 
      statusLower === "cancelled" ? "danger" : 
      "warning";
    
    return (
      <div key={appt.id || idx} className="d-flex justify-content-between align-items-center py-2 px-2 border-bottom">
        <div className="flex-grow-1 min-width-0">
          <p className="mb-0 text-dark text-xs fw-semibold" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </p>
          <p className="mb-0 text-xs text-secondary-light">
            {dateLabel}
            {slot && ` · ${slot}`}
          </p>
        </div>
        <span className={`badge bg-light-${badgeColor} text-${badgeColor} ms-2 flex-shrink-0 text-xs`}>
          {status}
        </span>
      </div>
    );
  };

  const StatCard = ({ icon, label, value, change, color }) => (
    <div className="card h-100 border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-secondary-light text-sm mb-2">{label}</p>
            <h3 className={`mb-0 fw-bold text-${color || "primary"}`}>{value}</h3>
            {change && (
              <p className={`text-sm mt-2 mb-0 ${change > 0 ? "text-success" : "text-danger"}`}>
                {change > 0 ? "+" : ""}{change}% vs last week
              </p>
            )}
          </div>
          <div className={`d-flex align-items-center justify-content-center w-50px h-50px rounded bg-light-${color || "primary"}`}>
            <i className={`ri-${icon} fs-4 text-${color || "primary"}`}></i>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="view show">
      <div className="row gy-4">
        {/* Statistics Cards */}
        <div className="col-12">
          <div className="row gy-3">
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="calendar-check-line"
                label="Today Appointments"
                value={stats.todayCount}
                color="primary"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="checkbox-circle-line"
                label="Completed Today"
                value={stats.completedCount}
                color="success"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="user-3-line"
                label="Total Patients"
                value={stats.patientsCount}
                color="info"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="hourglass-2-line"
                label="Pending Today"
                value={stats.pendingCount}
                color="warning"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="money-dollar-circle-line"
                label="Total Revenue"
                value={`₹${stats.totalRevenue.toLocaleString()}`}
                color="success"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="calendar-month-line"
                label="This Month"
                value={`₹${stats.monthRevenue.toLocaleString()}`}
                color="info"
              />
            </div>
            <div className="col-xxl-3 col-sm-6">
              <StatCard
                icon="bar-chart-box-line"
                label="Avg per Appointment"
                value={`₹${stats.avgPerAppointment.toLocaleString()}`}
                color="primary"
              />
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="col-xxl-6">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-header border-bottom bg-white py-3 px-4">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-bold text-dark text-sm">Today's Appointments</h6>
                <span className="badge bg-light-primary text-primary text-xs">{filteredToday.length} appointments</span>
              </div>
            </div>
            <div className="card-body p-4">
              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              )}
              {!loading && error && (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              )}
              {!loading && !error && filteredToday.length === 0 && (
                <div className="text-center py-5">
                  <i className="ri-calendar-blank-line fs-2 text-secondary-light mb-3 d-block"></i>
                  <p className="text-secondary-light">No appointments scheduled for today.</p>
                </div>
              )}
              {!loading && !error && filteredToday.length > 0 && (
                <div>
                  {filteredToday.map(renderAppt)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats - Right Side */}
        <div className="col-xxl-6">
          <div className="row gy-3">
            {/* Appointment Distribution */}
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-header border-bottom bg-white py-3 px-4">
                  <h6 className="mb-0 fw-bold text-dark text-sm">Appointment Status</h6>
                </div>
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary-light d-flex align-items-center gap-2 text-xs">
                      <span className="w-10px h-10px rounded-circle" style={{ backgroundColor: "#4f83ff" }}></span>
                      Scheduled
                    </span>
                    <strong className="text-dark text-xs">{stats.pendingCount}</strong>
                  </div>
                  <div className="progress mb-4" style={{ height: "5px" }}>
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${stats.todayCount > 0 ? (stats.pendingCount / stats.todayCount) * 100 : 0}%` }}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary-light d-flex align-items-center gap-2 text-xs">
                      <span className="w-10px h-10px rounded-circle" style={{ backgroundColor: "#22c55e" }}></span>
                      Completed
                    </span>
                    <strong className="text-dark text-xs">{stats.completedCount}</strong>
                  </div>
                  <div className="progress" style={{ height: "5px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${stats.todayCount > 0 ? (stats.completedCount / stats.todayCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>


      </div>
    </section>
  );
}
