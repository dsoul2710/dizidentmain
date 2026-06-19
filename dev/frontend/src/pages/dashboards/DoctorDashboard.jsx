// src/pages/dashboards/DoctorDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import HeaderProfile from "../../components/layout/HeaderProfile.jsx";
import { formatDateDMY } from "../../utils/dateFormat";
import api from "../../api/api";
import DoctorOverview from "../doctor/DoctorOverview.jsx";
import DentalCarePage from "../doctor/DentalCarePage.jsx";
import useNotifications from "../../hooks/useNotifications";

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
  const [speciality, setSpeciality] = useState("Dentist");
  const [diagnosisPreviewText, setDiagnosisPreviewText] = useState("");
  const [treatmentPreviewText, setTreatmentPreviewText] = useState("");
  const [diagnosisPreviewOpen, setDiagnosisPreviewOpen] = useState(false);
  const [treatmentPreviewOpen, setTreatmentPreviewOpen] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const { unreadMessages, unreadEvents } = useNotifications(user, notificationPanelOpen);

  // Multi-clinic states
  const [clinics, setClinics] = useState([]);
  const [activeOrgId, setActiveOrgId] = useState(() => {
    const saved = localStorage.getItem("hms_active_org_id");
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const res = await api.get("/doctors/my-clinics");
        const list = res.data || [];
        setClinics(list);
        if (list.length > 0) {
          const savedId = localStorage.getItem("hms_active_org_id");
          const exists = list.some((c) => String(c.id) === String(savedId));
          if (!exists) {
            localStorage.setItem("hms_active_org_id", String(list[0].id));
            setActiveOrgId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load clinics for doctor", err);
      }
    };
    fetchClinics();
  }, []);

  const handleClinicChange = (id) => {
    localStorage.setItem("hms_active_org_id", String(id));
    setActiveOrgId(id);
  };

  useEffect(() => {
    const rawName = (user?.name || "").trim();
    setDisplayName(rawName);

    const userId = user?.id ?? user?.userId;
    if (!userId) return;

    let cancelled = false;
    const loadDoctorDetails = async () => {
      try {
        const res = await api.get("/doctors");
        const data = res.data;
        const match = (data || []).find(
          (d) => String(d.id) === String(userId) || String(d.userId) === String(userId)
        );
        if (!cancelled && match) {
          if (match.name) {
            setDisplayName(match.name);
          }
          if (match.speciality) {
            setSpeciality(match.speciality);
          }
        }
      } catch (err) {
        console.error("Failed to load doctor details", err);
      }
    };

    loadDoctorDetails();
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

      const res = await api.post("/visits", payload);
      const data = res.data;
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
    { type: "link", label: "Dental Care", to: "/doctor/dental-care", icon: "ri-service-line" },
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
              {clinics.length > 0 && (
                <select
                  className="form-select form-select-sm border-primary text-primary fw-semibold radius-8 ms-2"
                  style={{ width: "auto" }}
                  value={activeOrgId || ""}
                  onChange={(e) => handleClinicChange(Number(e.target.value))}
                >
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏥 {c.name}
                    </option>
                  ))}
                </select>
              )}
              <HeaderPatientSelector
                apiBaseUrl={API_BASE_URL}
                onPatientChange={setSelectedPatientId}
                doctorUserId={user?.userId ?? user?.id ?? null}
              />
              <button
                className="btn btn-primary btn-sm ms-2"
                onClick={handleCreateVisit}
                disabled={!selectedPatientId}
                title={!selectedPatientId ? "Select a patient first" : ""}
              >
                + New Visit
              </button>
            </>
          )}
          <HeaderProfile
            name={displayName && displayName.toLowerCase().startsWith("dr") ? displayName : `Dr. ${displayName || "Doctor"}`}
            roleLabel={speciality}
          />
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
      <Routes key={activeOrgId}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<DoctorOverview user={user} activeOrgId={activeOrgId} />} />
        <Route path="diagnosis" element={<DiagnosisView />} />
        <Route path="treatment" element={<TreatmentPlanView />} />
        <Route path="dental-care" element={<DentalCarePage />} />
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

