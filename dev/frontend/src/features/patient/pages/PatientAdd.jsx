// src/pages/PatientAdd.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "@/api/client";
import { API_BASE_URL } from "@/config";
import "@/assets/css/wowdash-users.css";

export default function PatientAdd({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const ageInputRef = useRef(null);
  const idFileRef = useRef(null);
  const reportFileRef = useRef(null);

  const [editingPatient, setEditingPatient] = useState(null);
  const [idFileSelected, setIdFileSelected] = useState(null);
  const [reportFilesSelected, setReportFilesSelected] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Import existing patient states
  const [importUniqueId, setImportUniqueId] = useState("");
  const [importSearching, setImportSearching] = useState(false);
  const [importResult, setImportResult] = useState(null); // null = not searched, "not_found", or {patient object}
  const [importDoctorId, setImportDoctorId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const isDoctor = currentUser?.role === "DOCTOR";
  const isOrg = currentUser?.role === "ORG" || currentUser?.role === "ORG_HOSPITAL";

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

  useEffect(() => {
    const fromState = location.state?.patient || null;
    if (fromState && editId) {
      setEditingPatient(fromState);
      setPatientForm({
        name: fromState.name || "",
        mobile: fromState.mobile || "",
        password: "",
        dob: fromState.dob || "",
        age: fromState.age ?? "",
        gender: fromState.gender || "",
        city: fromState.city || "",
        referred_by: fromState.referred_by ?? fromState.referredBy ?? "",
        allergies: fromState.allergies || "",
        medical_hx: fromState.medical_hx ?? fromState.medicalHistory ?? "",
        primary_complaint: fromState.primary_complaint ?? fromState.primaryComplaint ?? "",
        assigned_doctor_id:
          fromState.assigned_doctor_id ??
          fromState.assignedDoctorId ??
          "",
      });
      if (ageInputRef.current) {
        ageInputRef.current.value =
          fromState.age != null ? String(fromState.age) : "";
      }
    }
  }, [location.state, editId]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.get("/doctors");
        setDoctorsList(res.data || []);
      } catch (err) {
        console.error("Error loading doctors", err);
      }
    };
    // Load doctors for Org role (dropdown) — Doctors don't need it
    if (isOrg || editId) {
      fetchDoctors();
    }
  }, [isOrg, editId]);

  const pageTitle = editId ? "Edit Patient" : "Add Patient";

  const assignedDoctorOptions = useMemo(
    () =>
      doctorsList.map((doc) => (
        <option key={doc.id} value={doc.id}>
          {doc.name || doc.fullName} ({doc.speciality || "General"})
        </option>
      )),
    [doctorsList]
  );

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

  const uploadIdFile = async (patientId, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await api.post(`/patients/${patientId}/upload-id`, fd, {
      withCredentials: true,
    });
  };

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
    const MAX_SIZE = 5 * 1024 * 1024;
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
    const MAX_SIZE = 5 * 1024 * 1024;
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

  // ---- Import Existing Patient ----
  const handleImportSearch = async () => {
    const uniqueId = importUniqueId.trim();
    if (!uniqueId) {
      alert("Enter a Patient Unique ID (e.g. PAT-000001).");
      return;
    }
    setImportSearching(true);
    setImportResult(null);
    setImportSuccess(false);
    try {
      const res = await api.get("/patients/lookup", { params: { uniqueId } });
      setImportResult(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setImportResult("not_found");
      } else {
        console.error("Lookup error", err);
        alert("Unable to search for patient. Please try again.");
      }
    } finally {
      setImportSearching(false);
    }
  };

  const handleImportPatient = async () => {
    if (!importResult || importResult === "not_found") return;
    setImporting(true);
    try {
      const payload = {
        patientUserId: importResult.userId || importResult.id,
        assignedDoctorId: isOrg && importDoctorId ? Number(importDoctorId) : null,
      };
      await api.post("/patients/import", payload);
      setImportSuccess(true);
    } catch (err) {
      console.error("Import error", err);
      const msg = err.response?.data?.message || err.response?.data?.error || "Unable to import patient.";
      alert(msg);
    } finally {
      setImporting(false);
    }
  };

  // ---- Create / Update Patient ----
  const handleSubmit = async (e) => {
    e.preventDefault();

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
      password: patientForm.password || null,
      dob: patientForm.dob || null,
      age: patientForm.age !== "" ? Number(patientForm.age) : null,
      gender: patientForm.gender || null,
      city: patientForm.city || null,
      referred_by: patientForm.referred_by || null,
      allergies: patientForm.allergies || null,
      medical_hx: patientForm.medical_hx || null,
      primary_complaint: patientForm.primary_complaint || null,
      // For DOCTOR role, no doctor dropdown — backend auto-assigns via SecurityUtils
      // For ORG role, use selected doctor from dropdown
      assigned_doctor_id:
        isDoctor
          ? null // backend handles auto-assignment for doctors
          : patientForm.assigned_doctor_id
            ? Number(patientForm.assigned_doctor_id)
            : null,
    };

    setSaving(true);
    try {
      if (editId && editingPatient) {
        const userId = editingPatient.userId ?? editingPatient.id;
        const res = await api.put(`/patients/${userId}`, payload);
        const updated = res.data;
        const idFile = idFileSelected || idFileRef.current?.files?.[0] || null;
        const reportFiles =
          reportFilesSelected.length > 0
            ? reportFilesSelected
            : Array.from(reportFileRef.current?.files || []);
        try {
          if (idFile) await uploadIdFile(userId, idFile);
          if (reportFiles.length) await uploadReportFiles(userId, reportFiles);
        } catch (fileErr) {
          console.error("File upload error", fileErr);
          alert("Patient updated, but file upload failed. You can retry later.");
        }
        alert(`Patient "${updated.name}" updated.`);
      } else {
        const res = await api.post("/patients", payload);
        const savedPatient = res.data;
        const idFile = idFileSelected || idFileRef.current?.files?.[0] || null;
        const reportFiles =
          reportFilesSelected.length > 0
            ? reportFilesSelected
            : Array.from(reportFileRef.current?.files || []);
        try {
          if (idFile) await uploadIdFile(savedPatient.userId, idFile);
          if (reportFiles.length) await uploadReportFiles(savedPatient.userId, reportFiles);
        } catch (fileErr) {
          console.error("File upload error", fileErr);
          alert("Patient saved, but file upload failed. You can retry later.");
        }
        alert("Patient saved successfully.");
      }
      resetPatientForm();
      navigate("/dashboard/patients");
    } catch (err) {
      console.error("Error saving patient", err);
      const msg = err.response?.data?.message || err.response?.data?.error || "Unable to save patient. Please try again.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => navigate("/dashboard/patients");

  return (
    <section className="view show wowdash-users clinical-hms">
      <div className="page-header mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            <i className={editId ? "ri-edit-line me-2" : "ri-user-add-line me-2"}></i>
            {pageTitle}
          </h2>
          <div className="page-subtitle text-secondary-light">
            {editId
              ? "Update patient profile details."
              : isDoctor
                ? "Register a new patient or import an existing one to your practice."
                : "Register a new patient or import an existing one to your clinic."}
          </div>
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={goBack}>
          <i className="ri-arrow-left-line me-1"></i> Back
        </button>
      </div>

      <div className="page-body">
        {/* ====== IMPORT EXISTING PATIENT SECTION ====== */}
        {!editId && (
          <div className="card border-0 shadow-sm radius-12 overflow-hidden mb-4">
            <div className="card-header border-bottom bg-base py-16 px-24">
              <h6 className="mb-0 fw-semibold text-lg text-primary-light">
                <i className="ri-user-received-line me-2"></i>
                Import Existing Patient
              </h6>
              <p className="text-xs text-secondary-light mb-0 mt-1">
                If the patient already has an account, search by their Unique ID (e.g. PAT-000001) to link them to your {isDoctor ? "practice" : "clinic"}.
              </p>
            </div>
            <div className="card-body p-24">
              <div className="d-flex align-items-end gap-3 flex-wrap">
                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Patient Unique ID</label>
                  <input
                    type="text"
                    className="form-control radius-8"
                    placeholder="e.g. PAT-000001"
                    maxLength={20}
                    value={importUniqueId}
                    onChange={(e) => {
                      setImportUniqueId(e.target.value.toUpperCase());
                      setImportResult(null);
                      setImportSuccess(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleImportSearch();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleImportSearch}
                  disabled={importSearching || !importUniqueId.trim()}
                >
                  {importSearching ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      Searching...
                    </>
                  ) : (
                    <>
                      <i className="ri-search-line me-1"></i> Search
                    </>
                  )}
                </button>
              </div>

              {/* Search Result */}
              {importResult === "not_found" && (
                <div className="mt-3 p-3 radius-8 d-flex align-items-center gap-2" role="alert"
                  style={{ backgroundColor: "var(--bs-warning-bg-subtle, #fff3cd)", border: "1px solid var(--bs-warning-border-subtle, #ffe69c)" }}>
                  <i className="ri-information-line text-warning fs-5"></i>
                  <span className="text-sm">No patient found with this Unique ID. You can create a new patient below.</span>
                </div>
              )}

              {importResult && importResult !== "not_found" && !importSuccess && (
                <div className="mt-3 p-3 radius-8 border" style={{ backgroundColor: "var(--bs-success-bg-subtle, #d1e7dd)" }}>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center justify-content-center radius-8"
                        style={{ width: "44px", height: "44px", backgroundColor: "var(--bs-primary)", color: "#fff", fontSize: "1.2rem", fontWeight: 600 }}>
                        {(importResult.name || "?")[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-semibold text-primary-light">{importResult.name}</div>
                        <div className="text-xs text-secondary-light">
                          {importResult.mobile}
                          {importResult.gender && <span className="ms-2">{importResult.gender === "M" ? "Male" : importResult.gender === "F" ? "Female" : importResult.gender}</span>}
                          {importResult.city && <span className="ms-2">• {importResult.city}</span>}
                        </div>
                        {importResult.unique_id && (
                          <span className="badge bg-primary-100 text-primary-600 px-2 py-1 radius-4 text-xs mt-1">
                            {importResult.unique_id}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="d-flex align-items-end gap-2 flex-wrap">
                      {/* Org can assign doctor during import */}
                      {isOrg && doctorsList.length > 0 && (
                        <div>
                          <label className="form-label fw-semibold text-xs text-secondary-light mb-1">Assign Doctor (Optional)</label>
                          <select
                            className="form-select form-select-sm radius-8"
                            value={importDoctorId}
                            onChange={(e) => setImportDoctorId(e.target.value)}
                          >
                            <option value="">— None —</option>
                            {doctorsList.map((doc) => (
                              <option key={doc.id} value={doc.id}>
                                {doc.name || doc.fullName} ({doc.speciality || "General"})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleImportPatient}
                        disabled={importing}
                      >
                        {importing ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Importing...
                          </>
                        ) : (
                          <>
                            <i className="ri-user-received-line me-1"></i> Import Patient
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {importSuccess && (
                <div className="mt-3 p-3 radius-8 d-flex align-items-center gap-2" role="alert"
                  style={{ backgroundColor: "var(--bs-success-bg-subtle, #d1e7dd)", border: "1px solid var(--bs-success-border-subtle, #a3cfbb)" }}>
                  <i className="ri-checkbox-circle-line text-success fs-5"></i>
                  <span className="text-sm fw-semibold">
                    Patient "{importResult?.name}" imported successfully!
                  </span>
                  <button type="button" className="btn btn-sm btn-outline-primary ms-auto" onClick={goBack}>
                    <i className="ri-arrow-left-line me-1"></i> Back to Patients
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== DIVIDER ====== */}
        {!editId && (
          <div className="d-flex align-items-center gap-3 mb-4">
            <hr className="flex-grow-1" />
            <span className="text-secondary-light fw-semibold text-sm text-nowrap">OR Create New Patient</span>
            <hr className="flex-grow-1" />
          </div>
        )}

        {/* ====== CREATE / EDIT PATIENT FORM ====== */}
        <div className="card border-0 shadow-sm radius-12 overflow-hidden">
          <div className="card-header border-bottom bg-base py-16 px-24">
            <h6 className="mb-0 fw-semibold text-lg text-primary-light">
              <i className={editId ? "ri-edit-line me-2" : "ri-user-add-line me-2"}></i>
              {editId ? "Edit Patient Details" : "New Patient Registration"}
            </h6>
          </div>
          <div className="card-body p-24">
            <form onSubmit={handleSubmit} className="wow-add-form" encType="multipart/form-data" noValidate>
              <div className="wow-add-grid">
                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Full Name *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="form-control radius-8"
                    placeholder="e.g. John Doe"
                    value={patientForm.name}
                    onChange={(e) =>
                      setPatientForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Mobile Number *</label>
                  <input
                    name="mobile"
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                    className="form-control radius-8"
                    value={patientForm.mobile}
                    onChange={(e) =>
                      setPatientForm((prev) => ({ ...prev, mobile: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">
                    Password {!editId && "*"}
                  </label>
                  <div className="position-relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required={!editId}
                      className="form-control radius-8 pe-5"
                      placeholder={editId ? "Leave blank to keep" : "Set login password"}
                      value={patientForm.password || ""}
                      onChange={(e) =>
                        setPatientForm((prev) => ({ ...prev, password: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="btn btn-sm position-absolute top-50 end-0 translate-middle-y border-0 bg-transparent text-secondary-light pe-3"
                    >
                      <i className={showPassword ? "ri-eye-line" : "ri-eye-off-line"}></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Date of Birth</label>
                  <input
                    type="date"
                    name="dob"
                    className="form-control radius-8"
                    value={patientForm.dob || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPatientForm((prev) => ({ ...prev, dob: value }));
                      if (!value || !ageInputRef.current) {
                        if (ageInputRef.current) ageInputRef.current.value = "";
                        return;
                      }
                      const dob = new Date(value);
                      if (Number.isNaN(dob.getTime())) {
                        ageInputRef.current.value = "";
                        return;
                      }
                      const today = new Date();
                      let years = today.getFullYear() - dob.getFullYear();
                      const m = today.getMonth() - dob.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                        years -= 1;
                      }
                      const ageValue = years >= 0 ? String(years) : "";
                      ageInputRef.current.value = ageValue;
                      setPatientForm((prev) => ({ ...prev, age: ageValue }));
                    }}
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Age</label>
                  <input
                    type="number"
                    name="age"
                    min="0"
                    max="110"
                    ref={ageInputRef}
                    className="form-control radius-8"
                    value={patientForm.age}
                    onChange={(e) =>
                      setPatientForm((prev) => ({ ...prev, age: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Gender</label>
                  <select
                    name="gender"
                    className="form-select radius-8"
                    value={patientForm.gender}
                    onChange={(e) =>
                      setPatientForm((prev) => ({ ...prev, gender: e.target.value }))
                    }
                  >
                    <option value="">— Select —</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">City</label>
                  <input
                    name="city"
                    type="text"
                    className="form-control radius-8"
                    placeholder="e.g. Mumbai"
                    value={patientForm.city}
                    onChange={(e) =>
                      setPatientForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Referred by</label>
                  <input
                    name="referred_by"
                    type="text"
                    className="form-control radius-8"
                    placeholder="e.g. Dr. Sharma"
                    value={patientForm.referred_by}
                    onChange={(e) =>
                      setPatientForm((prev) => ({
                        ...prev,
                        referred_by: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Assigned Doctor dropdown – only for ORG role */}
                {isOrg && (
                  <div>
                    <label className="form-label fw-semibold text-sm text-primary-light">Assign Doctor</label>
                    <select
                      name="assigned_doctor_id"
                      id="doctorSelect"
                      className="form-select radius-8"
                      value={patientForm.assigned_doctor_id}
                      onChange={(e) =>
                        setPatientForm((prev) => ({
                          ...prev,
                          assigned_doctor_id: e.target.value,
                        }))
                      }
                    >
                      <option value="">— Select doctor —</option>
                      {assignedDoctorOptions}
                    </select>
                  </div>
                )}

                {/* Doctor role info */}
                {isDoctor && !editId && (
                  <div>
                    <label className="form-label fw-semibold text-sm text-primary-light">Assigned Doctor</label>
                    <div className="form-control radius-8 d-flex align-items-center gap-2 bg-light">
                      <i className="ri-stethoscope-line text-primary"></i>
                      <span className="fw-semibold text-sm">{currentUser?.name || "You"}</span>
                      <span className="badge bg-primary-100 text-primary-600 px-2 py-1 radius-4 text-xs ms-auto">Auto-assigned</span>
                    </div>
                  </div>
                )}

                <div className="wow-colspan">
                  <label className="form-label fw-semibold text-sm text-primary-light">Allergies</label>
                  <textarea
                    name="allergies"
                    rows={2}
                    className="form-control radius-8"
                    placeholder="Known allergies..."
                    value={patientForm.allergies}
                    onChange={(e) =>
                      setPatientForm((prev) => ({
                        ...prev,
                        allergies: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="wow-colspan">
                  <label className="form-label fw-semibold text-sm text-primary-light">Medical History</label>
                  <textarea
                    name="medical_hx"
                    rows={2}
                    className="form-control radius-8"
                    placeholder="Past medical conditions..."
                    value={patientForm.medical_hx}
                    onChange={(e) =>
                      setPatientForm((prev) => ({
                        ...prev,
                        medical_hx: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="wow-colspan">
                  <label className="form-label fw-semibold text-sm text-primary-light">Primary Complaint</label>
                  <textarea
                    name="primary_complaint"
                    rows={2}
                    className="form-control radius-8"
                    placeholder="Chief reason for visit..."
                    value={patientForm.primary_complaint}
                    onChange={(e) =>
                      setPatientForm((prev) => ({
                        ...prev,
                        primary_complaint: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">ID/Insurance Photo</label>
                  <div className="wow-upload" onDragOver={(e) => e.preventDefault()} onDrop={handleIdDrop}>
                    <input
                      type="file"
                      name="id_photo"
                      ref={idFileRef}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleIdFileSelect(e.target.files)}
                    />
                    <div className="wow-upload-hint">
                      <i className="ri-upload-cloud-2-line me-1"></i> Drag & drop file.
                    </div>
                  </div>
                  {idFileSelected && (
                    <div className="wow-file-note">
                      <i className="ri-file-line me-1"></i> {idFileSelected.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label fw-semibold text-sm text-primary-light">Past Reports (PDF/JPG)</label>
                  <div className="wow-upload" onDragOver={(e) => e.preventDefault()} onDrop={handleReportDrop}>
                    <input
                      type="file"
                      name="reports[]"
                      multiple
                      ref={reportFileRef}
                      accept="image/*,application/pdf"
                      onChange={(e) => handleReportFilesSelect(e.target.files)}
                    />
                    <div className="wow-upload-hint">
                      <i className="ri-upload-cloud-2-line me-1"></i> Drag & drop files.
                    </div>
                  </div>
                  {reportFilesSelected.length > 0 && (
                    <div className="wow-file-note">
                      <i className="ri-file-list-3-line me-1"></i>
                      {reportFilesSelected.map((f) => f.name).join(", ")}
                    </div>
                  )}
                </div>
              </div>

              <div className="wow-add-actions mt-4">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1"></span>
                      {editId ? "Updating..." : "Saving..."}
                    </>
                  ) : (
                    <>
                      <i className={editId ? "ri-save-line me-1" : "ri-user-add-line me-1"}></i>
                      {editId ? "Update Patient" : "Save Patient"}
                    </>
                  )}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={goBack}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
