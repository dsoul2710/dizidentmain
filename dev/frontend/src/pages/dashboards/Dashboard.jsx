// src/pages/dashboards/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import PatientEntry from "../PatientEntry.jsx";
import PatientAdd from "../PatientAdd.jsx";
import DoctorEntry from "../DoctorEntry.jsx";
import ScheduleView from "../ScheduleView.jsx";
import BillingView from "../BillingView.jsx";
import InventoryView from "../InventoryView.jsx";
import ReportsView from "../ReportsView.jsx";
import RxSection from "../../components/rx/RxSection.jsx";
import Prescription from "../../components/print/Prescription.jsx";
import ConsentPostOpView from "../ConsentPostOpView.jsx";
import LabEntryView from "../LabEntryView.jsx";
import VendorEntry from "../VendorEntry.jsx";
import { API_BASE_URL } from "../../config";
import { formatDateDMY } from "../../utils/dateFormat";
import ChatPage from "../chat/ChatPage.jsx";
import ChatBell from "../../components/chat/ChatBell.jsx";
import NotificationPanel from "../../components/chat/NotificationPanel.jsx";
import WowDashLayout from "../../components/layout/WowDashLayout.jsx";

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();

  const [overviewMetrics, setOverviewMetrics] = useState([]);
  const [scheduleToday, setScheduleToday] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState([]);

  const formatValue = (val) =>
    typeof val === "number" ? val.toLocaleString("en-IN") : val;

  useEffect(() => {
    const fmt = (d) => d.toISOString().slice(0, 10);
    const today = new Date();
    const todayStr = fmt(today);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const loadOverview = async () => {
      setOverviewLoading(true);
      try {
        const [apptDayRes, revenueRes, outstandingRes, lowStockRes, activityRes] =
          await Promise.all([
            fetch(`${API_BASE_URL}/appointments/day/${todayStr}`),
            fetch(
              `${API_BASE_URL}/reports/revenue/daywise?fromDate=${todayStr}&toDate=${todayStr}`
            ),
            fetch(
              `${API_BASE_URL}/reports/revenue/outstanding?fromDate=2000-01-01&toDate=${todayStr}`
            ),
            fetch(`${API_BASE_URL}/reports/inventory/low-stock`),
            fetch(
              `${API_BASE_URL}/appointments/range?from=${fmt(lastWeek)}&to=${todayStr}`
            ),
          ]);

        const apptDay = apptDayRes.ok ? await apptDayRes.json() : [];
        const revenue = revenueRes.ok ? await revenueRes.json() : {};
        const outstanding = outstandingRes.ok ? await outstandingRes.json() : {};
        const lowStock = lowStockRes.ok ? await lowStockRes.json() : [];
        const activity = activityRes.ok ? await activityRes.json() : [];

        const appointmentsCount = Array.isArray(apptDay) ? apptDay.length : 0;
        const collections = Number(revenue?.totalCollected ?? 0) || 0;
        const pending = Number(outstanding?.totalPending ?? 0) || 0;
        const lowStockCount = Array.isArray(lowStock) ? lowStock.length : 0;

        const metricValues = [
          appointmentsCount,
          collections,
          pending,
          lowStockCount,
        ];
        const maxVal = Math.max(...metricValues, 0);
        const pct = (value) =>
          maxVal > 0 ? Math.min(100, Math.round((value / maxVal) * 100)) : 0;

        setOverviewMetrics([
          {
            key: "appointments",
            label: "Today Appointments",
            value: appointmentsCount,
            suffix: "",
            percent: pct(appointmentsCount),
            icon: "ri-calendar-2-line",
            tone: "bg-primary-100 text-primary-600",
          },
          {
            key: "collections",
            label: "Today Collections",
            value: collections,
            suffix: "INR",
            percent: pct(collections),
            icon: "ri-money-dollar-circle-line",
            tone: "bg-success-100 text-success-600",
          },
          {
            key: "outstanding",
            label: "Outstanding",
            value: pending,
            suffix: "INR",
            percent: pct(pending),
            icon: "ri-wallet-3-line",
            tone: "bg-warning-100 text-warning-600",
          },
          {
            key: "lowstock",
            label: "Low Stock Items",
            value: lowStockCount,
            suffix: "",
            percent: pct(lowStockCount),
            icon: "ri-alert-line",
            tone: "bg-danger-100 text-danger-600",
          },
        ]);

        setScheduleToday(Array.isArray(apptDay) ? apptDay : []);

        const recentList = Array.isArray(activity) ? activity : [];
        recentList.sort((a, b) => {
          const da = a.dateKey || a.date || "";
          const db = b.dateKey || b.date || "";
          if (da !== db) return db.localeCompare(da);
          return String(a.slot || "").localeCompare(String(b.slot || ""));
        });
        setRecentActivity(recentList.slice(0, 8));
      } catch (err) {
        console.error("Failed to load overview data", err);
        setOverviewMetrics([]);
        setScheduleToday([]);
        setRecentActivity([]);
      } finally {
        setOverviewLoading(false);
      }
    };

    loadOverview();
  }, []);

  useEffect(() => {
    const loadUnreadMessages = async () => {
      const userId = user?.id ?? user?.userId;
      if (!userId) return;

      try {
        const [unreadResponse, patientsResponse, doctorsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/chat/unread/by-sender?userId=${userId}`),
          fetch(`${API_BASE_URL}/patients`),
          fetch(`${API_BASE_URL}/doctors`)
        ]);

        if (!unreadResponse.ok) return;

        const unreadData = await unreadResponse.json();
        const patientsData = patientsResponse.ok ? await patientsResponse.json() : [];
        const doctorsData = doctorsResponse.ok ? await doctorsResponse.json() : [];

        // Create maps of userId to name
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
          const formattedMessages = unreadData.map((item) => {
            const senderId = String(item.senderUserId);
            const senderName = userMap[senderId] || item.senderName || "Unknown User";
            
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

    // Only load when notification panel is opened
    if (notificationPanelOpen) {
      loadUnreadMessages();
    }
  }, [notificationPanelOpen, user?.id, user?.userId]);



  const navItems = [
    { type: "link", label: "Overview", to: "/admin/overview", end: true, icon: "ri-home-5-line" },
    { type: "group", label: "Patients" },
    { type: "link", label: "Patient Entry", to: "/admin/patients", icon: "ri-user-add-line" },
    { type: "link", label: "Doctor Entry", to: "/admin/doctor", icon: "ri-stethoscope-line" },
    { type: "link", label: "Lab Entry", to: "/admin/lab", icon: "ri-flask-line" },
    { type: "link", label: "Vendor Entry", to: "/admin/vendor", icon: "ri-store-2-line" },
    { type: "group", label: "Schedule" },
    { type: "link", label: "Schedule", to: "/admin/appointments", icon: "ri-calendar-schedule-line" },
    { type: "link", label: "Prescription", to: "/admin/rx", icon: "ri-file-list-3-line" },
    { type: "link", label: "Consent & Guide", to: "/admin/consent", icon: "ri-file-text-line" },
    { type: "link", label: "Chat", to: "/admin/chat", icon: "ri-chat-1-line" },
    { type: "group", label: "Finance" },
    { type: "link", label: "Billing", to: "/admin/billing", icon: "ri-wallet-3-line" },
    { type: "link", label: "Reports", to: "/admin/reports", icon: "ri-bar-chart-2-line" },
    { type: "group", label: "Inventory" },
    { type: "link", label: "Inventory", to: "/admin/inventory", icon: "ri-archive-line" },
  ];

  return (
    <WowDashLayout
      brandLabel="Clinic Control Hub"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search patients, bills, procedures"
      headerActions={
        <>
          <ChatBell
            userId={user?.id ?? user?.userId}
            role={user?.role || "ADMIN"}
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          />
          <div className="d-flex flex-column text-end">
            <span className="text-sm text-secondary-light">Welcome</span>
            <span className="fw-semibold">{user?.name || "Admin"}</span>
          </div>
        </>
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route
          path="overview"
          element={
            <AdminOverview
              overviewMetrics={overviewMetrics}
              formatValue={formatValue}
              scheduleToday={scheduleToday}
              recentActivity={recentActivity}
              loading={overviewLoading}
            />
          }
        />
        <Route path="patients" element={<PatientEntry currentUser={user} />} />
        <Route path="patients/add" element={<PatientAdd currentUser={user} />} />
        <Route path="doctor" element={<DoctorEntry />} />
        <Route path="lab" element={<LabEntryView />} />
        <Route path="vendor" element={<VendorEntry />} />
        <Route
          path="appointments"
          element={
            <ScheduleView
              apiBaseUrl={API_BASE_URL}
              panelType="ADMIN"
              currentUser={user}
            />
          }
        />
        <Route
          path="rx"
          element={
            <RxSection
              apiBaseUrl={API_BASE_URL}
              panelType="ADMIN"
              currentUser={user}
            />
          }
        />
        <Route path="prescription" element={<Prescription />} />
        <Route path="consent" element={<ConsentPostOpView />} />
        <Route path="chat" element={<ChatPage role="ADMIN" currentUser={user} />} />
        <Route path="billing" element={<BillingView currentUser={user} />} />
        <Route path="reports" element={<ReportsView />} />
        <Route path="inventory" element={<InventoryView />} />
        <Route path="*" element={<Navigate to="/admin/overview" replace />} />
      </Routes>
      <NotificationPanel
        unreadMessages={unreadMessages}
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        userId={user?.id ?? user?.userId}
        role="ADMIN"
      />
    </WowDashLayout>
  );
}

function AdminOverview({
  overviewMetrics,
  formatValue,
  scheduleToday,
  recentActivity,
  loading,
}) {
  return (
    <section className="view show">
      <div className="row gy-4">
        {overviewMetrics.map((metric) => (
          <div className="col-xxl-3 col-sm-6" key={metric.key}>
            <div className="card p-3 shadow-2 radius-8 h-100">
              <div className="d-flex align-items-center justify-content-between gap-2">
                <div>
                  <h6 className="fw-semibold mb-2">
                    {formatValue(metric.value)}{" "}
                    <span className="text-secondary-light text-sm">
                      {metric.suffix}
                    </span>
                  </h6>
                  <span className="text-secondary-light text-sm">
                    {metric.label}
                  </span>
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
                <h6 className="mb-0 fw-bold text-lg">Schedule for Today</h6>
              </div>
              <div className="card-body">
                {loading && (
                  <div className="text-secondary-light">Loading schedule...</div>
                )}
                {!loading && (!scheduleToday || scheduleToday.length === 0) && (
                  <div className="text-secondary-light">No schedule loaded.</div>
                )}
                {!loading && scheduleToday?.length > 0 && (
                  <div className="d-flex flex-column gap-2">
                    {scheduleToday.slice(0, 6).map((appt) => (
                      <div key={appt.id} className="d-flex justify-content-between gap-2">
                        <div className="text-secondary-light">
                          {appt.patientName || "Patient"}
                        </div>
                        <div className="text-secondary-light">
                          {appt.slot || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        <div className="col-xxl-6">
          <div className="card h-100">
            <div className="card-header border-bottom">
              <h6 className="mb-0 fw-bold text-lg">Recent Activity</h6>
            </div>
            <div className="card-body">
              {loading && (
                <div className="text-secondary-light">Loading activity...</div>
              )}
              {!loading && (!recentActivity || recentActivity.length === 0) && (
                <div className="text-secondary-light">No recent activity.</div>
              )}
              {!loading && recentActivity?.length > 0 && (
                <ul className="mb-0 text-secondary-light">
                  {recentActivity.map((appt) => {
                    const activityDate =
                      formatDateDMY(appt.dateKey || appt.date) ||
                      appt.dateKey ||
                      appt.date ||
                      "date";
                    return (
                      <li key={`act-${appt.id}`}>
                        {appt.patientName || "Patient"} - {activityDate}{" "}
                        {appt.slot ? `@ ${appt.slot}` : ""}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
