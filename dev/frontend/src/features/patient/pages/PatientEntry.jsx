// src/pages/PatientEntry.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "@/api/client";
import { API_BASE_URL } from "@/config";
import { formatDateDMY } from "@/shared/utils/dateFormat";
import SourceOrgBadge from "@/shared/components/attribution/SourceOrgBadge";
import "@/assets/css/wowdash-users.css";
import { useNavigate } from "react-router-dom";

const VISIT_STORAGE_KEY = "clinic_visits";
const APPOINTMENT_STORAGE_KEY = "clinic_appointments";

// ---- Helpers: Visits (local cache) ----
function loadVisits() {
  try {
    const raw = localStorage.getItem(VISIT_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveVisits(list) {
  try {
    localStorage.setItem(VISIT_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Unable to save visits", e);
  }
}

// ---- Helpers: Appointments (local) ----
function loadAppointments() {
  try {
    const raw = localStorage.getItem(APPOINTMENT_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveAppointments(list) {
  try {
    localStorage.setItem(APPOINTMENT_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Unable to save appointments", e);
  }
}

export default function PatientEntry({ currentUser }) {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const ageInputRef = useRef(null);
  const idFileRef = useRef(null);
  const reportFileRef = useRef(null);
  const [visitPanel, setVisitPanel] = useState({
    patientId: null,
    patientName: "",
    patientMobile: "",
    visits: [],
    appointments: [],
  });
  const [editingVisit, setEditingVisit] = useState(null);
  const [visitForm, setVisitForm] = useState({
    doctorUserId: "",
    visitType: "",
    chiefComplaint: "",
    notes: "",
    status: "",
  });
  const [editingPatient, setEditingPatient] = useState(null);
  const [idFileSelected, setIdFileSelected] = useState(null);
  const [reportFilesSelected, setReportFilesSelected] = useState([]);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [serverPaging, setServerPaging] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [patientForm, setPatientForm] = useState({
    name: "",
    mobile: "",
    password: "",
    dob: "",
    age: "",
    gender: "",
    city: "",
    referred_by: "",
    allergies: "",
    medical_hx: "",
    primary_complaint: "",
    assigned_doctor_id: "",
  });

  // NEW STATE
const [doctorsList, setDoctorsList] = useState([]);
  const getAssignedDoctorName = (patient) => {
    const id =
      patient?.assigned_doctor_id ??
      patient?.assignedDoctorId ??
      patient?.assignedDoctor?.id ??
      patient?.assignedDoctor?.userId;
    if (id == null) {
      return (
        patient?.assigned_doctor_name ??
        patient?.assignedDoctorName ??
        patient?.assignedDoctor?.name ??
        "-"
      );
    }
    const match = doctorsList.find((doc) => String(doc.id) === String(id));
    return (
      match?.name ??
      patient?.assigned_doctor_name ??
      patient?.assignedDoctorName ??
      patient?.assignedDoctor?.name ??
      "-"
    );
  };

useEffect(() => {
  const fetchPatients = async () => {
    try {
      const res = await api.get("/patients", {
        params: {
          page,
          pagesize: pageSize,
          search: patientSearch || undefined,
        },
      });
      const data = res.data;
      if (Array.isArray(data)) {
        setServerPaging(false);
        setPatients(data || []);
        setTotalItems(data.length);
        setTotalPages(1);
      } else {
        setServerPaging(true);
        setPatients(data.items || []);
        setTotalItems(Number(data.totalItems || 0));
        setTotalPages(Number(data.totalPages || 1));
      }
    } catch (err) {
      console.error("Error loading patients", err);
      alert("Unable to load patients from server.");
    }
  };

  fetchPatients();
}, [page, pageSize, patientSearch, refreshTick]);

useEffect(() => {
  const fetchDoctors = async () => {
    try {
      const res = await api.get("/doctors");
      setDoctorsList(res.data || []);
    } catch (err) {
      console.error("Error loading doctors", err);
      alert("Unable to load doctors from server.");
    }
  };

  fetchDoctors();
}, []);

  const openEditPatient = (patient) => {
    if (!patient) return;
    setEditingPatient(patient);
    setShowPatientModal(true);
    setPatientForm({
      name: patient.name || "",
      mobile: patient.mobile || "",
      password: "",
      dob: patient.dob || "",
      age: patient.age ?? "",
      gender: patient.gender || "",
      city: patient.city || "",
      referred_by: patient.referred_by ?? patient.referredBy ?? "",
      allergies: patient.allergies || "",
      medical_hx: patient.medical_hx ?? patient.medicalHistory ?? "",
      primary_complaint: patient.primary_complaint ?? patient.primaryComplaint ?? "",
      assigned_doctor_id:
        patient.assigned_doctor_id ??
        patient.assignedDoctorId ??
        "",
    });
    if (ageInputRef.current) {
      ageInputRef.current.value =
        patient.age != null ? String(patient.age) : "";
    }
  };

  const openNewPatientModal = () => {
    setEditingPatient(null);
    resetPatientForm();
    setShowPatientModal(true);
  };

  const closePatientModal = () => {
    setShowPatientModal(false);
    setEditingPatient(null);
    resetPatientForm();
  };

  const resetPatientForm = () => {
    setPatientForm({
      name: "",
      mobile: "",
      password: "",
      dob: "",
      age: "",
      gender: "",
      city: "",
      referred_by: "",
      allergies: "",
      medical_hx: "",
      primary_complaint: "",
      assigned_doctor_id: "",
    });
    if (ageInputRef.current) ageInputRef.current.value = "";
    if (idFileRef.current) idFileRef.current.value = "";
    if (reportFileRef.current) reportFileRef.current.value = "";
    setIdFileSelected(null);
    setReportFilesSelected([]);
  };

  const handleUpdatePatient = async () => {
    if (!editingPatient) return;
    const userId = editingPatient.userId ?? editingPatient.id;
    if (!userId) {
      alert("Cannot update patient: missing user id.");
      return;
    }

    const name = (patientForm.name || "").trim();
    const rawMobile = String(patientForm.mobile || "").trim();
    const mobile = rawMobile.replace(/\D/g, "");
    if (!name) {
      alert("Please enter patient name.");
      return;
    }
    if (mobile.length !== 10) {
      alert("Enter a valid 10-digit mobile number.");
      return;
    }

    const payload = {
      name,
      mobile,
      password: patientForm.password ? patientForm.password : null,
      dob: patientForm.dob || null,
      age: patientForm.age !== "" ? Number(patientForm.age) : null,
      gender: patientForm.gender || null,
      city: patientForm.city || null,
      referred_by: patientForm.referred_by || null,
      allergies: patientForm.allergies || null,
      medical_hx: patientForm.medical_hx || null,
      primary_complaint: patientForm.primary_complaint || null,
      assigned_doctor_id: patientForm.assigned_doctor_id
        ? Number(patientForm.assigned_doctor_id)
        : null,
    };

    try {
      const res = await api.put(`/patients/${userId}`, payload);
      const updated = res.data;

      const idFile =
        idFileSelected || idFileRef.current?.files?.[0] || null;
      const reportFiles =
        reportFilesSelected.length > 0
          ? reportFilesSelected
          : Array.from(reportFileRef.current?.files || []);
      try {
        if (idFile) {
          await uploadIdFile(userId, idFile);
        }
        if (reportFiles.length) {
          await uploadReportFiles(userId, reportFiles);
        }
      } catch (fileErr) {
        console.error("File upload error", fileErr);
        alert("Patient updated, but file upload failed. You can retry later.");
      }

      setPatients((prev) =>
        prev.map((p) =>
          String(p.userId ?? p.id) === String(updated.userId ?? updated.id)
            ? {
                ...updated,
                hasIdFile: idFile ? true : updated.hasIdFile,
                hasReportFile: reportFiles.length ? true : updated.hasReportFile,
              }
            : p
        )
      );
      setEditingPatient(null);
      resetPatientForm();
      setShowPatientModal(false);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error updating patient", err);
      alert("Unable to update patient. Please try again.");
    }
  };


  // ---- New Visit for existing patient (Repeat Patient) ----
  const handleCreateVisit = async (patient) => {
    try {
      if (!patient.userId) {
        console.warn("patient.userId is missing; check /patients API DTO.");
        alert("Cannot create visit: missing patient user id in response.");
        return;
      }

      const payload = {
        patientUserId: patient.userId, // USER table id
        doctorUserId: null, // later: currentUser.id
        visitType: "FOLLOWUP",
        chiefComplaint: patient.primary_complaint || "",
        notes: "",
        createdByUserId: currentUser?.id ?? currentUser?.userId ?? null,
      };

      const res = await api.post("/visits", payload); // POST /api/visits
      const savedVisit = res.data;

      const visits = loadVisits();
      const newVisit = {
        id: savedVisit.id,
        patientId: patient.userId, // UserDetails id for UI
        patientName: patient.name,
        mobile: patient.mobile,
        createdAt: savedVisit.visitDate || new Date().toISOString(),
        reason: savedVisit.chiefComplaint || patient.primary_complaint || "",
        status: savedVisit.status || "OPEN",
      };

      const updatedVisits = [newVisit, ...visits];
      saveVisits(updatedVisits);

      try {
        localStorage.setItem("active_patient_id", String(patient.userId));
        localStorage.setItem("active_patient_name", patient.name);
        localStorage.setItem("active_visit_id", String(savedVisit.id));
      } catch (e) {
        console.warn("Unable to set active patient/visit", e);
      }

      alert(
        `New visit created for ${patient.name}.\nVisit ID: ${savedVisit.id}\nYou can now continue examination, treatment, Rx, billing etc. for this visit.`
      );
    } catch (err) {
      console.error("Error creating visit", err);
      alert("Unable to create visit. Please try again.");
    }
  };

  // ---- Show visits + appointments for a patient (backend visits + local appointments) ----
  const handleViewVisitsAndAppointments = async (patient) => {
    try {
      if (!patient.userId) {
        console.warn("patient.userId is missing; check /patients API DTO.");
        alert("Cannot load visits: missing patient user id in response.");
        return;
      }

      const patientUserId = patient.userId;

      const res = await api.get(`/patients/${patientUserId}/visits`); // GET /api/patients/{userId}/visits
      const apiVisits = Array.isArray(res.data) ? res.data : [];

      const visits = apiVisits.map((v) => ({
        id: v.id,
        patientId: patient.userId,
        patientName: patient.name,
        mobile: patient.mobile,
        createdAt: v.visitDate,
        reason: v.chiefComplaint || "",
        status: v.status || "OPEN",
        visitType: v.visitType || "",
        notes: v.notes || "",
        doctorUserId: v.doctorUserId || null,
        doctorName: v.doctorName || "",
      }));

      const allAppointments = loadAppointments();
      const appointments = allAppointments.filter(
        (a) => a.patientId === patient.userId
      );

      setVisitPanel({
        patientId: patient.userId,
        patientName: patient.name,
        patientMobile: patient.mobile,
        visits,
        appointments,
      });
      setEditingVisit(null);
    } catch (err) {
      console.error("Error loading visits", err);
      alert("Unable to load visits from server.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingPatient) {
      await handleUpdatePatient();
      return;
    }

    const name = (patientForm.name || "").trim();
    const rawMobile = String(patientForm.mobile || "").trim();
    const mobile = rawMobile.replace(/\D/g, "");
    if (!name) {
      alert("Please enter patient name.");
      return;
    }
    if (mobile.length !== 10) {
      alert("Enter a valid 10-digit mobile number.");
      return;
    }

    const requestBody = {
      name,
      mobile,
      password: patientForm.password || null,
      dob: patientForm.dob || null,
      age: patientForm.age !== "" ? Number(patientForm.age) : null,
      gender: patientForm.gender || null,
      city: patientForm.city || null,
      referred_by: patientForm.referred_by || null,
      allergies: patientForm.allergies || null,
      medical_hx: patientForm.medical_hx || null,
      primary_complaint: patientForm.primary_complaint || null,
      assigned_doctor_id: patientForm.assigned_doctor_id
        ? Number(patientForm.assigned_doctor_id)
        : null,
    };

    try {
      // 1) Save patient basic data (JSON) --- returns savedPatient with id
      const res = await api.post("/patients", requestBody); // POST /api/patients
      const savedPatient = res.data;

      // 2) Now pick the files directly from the form element
      const idFile =
        idFileSelected || idFileRef.current?.files?.[0] || null;
      const reportFiles =
        reportFilesSelected.length > 0
          ? reportFilesSelected
          : Array.from(reportFileRef.current?.files || []);

      // 3) Upload files if present
      try {
        if (idFile) {
          await uploadIdFile(savedPatient.userId, idFile);
        }
        if (reportFiles.length) {
          await uploadReportFiles(savedPatient.userId, reportFiles);
        }
      } catch (fileErr) {
        console.error("File upload error", fileErr);
        // optional: alert but don't block main save
        alert("Patient saved, but file upload failed. You can retry later.");
      }

      // 4) Update list
      setPatients((prev) => [savedPatient, ...prev]);

      alert("Patient & files saved to server. You can now create visits.");
      resetPatientForm();
      setShowPatientModal(false);
      setPage(1);
      setRefreshTick((t) => t + 1);
    } catch (err) {
      console.error("Error saving patient", err);
      alert("Unable to save patient. Please try again.");
    }
  };


  // --- REAL delete using existing backend delete patient API
  const handleDelete = async (patient) => {
    if (
      !window.confirm(
        `Delete patient "${patient.name}" and related data from server?`
      )
    ) {
      return;
    }

    try {
      // assuming existing API: DELETE /api/patients/{id}
      await api.delete(`/patients/${patient.userId}`);

      // Remove from UI list
      setPatients((prev) =>
        prev.filter(
          (p) =>
            String(p.userId ?? p.id) !== String(patient.userId ?? patient.id)
        )
      );
      setRefreshTick((t) => t + 1);

      // Also clean local visits & appointments for this patient
      const visits = loadVisits().filter((v) => v.patientId !== patient.userId);
      saveVisits(visits);

      const appointments = loadAppointments().filter(
        (a) => a.patientId !== patient.userId
      );
      saveAppointments(appointments);

      // If current panel is showing this patient, close it
      if (visitPanel.patientId === patient.userId) {
        setVisitPanel({
          patientId: null,
          patientName: "",
          visits: [],
          appointments: [],
        });
      }

      alert("Patient deleted successfully.");
    } catch (err) {
      console.error("Error deleting patient", err);
      alert("Unable to delete patient. Please try again.");
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return (
        formatDateDMY(d) +
        " " +
        d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch {
      return iso;
    }
  };

  const openEditVisit = (visit) => {
    setEditingVisit(visit);
    setVisitForm({
      doctorUserId: visit.doctorUserId ? String(visit.doctorUserId) : "",
      visitType: visit.visitType || "",
      chiefComplaint: visit.reason || "",
      notes: visit.notes || "",
      status: visit.status || "",
    });
  };

  const handleUpdateVisit = async () => {
    if (!editingVisit) return;
    try {
      const payload = {
        doctorUserId: visitForm.doctorUserId ? Number(visitForm.doctorUserId) : null,
        visitType: visitForm.visitType || null,
        chiefComplaint: visitForm.chiefComplaint || null,
        notes: visitForm.notes || null,
        status: visitForm.status || null,
      };

      const res = await api.put(`/visits/${editingVisit.id}`, payload);
      const updated = res.data;

      setVisitPanel((prev) => ({
        ...prev,
        visits: prev.visits.map((v) =>
          v.id === updated.id
            ? {
                ...v,
                reason: updated.chiefComplaint || "",
                status: updated.status || v.status,
                visitType: updated.visitType || v.visitType,
                notes: updated.notes || v.notes,
                doctorUserId: updated.doctorUserId || null,
                doctorName: updated.doctorName || v.doctorName,
                createdAt: updated.visitDate || v.createdAt,
              }
            : v
        ),
      }));

      setEditingVisit(null);
    } catch (err) {
      console.error("Error updating visit", err);
      alert("Unable to update visit. Please try again.");
    }
  };

  // helper: upload single ID/insurance file
  const uploadIdFile = async (patientId, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file); // must be "file"

    await api.post(`/patients/${patientId}/upload-id`, fd, {
      // don't set Content-Type manually; axios will set boundary
      withCredentials: true,
    });
  };

  // helper: upload ONE past report for now
  // (later we can support multiple by changing backend to List<MultipartFile>)
  const uploadReportFiles = async (patientId, files) => {
    const list = Array.isArray(files) ? files.filter(Boolean) : [];
    if (!list.length) return;
    if (list.length > 5) {
      alert("You can upload up to 5 reports.");
      return;
    }
    const fd = new FormData();
    list.forEach((file) => fd.append("files", file));

    await api.post(`/patients/${patientId}/upload-reports`, fd, {
      withCredentials: true,
    });
  };

  const handleReportFilesSelect = (files) => {
    const list = Array.from(files || []);
    if (list.length > 5) {
      alert("You can upload up to 5 reports.");
      if (reportFileRef.current) reportFileRef.current.value = "";
      setReportFilesSelected([]);
      return;
    }
    // Check file sizes (5MB max per file)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = list.filter((f) => f.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map((f) => f.name).join(", ");
      alert(`File size must be less than 5MB. Oversized: ${names}`);
      if (reportFileRef.current) reportFileRef.current.value = "";
      setReportFilesSelected([]);
      return;
    }
    setReportFilesSelected(list);
  };

  const handleIdFileSelect = (files) => {
    const file = Array.from(files || [])[0] || null;
    if (!file) {
      setIdFileSelected(null);
      return;
    }
    // Check file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      alert(`File size must be less than 5MB. File: ${file.name}`);
      if (idFileRef.current) idFileRef.current.value = "";
      setIdFileSelected(null);
      return;
    }
    setIdFileSelected(file);
  };

  const handleIdDrop = (e) => {
    e.preventDefault();
    handleIdFileSelect(e.dataTransfer.files);
  };

  const handleReportDrop = (e) => {
    e.preventDefault();
    handleReportFilesSelect(e.dataTransfer.files);
  };

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      closePatientModal();
    }
  };

  const handleViewIdFile = (patient) => {
    if (!patient.hasIdFile) {
      alert("No ID / Insurance file uploaded for this patient.");
      return;
    }
    const url = `${API_BASE_URL}/patients/${patient.userId}/id-file`;
    window.open(url, "_blank", "noopener");
  };

  const handleViewReportsFile = async (patient) => {
    if (!patient.hasReportFile) {
      alert("No reports file uploaded for this patient.");
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE_URL}/patients/${patient.userId}/reports-files`
      );
      if (!res.ok) throw new Error("Failed to load report list");
      const files = await res.json();
      const list = Array.isArray(files) ? files : [];
      if (list.length === 0) {
        alert("No reports file uploaded for this patient.");
        return;
      }
      if (list.length === 1) {
        const url = `${API_BASE_URL}/patients/${patient.userId}/reports-file?fileName=${encodeURIComponent(
          list[0]
        )}`;
        window.open(url, "_blank", "noopener");
        return;
      }
      const openAll = window.confirm(
        `This patient has ${list.length} reports. Open all files?`
      );
      if (openAll) {
        list.forEach((name) => {
          const url = `${API_BASE_URL}/patients/${patient.userId}/reports-file?fileName=${encodeURIComponent(
            name
          )}`;
          window.open(url, "_blank", "noopener");
        });
      } else {
        const firstUrl = `${API_BASE_URL}/patients/${patient.userId}/reports-file?fileName=${encodeURIComponent(
          list[0]
        )}`;
        window.open(firstUrl, "_blank", "noopener");
      }
    } catch (err) {
      console.error("Error loading report files", err);
      alert("Unable to load report files.");
    }
  };

  const filteredPatients = useMemo(() => {
    if (serverPaging) return patients;
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const mobile = String(p.mobile || "").toLowerCase();
      const city = (p.city || "").toLowerCase();
      const referredBy = (p.referred_by || p.referredBy || "").toLowerCase();
      const uniqueId = (p.unique_id || p.uniqueId || "").toLowerCase();
      return (
        name.includes(q) ||
        mobile.includes(q) ||
        city.includes(q) ||
        referredBy.includes(q) ||
        uniqueId.includes(q)
      );
    });
  }, [patients, patientSearch, serverPaging]);

  
  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>Patient Entry</h2>
          <div className="page-subtitle">Manage saved patients and visits.</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card h-100 p-0 radius-12">
          <div className="card-header border-bottom bg-base py-16 px-24 d-flex align-items-center flex-wrap gap-3 justify-content-between">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <h6 className="mb-0 fw-semibold text-lg">Saved Patients</h6>
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
                  placeholder="Search patients"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
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
              onClick={() => navigate("/dashboard/patients/add")}
            >
              <i className="ri-user-add-line"></i>
              Add Patient
            </button>
          </div>
          <div className="card-body p-24">
            <div className="table-responsive scroll-sm">
              <table className="table bordered-table sm-table mb-0">
              <thead>
                <tr>
                  <th>S.L</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Age / Gender</th>
                  <th>City</th>
                  <th>Referred By</th>
                  <th>Primary Complaint</th>
                  <th>Assigned Doctor</th>
                  <th>Source</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", fontSize: 12 }}>
                      {patientSearch ? "No patients found." : "No patients added yet."}
                    </td>
                  </tr>
                )}

                {filteredPatients.map((p, idx) => (
                  <React.Fragment key={p.userId ?? p.id}>
                    <tr>
                      <td>{String(idx + 1).padStart(2, "0")}</td>
                      <td>{p.unique_id || p.id}</td>
                      <td>{p.name}</td>
                      <td>{p.mobile}</td>
                      <td>
                        {p.age || "-"} {p.gender ? ` / ${p.gender}` : ""}
                      </td>
                      <td>{p.city || "-"}</td>
                      <td>{p.referred_by || "-"}</td>
                      <td>{p.primary_complaint || "-"}</td>
                      <td>{getAssignedDoctorName(p)}</td>
                      <td>
                        <SourceOrgBadge
                          sourceType={p.sourceType}
                          sourceOrgName={p.sourceOrgName}
                        />
                      </td>
                      <td className="text-right">
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleCreateVisit(p)}
                          >
                            New Visit
                          </button>

                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => handleViewVisitsAndAppointments(p)}
                          >
                            Visits
                          </button>

                          <button
                            type="button"
                            className="btn sm"
                            onClick={() =>
                              navigate(`/org/patients/add?edit=${p.userId ?? p.id}`, {
                                state: { patient: p },
                              })
                            }
                          >
                            Edit
                          </button>

                          {/* View ID / Insurance */}
                          <button
                            type="button"
                            className="btn sm"
                            disabled={!p.hasIdFile}
                            onClick={() => handleViewIdFile(p)}
                          >
                            View ID
                          </button>

                          {/* View Past Reports */}
                          <button
                            type="button"
                            className="btn sm"
                            disabled={!p.hasReportFile}
                            onClick={() => handleViewReportsFile(p)}
                          >
                            View Reports
                          </button>

                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => handleDelete(p)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {visitPanel.patientId === p.userId && (
                      <tr>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div
                            className="neo-card"
                            style={{
                              padding: 16,
                              borderRadius: "1.4rem",
                              boxShadow: "var(--shadow)",
                              margin: 12,
                            }}
                          >
                            <h3
                              style={{
                                marginTop: 0,
                                marginBottom: 8,
                                fontSize: "1rem",
                                fontWeight: 600,
                              }}
                            >
                              Visits &amp; Appointments --- {visitPanel.patientName}
                            </h3>

                            <h4
                              style={{
                                margin: "8px 0 4px",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                              }}
                            >
                              Visits
                            </h4>
                            <div className="table-wrap">
                              <table className="neo-table" style={{ fontSize: "0.8rem" }}>
                                <thead>
                                  <tr>
                                    <th>Visit ID</th>
                                    <th>Created</th>
                                    <th>Type</th>
                                    <th>Doctor</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visitPanel.visits.length === 0 && (
                                    <tr>
                                      <td colSpan={7} style={{ textAlign: "center" }}>
                                        No visits yet.
                                      </td>
                                    </tr>
                                  )}
                                  {visitPanel.visits.map((v) => (
                                    <tr key={v.id}>
                                      <td>{v.id}</td>
                                      <td>{formatDateTime(v.createdAt)}</td>
                                      <td>{v.visitType || "-"}</td>
                                      <td>{v.doctorName || "-"}</td>
                                      <td>{v.reason || "-"}</td>
                                      <td>{v.status || "OPEN"}</td>
                                      <td style={{ textAlign: "right" }}>
                                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                          <button
                                            type="button"
                                            className="btn sm"
                                            onClick={() => openEditVisit(v)}
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {editingVisit && (
                              <div style={{ marginTop: 12 }}>
                                <h4 style={{ margin: "8px 0 6px", fontSize: "0.9rem" }}>
                                  Edit Visit {editingVisit.id}
                                </h4>
                                <div className="form-grid" style={{ padding: 0 }}>
                                  <div>
                                    <label>Doctor</label>
                                    <select
                                      value={visitForm.doctorUserId}
                                      onChange={(e) =>
                                        setVisitForm((prev) => ({
                                          ...prev,
                                          doctorUserId: e.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">Select doctor</option>
                                      {doctorsList.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                          {doc.name} ({doc.speciality})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label>Visit Type</label>
                                    <select
                                      value={visitForm.visitType}
                                      onChange={(e) =>
                                        setVisitForm((prev) => ({
                                          ...prev,
                                          visitType: e.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">Select type</option>
                                      <option value="NEW">NEW</option>
                                      <option value="FOLLOWUP">FOLLOWUP</option>
                                      <option value="EMERGENCY">EMERGENCY</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label>Status</label>
                                    <select
                                      value={visitForm.status}
                                      onChange={(e) =>
                                        setVisitForm((prev) => ({
                                          ...prev,
                                          status: e.target.value,
                                        }))
                                      }
                                    >
                                      <option value="">Select status</option>
                                      <option value="OPEN">OPEN</option>
                                      <option value="COMPLETED">COMPLETED</option>
                                      <option value="CANCELLED">CANCELLED</option>
                                    </select>
                                  </div>
                                  <div className="colspan">
                                    <label>Chief Complaint</label>
                                    <textarea
                                      rows={2}
                                      value={visitForm.chiefComplaint}
                                      onChange={(e) =>
                                        setVisitForm((prev) => ({
                                          ...prev,
                                          chiefComplaint: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="colspan">
                                    <label>Notes</label>
                                    <textarea
                                      rows={2}
                                      value={visitForm.notes}
                                      onChange={(e) =>
                                        setVisitForm((prev) => ({
                                          ...prev,
                                          notes: e.target.value,
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="actions">
                                    <button className="btn primary" type="button" onClick={handleUpdateVisit}>
                                      Save Visit
                                    </button>
                                    <button
                                      className="btn"
                                      type="button"
                                      onClick={() => setEditingVisit(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <h4
                              style={{
                                margin: "12px 0 4px",
                                fontSize: "0.9rem",
                                fontWeight: 600,
                              }}
                            >
                              Appointments
                            </h4>
                            <div className="table-wrap">
                              <table className="neo-table" style={{ fontSize: "0.8rem" }}>
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Visit ID</th>
                                    <th>Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visitPanel.appointments.length === 0 && (
                                    <tr>
                                      <td colSpan={4} style={{ textAlign: "center" }}>
                                        No appointments booked yet.
                                      </td>
                                    </tr>
                                  )}
                                  {visitPanel.appointments.map((a) => (
                                    <tr key={a.id}>
                                      <td>{a.date || "-"}</td>
                                      <td>{a.slot || "-"}</td>
                                      <td>{a.visitId || "-"}</td>
                                      <td>{a.description || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-24">
            <span>
              {totalItems
                ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalItems)} of ${totalItems} entries`
                : "Showing 0 to 0 of 0 entries"}
            </span>
            {totalPages > 1 && (
              <ul className="pagination d-flex flex-wrap align-items-center gap-2 justify-content-center">
                <li className="page-item">
                  <button
                    type="button"
                    className="page-link bg-neutral-300 text-secondary-light fw-semibold radius-8 border-0 d-flex align-items-center justify-content-center h-32-px w-32-px text-md"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    ‹
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
                    ›
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
      </div>

    </section>
  );
}
