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
import HeaderProfile from "../../components/layout/HeaderProfile.jsx";
import OrgOverview from "../org/OrgOverview.jsx";
import useNotifications from "../../hooks/useNotifications";

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();

  const [overviewMetrics, setOverviewMetrics] = useState([]);
  const [scheduleToday, setScheduleToday] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const { unreadMessages, unreadEvents } = useNotifications(user, notificationPanelOpen);

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





  const navItems = [
    { type: "link", label: "Overview", to: "/org/overview", end: true, icon: "ri-home-5-line" },
    { type: "group", label: "Patients" },
    { type: "link", label: "Patient Entry", to: "/org/patients", icon: "ri-user-add-line" },
    { type: "link", label: "Doctor Entry", to: "/org/doctor", icon: "ri-stethoscope-line" },
    { type: "link", label: "Lab Entry", to: "/org/lab", icon: "ri-flask-line" },
    { type: "link", label: "Vendor Entry", to: "/org/vendor", icon: "ri-store-2-line" },
    { type: "group", label: "Schedule" },
    { type: "link", label: "Schedule", to: "/org/appointments", icon: "ri-calendar-schedule-line" },
    { type: "link", label: "Prescription", to: "/org/rx", icon: "ri-file-list-3-line" },
    { type: "link", label: "Consent & Guide", to: "/org/consent", icon: "ri-file-text-line" },
    { type: "link", label: "Chat", to: "/org/chat", icon: "ri-chat-1-line" },
    { type: "group", label: "Finance" },
    { type: "link", label: "Billing", to: "/org/billing", icon: "ri-wallet-3-line" },
    { type: "link", label: "Reports", to: "/org/reports", icon: "ri-bar-chart-2-line" },
    { type: "group", label: "Inventory" },
    { type: "link", label: "Inventory", to: "/org/inventory", icon: "ri-archive-line" },
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
            role={user?.role || "ORG"}
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          />
          <HeaderProfile
            name={user?.name || "Org"}
            roleLabel="Org Administrator"
          />
        </>
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route
          path="overview"
          element={
            <OrgOverview
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
              panelType="ORG"
              currentUser={user}
            />
          }
        />
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
        <Route path="prescription" element={<Prescription />} />
        <Route path="consent" element={<ConsentPostOpView />} />
        <Route path="chat" element={<ChatPage role="ORG" currentUser={user} />} />
        <Route path="billing" element={<BillingView currentUser={user} />} />
        <Route path="reports" element={<ReportsView />} />
        <Route path="inventory" element={<InventoryView />} />
        <Route path="*" element={<Navigate to="/org/overview" replace />} />
      </Routes>
      <NotificationPanel
        unreadMessages={unreadMessages}
        unreadEvents={unreadEvents}
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        userId={user?.id ?? user?.userId}
        role="ORG"
      />
    </WowDashLayout>
  );
}

