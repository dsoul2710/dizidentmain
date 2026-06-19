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
import HeaderProfile from "../../components/layout/HeaderProfile.jsx";
import { API_BASE_URL } from "../../config";
import api from "../../api/api";
import "../../assets/css/wowdash-users.css";
import ProviderOverview from "../provider/ProviderOverview.jsx";
import LabOrdersView from "../provider/LabOrdersView.jsx";
import BedsAllocationView from "../provider/BedsAllocationView.jsx";
import useNotifications from "../../hooks/useNotifications";

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
  const providerRoleLabel = providerType === "LAB" ? "Blood Lab" : providerType === "PHARMACY" ? "Pharmacy" : providerType === "BED_MANAGER" ? "Bed Manager" : "Service Provider";
  const [displayName, setDisplayName] = useState(user?.name || "Service Provider");
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const { unreadMessages, unreadEvents } = useNotifications(user, notificationPanelOpen);

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
          <HeaderProfile
            name={displayName}
            roleLabel={providerRoleLabel}
          />
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
