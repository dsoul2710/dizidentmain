import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "@/config";
import { formatDateDMY } from "@/shared/utils/dateFormat";

import OrgOverview from "@/features/org/pages/OrgOverview.jsx";
import PatientEntry from "@/features/patient/pages/PatientEntry.jsx";
import PatientAdd from "@/features/patient/pages/PatientAdd.jsx";
import DoctorEntry from "@/features/doctor/pages/DoctorEntry.jsx";
import ScheduleView from "@/features/schedule/pages/ScheduleView.jsx";
import BillingView from "@/features/billing/pages/BillingView.jsx";
import InventoryView from "@/features/inventory/pages/InventoryView.jsx";
import ReportsView from "@/features/reports/pages/ReportsView.jsx";
import RxSection from "@/features/clinical/components/rx/RxSection.jsx";
import TreatmentPlanView from "@/features/clinical/pages/TreatmentPlanView.jsx";
import Prescription from "@/shared/components/print/Prescription.jsx";
import ConsentPostOpView from "@/features/clinical/pages/ConsentPostOpView.jsx";
import LabEntryView from "@/features/inventory/pages/LabEntryView.jsx";
import VendorEntry from "@/features/inventory/pages/VendorEntry.jsx";
import ChatPage from "@/features/chat/pages/ChatPage.jsx";
import ChatBell from "@/shared/components/chat/ChatBell.jsx";
import NotificationPanel from "@/shared/components/chat/NotificationPanel.jsx";
import WowDashLayout from "@/shared/components/layout/WowDashLayout.jsx";
import HeaderProfile from "@/shared/components/layout/HeaderProfile.jsx";
import OrgSwitcher from "@/features/auth/components/OrgSwitcher.jsx";
import HeaderPatientSelector from "@/shared/components/layout/HeaderPatientSelector.jsx";
import useNotifications from "@/shared/hooks/useNotifications";
import UserManager from "@/shared/components/common/UserManager.jsx";

// Doctor specific
import DoctorOverview from "@/features/doctor/pages/DoctorOverview.jsx";
import DentalCarePage from "@/features/doctor/pages/DentalCarePage.jsx";

// Patient specific
import PatientOverviewPage from "@/features/patient/pages/PatientOverviewPage";
import PatientBillingPage from "@/features/patient/pages/PatientBillingPage";
import PatientReportsPage from "@/features/patient/pages/PatientReportsPage";
import PatientDocumentsPage from "@/features/patient/pages/PatientDocumentsPage";
import PatientSchedule from "@/features/patient/pages/PatientSchedulePage.jsx";

// Service Provider specific
import ProviderOverview from "@/features/provider/pages/ProviderOverview.jsx";
import LabOrdersView from "@/features/provider/pages/LabOrdersView.jsx";
import BedsAllocationView from "@/features/provider/pages/BedsAllocationView.jsx";
import GenericProviderPortalView from "@/features/provider/pages/GenericProviderPortalView.jsx";

// Super Admin specific
import SuperAdminOverview from "@/features/admin/pages/SuperAdminOverview.jsx";
import ManageOrganizations from "@/features/admin/pages/ManageOrganizations.jsx";
import ManageDoctors from "@/features/admin/pages/ManageDoctors.jsx";
import ManagePatients from "@/features/admin/pages/ManagePatients.jsx";
import ManageServiceProviders from "@/features/admin/pages/ManageServiceProviders.jsx";

// Helper for permission checking
export function hasPermission(user, moduleName, action = "view") {
  if (!user) return false;
  if (user.role === "SUPERADMIN" || user.role === "SUPER_ADMIN") return true;

  const perm = user.permissions?.find(p => p.moduleName === moduleName);
  if (!perm) return false;

  if (action === "view") return perm.canView;
  if (action === "edit") return perm.canEdit;
  if (action === "delete") return perm.canDelete;
  return false;
}

export default function UnifiedDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const { unreadMessages, unreadEvents } = useNotifications(user, notificationPanelOpen);

  const currentUserId = user?.id || user?.userId;

  // --- ORG Overview States ---
  const [overviewMetrics, setOverviewMetrics] = useState([]);
  const [scheduleToday, setScheduleToday] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  // --- PATIENT Overview States ---
  const [patientInfo, setPatientInfo] = useState(null);
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState("");
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [billingByVisit, setBillingByVisit] = useState({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [patientOverviewLoading, setPatientOverviewLoading] = useState(false);
  const [patientOverviewError, setPatientOverviewError] = useState("");
  const [doctorsById, setDoctorsById] = useState({});
  const [diagnosisByVisit, setDiagnosisByVisit] = useState({});
  const [visitDetails, setVisitDetails] = useState({
    examItems: {},
    treatmentPlans: {},
    loading: false,
  });
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const formatValue = (val) =>
    typeof val === "number" ? val.toLocaleString("en-IN") : val;

  // --- ORG Overview Loading ---
  useEffect(() => {
    if (user?.role !== "ORG") return;

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
  }, [user]);

  // --- PATIENT Overview Fetching logic ---
  useEffect(() => {
    if (user?.role !== "PATIENT" || !currentUserId) return;

    const loadPatient = async () => {
      try {
        const directRes = await fetch(`${API_BASE_URL}/patients/${currentUserId}`);
        if (directRes.ok) {
          const data = await directRes.json();
          setPatientInfo(data || null);
          return;
        }
        const res = await fetch(`${API_BASE_URL}/patients`);
        const data = await res.json();
        const match = (data || []).find(
          (p) => p.userId === currentUserId || p.id === currentUserId
        );
        setPatientInfo(match || null);
      } catch (err) {
        console.error("Failed to load patient profile", err);
        setPatientInfo(null);
      }
    };
    loadPatient();
  }, [user, currentUserId]);

  useEffect(() => {
    if (user?.role !== "PATIENT" || !patientInfo) return;

    const loadDoctors = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/doctors`);
        if (!res.ok) throw new Error("Doctors fetch failed");
        const data = await res.json();
        const assignedId =
          patientInfo?.assignedDoctorId ?? patientInfo?.assigned_doctor_id ?? null;
        const list =
          assignedId != null
            ? (data || []).filter(
              (doc) =>
                String(doc?.id) === String(assignedId) ||
                String(doc?.userId) === String(assignedId)
            )
            : data || [];
        const map = {};
        (list || []).forEach((doc) => {
          if (doc?.id != null) map[String(doc.id)] = doc.name || doc.fullName || "";
          if (doc?.userId != null) map[String(doc.userId)] = doc.name || doc.fullName || "";
        });
        setDoctorsById(map);
      } catch (err) {
        console.error("Failed to load doctors", err);
        setDoctorsById({});
      }
    };
    loadDoctors();
  }, [user, patientInfo]);

  useEffect(() => {
    if (user?.role !== "PATIENT" || !currentUserId) return;

    const loadVisits = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${currentUserId}/visits`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setVisits(list);
        if (list.length > 0) {
          setVisitId(String(list[0].id));
        }
      } catch (err) {
        console.error("Failed to load visits", err);
        setVisits([]);
      }
    };
    loadVisits();
  }, [user, currentUserId]);

  useEffect(() => {
    if (user?.role !== "PATIENT" || !currentUserId) return;

    const loadAppointments = async () => {
      setAppointmentsLoading(true);
      try {
        const today = new Date();
        const from = new Date(today);
        const to = new Date(today);
        from.setDate(from.getDate() - 90);
        to.setDate(to.getDate() + 90);
        const fmt = (d) => d.toISOString().slice(0, 10);
        const res = await fetch(
          `${API_BASE_URL}/appointments/range?from=${fmt(from)}&to=${fmt(to)}`
        );
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter(
          (a) => String(a.patientUserId) === String(currentUserId)
        );
        setAppointments(filtered);
      } catch (err) {
        console.error("Failed to load appointments", err);
        setAppointments([]);
      } finally {
        setAppointmentsLoading(false);
      }
    };
    loadAppointments();
  }, [user, currentUserId]);

  useEffect(() => {
    if (user?.role !== "PATIENT" || !visitId) {
      setPrescriptionData(null);
      return;
    }

    const loadRx = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/visits/${visitId}/prescriptions/latest`
        );
        if (!res.ok) {
          setPrescriptionData(null);
          return;
        }
        const data = await res.json();
        setPrescriptionData(data || null);
      } catch (err) {
        console.error("Failed to load prescription", err);
        setPrescriptionData(null);
      }
    };

    setPatientOverviewLoading(true);
    setPatientOverviewError("");
    Promise.allSettled([loadRx()]).finally(() => setPatientOverviewLoading(false));
  }, [user, visitId]);

  useEffect(() => {
    if (user?.role !== "PATIENT" || !visits.length) {
      setVisitDetails({ examItems: {}, treatmentPlans: {}, loading: false });
      setDiagnosisByVisit({});
      return;
    }

    const loadAllVisitDetails = async () => {
      setVisitDetails((prev) => ({ ...prev, loading: true }));
      try {
        const examEntries = await Promise.all(
          visits.map(async (v) => {
            try {
              const res = await fetch(`${API_BASE_URL}/visits/${v.id}/exam-items`);
              if (!res.ok) throw new Error("Exam fetch failed");
              const data = await res.json();
              return [String(v.id), Array.isArray(data) ? data : []];
            } catch (err) {
              console.error("Failed to load exam for visit", v.id, err);
              return [String(v.id), []];
            }
          })
        );

        const planEntries = await Promise.all(
          visits.map(async (v) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/visits/${v.id}/treatment-plan`
              );
              if (!res.ok) throw new Error("Plan fetch failed");
              const data = await res.json();
              return [String(v.id), data || null];
            } catch (err) {
              console.error("Failed to load plan for visit", v.id, err);
              return [String(v.id), null];
            }
          })
        );

        const diagnosisEntries = await Promise.all(
          visits.map(async (v) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/visits/${v.id}/diagnosis-detail`
              );
              if (!res.ok) throw new Error("Diagnosis fetch failed");
              const data = await res.json();
              return [String(v.id), data || null];
            } catch (err) {
              console.error("Failed to load diagnosis for visit", v.id, err);
              return [String(v.id), null];
            }
          })
        );

        setVisitDetails({
          examItems: Object.fromEntries(examEntries),
          treatmentPlans: Object.fromEntries(planEntries),
          loading: false,
        });
        setDiagnosisByVisit(Object.fromEntries(diagnosisEntries));
      } catch (err) {
        console.error("Error loading visit details", err);
        setVisitDetails({ examItems: {}, treatmentPlans: {}, loading: false });
        setDiagnosisByVisit({});
        setPatientOverviewError("Unable to load visit details.");
      }
    };

    loadAllVisitDetails();
  }, [user, visits]);

  useEffect(() => {
    const shouldLoadBilling = location.pathname.includes("/dashboard/billing");
    if (user?.role !== "PATIENT" || !visits.length || !shouldLoadBilling) {
      setBillingByVisit({});
      setBillingLoading(false);
      return;
    }

    const loadAllBilling = async () => {
      setBillingLoading(true);
      try {
        const entries = await Promise.all(
          visits.map(async (v) => {
            const vid = String(v.id);
            try {
              const res = await fetch(`${API_BASE_URL}/billing/visits/${vid}`);
              if (!res.ok) return [vid, null];
              const data = await res.json();
              return [vid, data || null];
            } catch (err) {
              console.error("Failed to load billing for visit", vid, err);
              return [vid, null];
            }
          })
        );
        setBillingByVisit(Object.fromEntries(entries));
      } catch (err) {
        console.error("Billing load error", err);
        setBillingByVisit({});
      } finally {
        setBillingLoading(false);
      }
    };

    loadAllBilling();
  }, [user, visits, location.pathname]);


  // --- DYNAMIC NAVIGATION MENU ITEMS ---
  const navItems = useMemo(() => {
    if (!user) return [];

    const items = [
      { type: "link", label: "Overview", to: "/dashboard/overview", end: true, icon: "ri-home-5-line" }
    ];

    const isSuperAdmin = user.role === "SUPERADMIN" || user.role === "SUPER_ADMIN";

    // Super Admin Admin links
    if (isSuperAdmin) {
      items.push({ type: "group", label: "Administration" });
      items.push({ type: "link", label: "Organizations", to: "/dashboard/organizations", icon: "ri-government-line" });
      items.push({ type: "link", label: "Doctors", to: "/dashboard/doctors", icon: "ri-user-heart-line" });
      items.push({ type: "link", label: "Patients", to: "/dashboard/patients-admin", icon: "ri-user-3-line" });
      items.push({ type: "link", label: "Service Providers", to: "/dashboard/service-providers", icon: "ri-customer-service-2-line" });
    }

    // Patient Directory / Org directories
    if (hasPermission(user, "PATIENTS", "view") && !isSuperAdmin) {
      items.push({ type: "group", label: "Patient Care" });
      items.push({ type: "link", label: "Patient Entry", to: "/dashboard/patients", icon: "ri-user-add-line" });

      if (user.role === "ORG") {
        items.push({ type: "link", label: "Doctor Entry", to: "/dashboard/doctor", icon: "ri-stethoscope-line" });
        items.push({ type: "link", label: "Lab Entry", to: "/dashboard/lab", icon: "ri-flask-line" });
        items.push({ type: "link", label: "Vendor Entry", to: "/dashboard/vendor", icon: "ri-store-2-line" });
      }

      if (user.role === "DOCTOR") {
        items.push({ type: "link", label: "Dental Care", to: "/dashboard/dental-care", icon: "ri-briefcase-line" });
      }
    }

    // Partner Service Provider Links
    if (user.role === "SERVICE_PROVIDER") {
      items.push({ type: "group", label: "Partner Portal" });
      if (hasPermission(user, "LAB_ORDERS_MODULE", "view")) {
        items.push({ type: "link", label: "Lab Orders", to: "/dashboard/lab-orders", icon: "ri-flask-line" });
      }
      if (hasPermission(user, "BED_ALLOCATION_MODULE", "view")) {
        items.push({ type: "link", label: "Beds Allocation", to: "/dashboard/beds", icon: "ri-hotel-bed-line" });
      }
      if (hasPermission(user, "PHARMACY_ORDERS_MODULE", "view")) {
        items.push({ type: "link", label: "Pharmacy Orders", to: "/dashboard/pharmacy-orders", icon: "ri-capsule-line" });
      }
      if (hasPermission(user, "RADIOLOGY_MODULE", "view")) {
        items.push({ type: "link", label: "Radiology Portal", to: "/dashboard/radiology", icon: "ri-contrast-drop-2-line" });
      }
      if (hasPermission(user, "PATHOLOGY_MODULE", "view")) {
        items.push({ type: "link", label: "Pathology Portal", to: "/dashboard/pathology", icon: "ri-microscope-line" });
      }
      if (hasPermission(user, "BLOOD_BANK_MODULE", "view")) {
        items.push({ type: "link", label: "Blood Bank", to: "/dashboard/blood-bank", icon: "ri-drop-line" });
      }
      if (hasPermission(user, "AMBULANCE_MODULE", "view")) {
        items.push({ type: "link", label: "Ambulance Dispatch", to: "/dashboard/ambulance", icon: "ri-car-line" });
      }
      if (hasPermission(user, "ORTHODONTIC_LAB_MODULE", "view")) {
        items.push({ type: "link", label: "Orthodontic Orders", to: "/dashboard/orthodontic-lab", icon: "ri-shield-cross-line" });
      }
    }

    // Patient Specific Schedule Link
    if (user.role === "PATIENT") {
      items.push({ type: "group", label: "Patient Portal" });
      items.push({ type: "link", label: "My Schedule", to: "/dashboard/patient-schedule", icon: "ri-calendar-schedule-line" });
      items.push({ type: "link", label: "Prescriptions", to: "/dashboard/rx", icon: "ri-file-list-3-line" });
      items.push({ type: "link", label: "Billing & Invoices", to: "/dashboard/billing", icon: "ri-wallet-3-line" });
      items.push({ type: "link", label: "My Documents", to: "/dashboard/consent", icon: "ri-file-text-line" });
    }

    // Clinical Schedules
    if ((hasPermission(user, "APPOINTMENTS", "view") || user.role === "DOCTOR" || user.role === "ORG") && user.role !== "PATIENT" && !isSuperAdmin) {
      items.push({ type: "group", label: "Clinical" });
      items.push({ type: "link", label: "Appointments", to: "/dashboard/appointments", icon: "ri-calendar-schedule-line" });
      items.push({ type: "link", label: "Treatment Plan", to: "/dashboard/treatment-plan", icon: "ri-file-list-3-line" });
      items.push({ type: "link", label: "Prescriptions", to: "/dashboard/rx", icon: "ri-capsule-line" });
      items.push({ type: "link", label: "Consent & Guide", to: "/dashboard/consent", icon: "ri-file-text-line" });
    }

    // Finance & billing
    if (hasPermission(user, "BILLING_FINANCE", "view") && (user.role === "ORG" || user.role === "DOCTOR" || user.role === "SERVICE_PROVIDER")) {
      items.push({ type: "group", label: "Finance" });
      items.push({ type: "link", label: "Billing", to: "/dashboard/billing", icon: "ri-wallet-3-line" });
      if (user.role === "ORG" || user.role === "DOCTOR") {
        items.push({ type: "link", label: "Reports", to: "/dashboard/reports", icon: "ri-bar-chart-2-line" });
      }
    }

    // Inventory
    if (hasPermission(user, "INVENTORY", "view") && (user.role === "ORG" || user.role === "DOCTOR" || user.role === "SERVICE_PROVIDER")) {
      items.push({ type: "group", label: "Inventory" });
      items.push({ type: "link", label: "Inventory", to: "/dashboard/inventory", icon: "ri-archive-line" });
    }

    // Security - User management
    if (hasPermission(user, "USER_MANAGEMENT", "view") && (isSuperAdmin || user.role === "ORG")) {
      items.push({ type: "group", label: "Security" });
      items.push({ type: "link", label: "User Manager", to: "/dashboard/users", icon: "ri-user-settings-line" });
    }

    // Chat Support
    if (!isSuperAdmin) {
      items.push({ type: "group", label: "Communication" });
      items.push({ type: "link", label: "Chat Support", to: "/dashboard/chat", icon: "ri-chat-1-line" });
    }

    return items;
  }, [user]);

  // Brand and profile labels
  const getBrandDetails = () => {
    if (user?.role === "SUPERADMIN" || user?.role === "SUPER_ADMIN") return { brand: "Super Admin", roleLabel: "Super Admin Portal" };
    if (user?.role === "ORG") return { brand: "Clinic Hub", roleLabel: "Clinic Administrator" };
    if (user?.role === "DOCTOR") return { brand: "Doctor Portal", roleLabel: "Clinical Doctor" };
    if (user?.role === "SERVICE_PROVIDER") return { brand: "Partner Portal", roleLabel: "Service Partner" };
    return { brand: "Patient Portal", roleLabel: "Patient" };
  };

  const { brand, roleLabel } = getBrandDetails();

  return (
    <WowDashLayout
      brandLabel={brand}
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search files, records..."
      headerActions={
        <>
          {(user?.role === "DOCTOR" || user?.role === "ORG") && (
            <HeaderPatientSelector
              apiBaseUrl={API_BASE_URL}
              doctorUserId={user?.role === "DOCTOR" ? currentUserId : null}
            />
          )}
          {!user?.role?.includes("SUPER") && (
            <ChatBell
              userId={currentUserId}
              role={user?.role || "PATIENT"}
              onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
            />
          )}
          <OrgSwitcher
            organizationIds={user?.organizationIds}
            organizationRoles={user?.organizationRoles}
            userRole={user?.role}
          />
          <HeaderProfile
            name={user?.name || "User"}
            roleLabel={roleLabel}
          />
        </>
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />

        {/* Dynamic Overview mapping */}
        <Route
          path="overview"
          element={
            user?.role === "SUPERADMIN" || user?.role === "SUPER_ADMIN" ? (
              <SuperAdminOverview />
            ) : user?.role === "ORG" ? (
              <OrgOverview
                overviewMetrics={overviewMetrics}
                formatValue={formatValue}
                scheduleToday={scheduleToday}
                recentActivity={recentActivity}
                loading={overviewLoading}
              />
            ) : user?.role === "DOCTOR" ? (
              <DoctorOverview />
            ) : user?.role === "SERVICE_PROVIDER" ? (
              <ProviderOverview user={user} />
            ) : (
              <PatientOverviewPage
                patient={patientInfo}
                visits={visits}
                examItemsByVisit={visitDetails.examItems}
                planByVisit={visitDetails.treatmentPlans}
                diagnosisByVisit={diagnosisByVisit}
                doctorsById={doctorsById}
                loading={patientOverviewLoading || visitDetails.loading}
                error={patientOverviewError}
              />
            )
          }
        />

        {/* Dynamic Route Guards for Modules */}
        {hasPermission(user, "PATIENTS", "view") && user?.role !== "SUPERADMIN" && user?.role !== "SUPER_ADMIN" && (
          <>
            <Route path="patients" element={<PatientEntry currentUser={user} />} />
            <Route path="patients/add" element={<PatientAdd currentUser={user} />} />
          </>
        )}

        {user?.role === "ORG" && (
          <>
            <Route path="doctor" element={<DoctorEntry />} />
            <Route path="lab" element={<LabEntryView />} />
            <Route path="vendor" element={<VendorEntry />} />
          </>
        )}

        {user?.role === "DOCTOR" && (
          <Route path="dental-care" element={<DentalCarePage />} />
        )}

        {user?.role === "SERVICE_PROVIDER" && (
          <>
            {hasPermission(user, "LAB_ORDERS_MODULE", "view") && (
              <Route path="lab-orders" element={<LabOrdersView />} />
            )}
            {hasPermission(user, "BED_ALLOCATION_MODULE", "view") && (
              <Route path="beds" element={<BedsAllocationView />} />
            )}
            {hasPermission(user, "PHARMACY_ORDERS_MODULE", "view") && (
              <Route path="pharmacy-orders" element={<GenericProviderPortalView type="PHARMACY" />} />
            )}
            {hasPermission(user, "RADIOLOGY_MODULE", "view") && (
              <Route path="radiology" element={<GenericProviderPortalView type="RADIOLOGY" />} />
            )}
            {hasPermission(user, "PATHOLOGY_MODULE", "view") && (
              <Route path="pathology" element={<GenericProviderPortalView type="PATHOLOGY" />} />
            )}
            {hasPermission(user, "BLOOD_BANK_MODULE", "view") && (
              <Route path="blood-bank" element={<GenericProviderPortalView type="BLOOD_BANK" />} />
            )}
            {hasPermission(user, "AMBULANCE_MODULE", "view") && (
              <Route path="ambulance" element={<GenericProviderPortalView type="AMBULANCE" />} />
            )}
            {hasPermission(user, "ORTHODONTIC_LAB_MODULE", "view") && (
              <Route path="orthodontic-lab" element={<GenericProviderPortalView type="ORTHODONTIC_LAB" />} />
            )}
          </>
        )}

        {user?.role === "PATIENT" && (
          <>
            <Route
              path="patient-schedule"
              element={
                <PatientSchedule
                  visits={visits}
                  visitId={visitId}
                  onVisitChange={setVisitId}
                  appointments={appointments}
                  loading={appointmentsLoading}
                />
              }
            />
            <Route
              path="billing"
              element={
                <PatientBillingPage
                  patient={patientInfo}
                  visits={visits}
                  billingByVisit={billingByVisit}
                  billingLoading={billingLoading}
                />
              }
            />
          </>
        )}

        {(hasPermission(user, "APPOINTMENTS", "view") || user?.role === "DOCTOR" || user?.role === "ORG") && user?.role !== "PATIENT" && user?.role !== "SUPERADMIN" && user?.role !== "SUPER_ADMIN" && (
          <>
            <Route
              path="appointments"
              element={
                <ScheduleView
                  apiBaseUrl={API_BASE_URL}
                  panelType={user?.role}
                  currentUser={user}
                />
              }
            />
            <Route
              path="treatment-plan"
              element={<TreatmentPlanView />}
            />
            <Route
              path="rx"
              element={
                <RxSection
                  apiBaseUrl={API_BASE_URL}
                  panelType={user?.role}
                  currentUser={user}
                />
              }
            />
            <Route path="prescription" element={<Prescription />} />
            <Route path="consent" element={<ConsentPostOpView />} />
          </>
        )}

        {user?.role === "PATIENT" && (
          <>
            <Route
              path="rx"
              element={
                <PatientReportsPage
                  prescription={prescriptionData}
                  visits={visits}
                  visitId={visitId}
                  onVisitChange={setVisitId}
                  patient={patientInfo}
                />
              }
            />
            <Route
              path="consent"
              element={
                <PatientDocumentsPage
                  patient={patientInfo}
                  visitId={visitId}
                  patientUserId={currentUserId}
                />
              }
            />
          </>
        )}

        {hasPermission(user, "BILLING_FINANCE", "view") && (user?.role === "ORG" || user?.role === "DOCTOR" || user?.role === "SERVICE_PROVIDER") && (
          <>
            <Route path="billing" element={<BillingView currentUser={user} />} />
            {(user?.role === "ORG" || user?.role === "DOCTOR") && (
              <Route path="reports" element={<ReportsView />} />
            )}
          </>
        )}

        {hasPermission(user, "INVENTORY", "view") && (user?.role === "ORG" || user?.role === "DOCTOR" || user?.role === "SERVICE_PROVIDER") && (
          <Route path="inventory" element={<InventoryView />} />
        )}

        {hasPermission(user, "USER_MANAGEMENT", "view") && (user?.role === "SUPERADMIN" || user?.role === "SUPER_ADMIN" || user?.role === "ORG") && (
          <Route path="users" element={<UserManager currentUser={user} />} />
        )}

        {user?.role === "SUPERADMIN" || user?.role === "SUPER_ADMIN" ? (
          <>
            <Route path="organizations" element={<ManageOrganizations />} />
            <Route path="doctors" element={<ManageDoctors />} />
            <Route path="patients-admin" element={<ManagePatients />} />
            <Route path="service-providers" element={<ManageServiceProviders />} />
          </>
        ) : null}

        {user?.role !== "SUPERADMIN" && user?.role !== "SUPER_ADMIN" && (
          <Route
            path="chat"
            element={
              <ChatPage
                role={user?.role}
                currentUser={user}
                assignedDoctorId={
                  patientInfo?.assignedDoctorId ?? patientInfo?.assigned_doctor_id
                }
              />
            }
          />
        )}

        <Route path="*" element={<Navigate to="overview" replace />} />
      </Routes>

      {!user?.role?.includes("SUPER") && (
        <NotificationPanel
          unreadMessages={unreadMessages}
          unreadEvents={unreadEvents}
          isOpen={notificationPanelOpen}
          onClose={() => setNotificationPanelOpen(false)}
          userId={currentUserId}
          role={user?.role}
        />
      )}
    </WowDashLayout>
  );
}
