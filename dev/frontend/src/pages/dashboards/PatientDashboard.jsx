// src/pages/dashboards/PatientDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../config";
import { formatDateDMY } from "../../utils/dateFormat";
import PatientOverviewPage from "../patient/PatientOverviewPage";
import PatientBillingPage from "../patient/PatientBillingPage";
import VisitPicker from "../patient/VisitPicker";
import PatientReportsPage from "../patient/PatientReportsPage";
import PatientDocumentsPage from "../patient/PatientDocumentsPage";
import ChatPage from "../chat/ChatPage.jsx";
import ChatBell from "../../components/chat/ChatBell.jsx";
import NotificationPanel from "../../components/chat/NotificationPanel.jsx";
import WowDashLayout from "../../components/layout/WowDashLayout.jsx";
import HeaderProfile from "../../components/layout/HeaderProfile.jsx";
import PatientSchedule from "../patient/PatientSchedulePage.jsx";
import useNotifications from "../../hooks/useNotifications";

export default function PatientDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [patientInfo, setPatientInfo] = useState(null);
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState("");
  const [prescription, setPrescription] = useState(null);
  const [billingByVisit, setBillingByVisit] = useState({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [doctorsById, setDoctorsById] = useState({});
  const [diagnosisByVisit, setDiagnosisByVisit] = useState({});
  const [visitDetails, setVisitDetails] = useState({
    examItems: {},
    treatmentPlans: {},
    loading: false,
  });
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const { unreadMessages, unreadEvents } = useNotifications(user, notificationPanelOpen);

  const currentUserId = user?.id || user?.userId;

  useEffect(() => {
    const jotformScript = {
      id: "patient-chatbot-jotform",
      src: "https://cdn.jotfor.ms/agent/embedjs/019b4a9ebee879d7884b35d5a3bf3eac5f3d/embed.js",
      host: "jotfor.ms",
    };
    const legacyNoupeScript = {
      id: "patient-chatbot-noupe",
      host: "noupe.com",
    };

    const setIframeVisibility = (host, visible) => {
      document.querySelectorAll(`iframe[src*="${host}"]`).forEach((el) => {
        el.style.display = visible ? "" : "none";
      });
    };

    const removeLegacy = () => {
      document
        .querySelectorAll(`script[src*="${legacyNoupeScript.host}"]`)
        .forEach((el) => el.remove());
      setIframeVisibility(legacyNoupeScript.host, false);
    };

    removeLegacy();

    const alreadyLoaded =
      window.__patientChatbotLoaded || document.getElementById(jotformScript.id);

    if (!alreadyLoaded) {
      const tag = document.createElement("script");
      tag.id = jotformScript.id;
      tag.src = jotformScript.src;
      tag.async = true;
      document.body.appendChild(tag);
      window.__patientChatbotLoaded = true;
    }

    setIframeVisibility(jotformScript.host, true);

    return () => {
      setIframeVisibility(jotformScript.host, false);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
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
        console.error("Failed to load patient list", err);
        setPatientInfo(null);
      }
    };
    loadPatient();
  }, [currentUserId]);





  useEffect(() => {
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
  }, [patientInfo?.assignedDoctorId, patientInfo?.assigned_doctor_id]);

  useEffect(() => {
    if (!currentUserId) return;
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
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
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
  }, [currentUserId]);

  useEffect(() => {
    const shouldLoadRx = location.pathname.includes("/patient/reports");
    if (!visitId || !shouldLoadRx) {
      setPrescription(null);
      return;
    }

    const loadRx = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/visits/${visitId}/prescriptions/latest`
        );
        if (!res.ok) {
          setPrescription(null);
          return;
        }
        const data = await res.json();
        setPrescription(data || null);
      } catch (err) {
        console.error("Failed to load prescription", err);
        setPrescription(null);
      }
    };

    setOverviewLoading(true);
    setOverviewError("");
    Promise.allSettled([loadRx()]).finally(() => setOverviewLoading(false));
  }, [visitId, location.pathname]);

  // Load exam items + treatment plans for all visits (for overview)
  useEffect(() => {
    if (!visits.length) {
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
        setOverviewError((prev) => prev || "Unable to load visit details.");
      }
    };

    loadAllVisitDetails();
  }, [visits]);

  // Load billing for all visits so the payment page can combine them
  useEffect(() => {
    const shouldLoadBilling = location.pathname.includes("/patient/payment");
    if (!visits.length || !shouldLoadBilling) {
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
              if (!res.ok) {
                return [vid, null];
              }
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
  }, [visits, location.pathname]);

  const navItems = [
    { type: "link", label: "My Profile", to: "/patient/overview", end: true, icon: "ri-user-line" },
    { type: "link", label: "My Payments", to: "/patient/payment", icon: "ri-wallet-3-line" },
    { type: "link", label: "Appointment Schedule", to: "/patient/schedule", icon: "ri-calendar-2-line" },
    { type: "link", label: "My Medicines", to: "/patient/reports", icon: "ri-capsule-line" },
    { type: "link", label: "My Documents", to: "/patient/mydocuments", icon: "ri-file-text-line" },
    { type: "link", label: "Chat", to: "/patient/chat", icon: "ri-chat-1-line" },
  ];

  return (
    <WowDashLayout
      brandLabel="Patient Portal"
      navItems={navItems}
      onLogout={onLogout}
      searchPlaceholder="Search visits, medicines, payments"
      headerActions={
        <>
        
          <ChatBell
            userId={currentUserId}
            role={user?.role || "PATIENT"}
            onClick={() => setNotificationPanelOpen(!notificationPanelOpen)}
          />
          <HeaderProfile
            name={patientInfo?.name || user?.name || "User"}
            roleLabel="Patient"
          />
        </>
      }
    >
      <Routes>
        <Route index element={<Navigate to="overview" replace />} />
        <Route
          path="overview"
          element={
            <PatientOverviewPage
              patient={patientInfo}
              visits={visits}
              examItemsByVisit={visitDetails.examItems}
              planByVisit={visitDetails.treatmentPlans}
              diagnosisByVisit={diagnosisByVisit}
              doctorsById={doctorsById}
              loading={overviewLoading || visitDetails.loading}
              error={overviewError}
            />
          }
        />
        <Route
          path="payment"
          element={
            <PatientBillingPage
              patient={patientInfo}
              visits={visits}
              billingByVisit={billingByVisit}
              billingLoading={billingLoading}
            />
          }
        />
        <Route
          path="schedule"
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
          path="reports"
          element={
            <PatientReportsPage
              prescription={prescription}
              visits={visits}
              visitId={visitId}
              onVisitChange={setVisitId}
              patient={patientInfo}
            />
          }
        />
        <Route
          path="mydocuments"
          element={
            <PatientDocumentsPage
              patient={patientInfo}
              visitId={visitId}
              patientUserId={currentUserId}
            />
          }
        />
        <Route
          path="chat"
          element={
            <ChatPage
              role="PATIENT"
              currentUser={user}
              assignedDoctorId={
                patientInfo?.assignedDoctorId ?? patientInfo?.assigned_doctor_id
              }
            />
          }
        />
        <Route path="*" element={<Navigate to="/patient/overview" replace />} />
      </Routes>
      <NotificationPanel
        unreadMessages={unreadMessages}
        unreadEvents={unreadEvents}
        isOpen={notificationPanelOpen}
        onClose={() => setNotificationPanelOpen(false)}
        userId={currentUserId}
        role="PATIENT"
      />
    </WowDashLayout>
  );
}


