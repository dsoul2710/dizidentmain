// src/pages/PatientAdd.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { API_BASE_URL } from "../config";
import "../assets/css/wowdash-users.css";

export default function PatientAdd() {
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
        alert("Unable to load doctors from server.");
      }
    };
    fetchDoctors();
  }, []);

  const pageTitle = editId ? "Edit Patient" : "Add Patient";

  const assignedDoctorOptions = useMemo(
    () =>
      doctorsList.map((doc) => (
        <option key={doc.id} value={doc.id}>
          {doc.name} ({doc.speciality})
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
      assigned_doctor_id: patientForm.assigned_doctor_id
        ? Number(patientForm.assigned_doctor_id)
        : null,
    };

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
        alert("Patient saved.");
      }
      resetPatientForm();
      navigate("/org/patients");
    } catch (err) {
      console.error("Error saving patient", err);
      alert("Unable to save patient. Please try again.");
    }
  };

  return (
    <section className="view show wowdash-users">
      <div className="page-header">
        <div>
          <h2>{pageTitle}</h2>
          <div className="page-subtitle">Create and maintain patient profile.</div>
        </div>
      </div>
      <div className="page-body">
        <div className="wow-add-wrapper">
          <div className="card h-100 p-0 radius-12 wow-add-card">
            <div className="card-body p-24">
              <form onSubmit={handleSubmit} className="wow-add-form" encType="multipart/form-data" noValidate>
                <div className="wow-add-grid">
                  <div>
                    <label className="form-label fw-semibold text-sm text-primary-light">Name</label>
                    <input
                      name="name"
                      type="text"
                      required
                      className="form-control radius-8"
                      value={patientForm.name}
                      onChange={(e) =>
                        setPatientForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label fw-semibold text-sm text-primary-light">Mobile (OTP)</label>
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
                    <label className="form-label fw-semibold text-sm text-primary-light">Password</label>
                    <div className="password-input-wrapper" style={{ position: "relative" }}>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required={!editId}
                        className="form-control radius-8"
                        value={patientForm.password || ""}
                        onChange={(e) =>
                          setPatientForm((prev) => ({ ...prev, password: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "10px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#999",
                          padding: "5px",
                        }}
                      >
                        <i className={showPassword ? "ri-eye-line" : "ri-eye-off-line"}></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="form-label fw-semibold text-sm text-primary-light">DOB</label>
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
                      <option value="">---</option>
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
                      value={patientForm.referred_by}
                      onChange={(e) =>
                        setPatientForm((prev) => ({
                          ...prev,
                          referred_by: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="wow-colspan">
                    <label className="form-label fw-semibold text-sm text-primary-light">Allergies</label>
                    <textarea
                      name="allergies"
                      rows={2}
                      className="form-control radius-8"
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
                      value={patientForm.medical_hx}
                      onChange={(e) =>
                        setPatientForm((prev) => ({
                          ...prev,
                          medical_hx: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label fw-semibold text-sm text-primary-light">Assigned Doctor</label>
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
                      <option value="">--- Select doctor ---</option>
                      {assignedDoctorOptions}
                    </select>
                  </div>

                  <div className="wow-colspan">
                    <label className="form-label fw-semibold text-sm text-primary-light">Primary Complaint</label>
                    <textarea
                      name="primary_complaint"
                      rows={2}
                      className="form-control radius-8"
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
                      <div className="wow-upload-hint">Drag & drop file.</div>
                    </div>
                    {idFileSelected && (
                      <div className="wow-file-note">Selected: {idFileSelected.name}</div>
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
                      <div className="wow-upload-hint">Drag & drop files.</div>
                    </div>
                    {reportFilesSelected.length > 0 && (
                      <div className="wow-file-note">
                        Selected: {reportFilesSelected.map((f) => f.name).join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="wow-add-actions">
                  <button className="btn btn-primary" type="submit">
                    {editId ? "Update Patient" : "Save Patient"}
                  </button>
                  <button
                    className="btn btn-outline"
                    type="button"
                    onClick={() => navigate("/org/patients")}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
