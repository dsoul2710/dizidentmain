// src/components/RxSection.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import Prescription from "../print/Prescription.jsx";
import PatientSelect from "../common/PatientSelect";
import { formatDateDMY } from "../../utils/dateFormat";

const TODAY = new Date();
const todayKey = TODAY.toISOString().slice(0, 10); // "YYYY-MM-DD"

const toAgeSex = (p) =>
  p && (p.age != null || p.gender)
    ? `${p.age ?? ""}${p.gender ? ` | ${p.gender}` : ""}`
    : "";

const formatDose = (dose) => {
  if (!dose) return "";
  const lowered = String(dose).toLowerCase();
  
  // Handle new specific timing options
  if (lowered.includes("once") && lowered.includes("morning")) return "1 – 0 – 0";
  if (lowered.includes("once") && lowered.includes("afternoon")) return "0 – 1 – 0";
  if (lowered.includes("once") && lowered.includes("evening")) return "0 – 0 – 1";
  
  // Handle generic options
  if (lowered.includes("once")) return "1 – 0 – 0";
  if (lowered.includes("twice")) return "1 – 1 – 0";
  if (lowered.includes("thrice") || lowered.includes("3")) return "1 – 1 – 1";
  if (lowered.includes("stat")) return "STAT";
  
  // Handle manual format
  const parts = String(dose)
    .split(/[-–]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 3) return `${parts[0]} – ${parts[1]} – ${parts[2]}`;
  if (parts.length === 2) return `${parts[0]} – ${parts[1]} – 0`;
  if (parts.length === 1) return `${parts[0]} – 0 – 0`;
  return dose;
};

// ---- Cookie helpers (for doctor panel) ----
function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

export default function RxSection({
  apiBaseUrl = "/api",
  panelType = "ORG", // "ORG" or "DOCTOR"
  currentUser,
  onUseTemplate,
}) {
  const [tab, setTab] = useState("new"); // 'new' | 'default'

  // Ref for print surface (for auto-scroll)
  const printSurfaceRef = useRef(null);

  // Patients (ADMIN only)
  const [patients, setPatients] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);

  // Visits for selected patient
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState("");

  // Rx templates from backend
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Loaded Rx for visit (for prefill)
  const [loadedRx, setLoadedRx] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [rxNotes, setRxNotes] = useState("");
  const [rxItems, setRxItems] = useState([
    {
      brand: "",
      contents: "",
      type: "tab", // tab | syrup | powder
      qty: "",
      days: "",
      dosage: "",
      timing: "",
      duration: "",
      instructions: "",
    },
  ]);

  // --- Resolve doctorUserId depending on panel type ---
  const doctorUserId =
    panelType === "DOCTOR"
      ? (() => {
          const id = currentUser?.id ?? currentUser?.userId ?? null;
          return id != null ? Number(id) : null;
        })()
      : null; // ADMIN → handled by backend / visit

  // --- Resolve patientUserId depending on panel type ---
  const effectivePatientId =
    panelType === "DOCTOR"
      ? getCookie("selectedPatientId") || ""
      : patientId || "";

  // ---------- Effects ----------

  // Load patients for ADMIN
  useEffect(() => {
    if (panelType !== "ORG") return;

    const fetchPatients = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/patients`);
        if (!res.ok) throw new Error("Failed to load patients");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setPatients(arr);
      } catch (e) {
        console.error("Error fetching patients", e);
        setPatients([]);
      }
    };

    fetchPatients();
  }, [apiBaseUrl, panelType]);

  // Load visits when patient changes
  useEffect(() => {
    if (!effectivePatientId) {
      setVisits([]);
      setVisitId("");
      setLoadedRx(null);
      setPatientId("");
      setRxNotes("");
      setRxItems([
        {
          brand: "",
          contents: "",
          type: "tab",
          qty: "",
          days: "",
          dosage: "",
          timing: "",
          duration: "",
          instructions: "",
        },
      ]);
      setPatientInfo(null);
      return;
    }
    // Try to locate patient info from loaded list (admin) or fetch list once (doctor)
    const findPatient = (list) =>
      list.find(
        (p) =>
          String(p.userId || p.id) === String(effectivePatientId) ||
          String(p.id) === String(effectivePatientId)
      );

    if (patients.length) {
      setPatientInfo(findPatient(patients) || null);
    } else {
      const doctorParam =
        panelType === "DOCTOR" && doctorUserId
          ? `?doctorid=${encodeURIComponent(doctorUserId)}`
          : "";
      fetch(`${apiBaseUrl}/patients${doctorParam}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          const arr = Array.isArray(data) ? data : [];
          setPatientInfo(findPatient(arr) || null);
        })
        .catch(() => setPatientInfo(null));
    }

    const fetchVisits = async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/patients/${encodeURIComponent(
            effectivePatientId
          )}/visits`
        );
        if (!res.ok) throw new Error("Failed to load visits");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setVisits(arr);
        if (panelType === "DOCTOR") {
          // doctor panel: auto-select first visit if not set
          if (!visitId && arr.length) {
            setVisitId(String(arr[0].id));
          }
        }
      } catch (e) {
        console.error("Error fetching visits", e);
        setVisits([]);
      }
    };

    fetchVisits();
  }, [apiBaseUrl, effectivePatientId, panelType, visitId, doctorUserId]);

  // Load latest Rx when visit changes
  useEffect(() => {
    if (!visitId) {
      setLoadedRx(null);
      setShowPreview(false);
      return;
    }
    fetch(`${apiBaseUrl}/visits/${visitId}/prescriptions/latest`)
      .then((res) => (res.ok ? res.json() : null))
      .then((rx) => {
        setLoadedRx(rx);
        setShowPreview(false);
        if (rx && Array.isArray(rx.items) && rx.items.length) {
          setRxNotes(rx?.notes || "");
          setRxItems(
            rx.items.map((it) => ({
              brand: it.medicineName || "",
              contents: it.medicineContents || "",
              type: it.medicineType || "tab",
              qty: it.volume || "",
              days: it.days || "",
              dosage: it.dose || "",
              timing: it.timings || "",
              duration: it.duration || "",
              instructions: it.instructions || "",
            }))
          );
          setTab("new");
        } else {
          setRxNotes("");
          setRxItems([
            {
              brand: "",
              contents: "",
              type: "tab",
              qty: "",
              days: "",
              dosage: "",
              timing: "",
              duration: "",
              instructions: "",
            },
          ]);
        }
      })
      .catch(() => {
        setLoadedRx(null);
      });
  }, [apiBaseUrl, visitId, effectivePatientId]);

  // Load templates for current doctor (or all for admin)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const params =
          panelType === "DOCTOR" && doctorUserId
            ? `?doctorUserId=${encodeURIComponent(doctorUserId)}`
            : "";
        const res = await fetch(`${apiBaseUrl}/rx-templates${params}`);
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setTemplates(arr);
      } catch (e) {
        console.error("Error fetching rx templates", e);
        setTemplates([]);
      }
    };

    fetchTemplates();
  }, [apiBaseUrl, panelType, doctorUserId]);

  // Auto-scroll to print surface when preview is shown
  useEffect(() => {
    if (showPreview && printSurfaceRef.current) {
      setTimeout(() => {
        printSurfaceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [showPreview]);

  // ---------- Helpers ----------

  const handleItemChange = (index, field, value) => {
    setRxItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const groupedTemplates = useMemo(() => {
    const map = new Map();
    templates.forEach((t) => {
      const name = t.name || t.medicineName || `Template #${t.id}`;
      if (!map.has(name)) {
        map.set(name, { name, items: [] });
      }
      map.get(name).items.push(t);
    });
    return Array.from(map.values());
  }, [templates]);

  const selectedTpl = useMemo(
    () => groupedTemplates.find((t) => t.name === selectedTemplateId),
    [groupedTemplates, selectedTemplateId]
  );
  // ---------- Actions ----------

  // Save Rx for visit (actual prescription)
  const handleSaveVisit = async () => {
    if (!effectivePatientId) {
      alert("Please select a patient first.");
      return;
    }
    if (!visitId) {
      alert("Please select a visit.");
      return;
    }

    // doctor id is required if panelType = DOCTOR
    if (panelType === "DOCTOR" && !doctorUserId) {
      alert("Doctor id missing. Please check login / user object.");
      return;
    }

    const activeItems = rxItems.filter((it) => String(it.brand || "").trim());
    if (!activeItems.length) {
      alert("Please add at least one medicine.");
      return;
    }

    try {
      const payload = {
        visitId: Number(visitId),
        patientUserId: Number(effectivePatientId),
        doctorUserId: doctorUserId, // DOCTOR: id, ADMIN: null (backend can use visit.assignedDoctor)
        rxDate: todayKey,
        notes: rxNotes || "",
        items: activeItems.map((item) => ({
          medicineName: item.brand,
          medicineContents: item.contents || "",
          medicineType: item.type || "tab",
          volume: item.qty || "",
          dose: item.dosage || "",
          days: item.days || "",
          timings: item.timing || "",
          duration: item.duration || "",
          instructions: item.instructions || "",
        })),
      };

      const res = await fetch(`${apiBaseUrl}/prescriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Save prescription failed", await res.text());
        throw new Error("Failed to save prescription");
      }

      const created = await res.json();
      setLoadedRx(created);
      alert("Rx saved in database for this visit.");
      setShowPreview(false);

      // Optionally clear form (up to you)
      // setForm({ ...form, brand: "", contents: "", qty: "", days: "", dosage: "", timing: "", duration: "", instructions: ""});
    } catch (e) {
      console.error(e);
      alert("Error while saving Rx, please try again.");
    }
  };

  // Create template in DB
  const handleCreateDefault = async () => {
    const activeItems = rxItems.filter((it) => String(it.brand || "").trim());
    if (!activeItems.length) {
      alert("Please enter Brand Name before saving a template.");
      return;
    }

    const name =
      prompt("Enter a name for this Rx template:", activeItems[0].brand) ||
      "";
    if (!name.trim()) return;

    try {
      const createdItems = [];
      for (const item of activeItems) {
        const payload = {
          name: name.trim(),
          medicineName: item.brand,
          medicineContents: item.contents || "",
          medicineType: item.type || "tab",
          volume: item.qty || "",
          dose: item.dosage || "",
          days: item.days || "",
          timings: item.timing || "",
          duration: item.duration || "",
          instructions: item.instructions || "",
          doctorUserId: doctorUserId, // can be null for ADMIN (global template)
        };

        const res = await fetch(`${apiBaseUrl}/rx-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.error("Create template failed", await res.text());
          throw new Error("Failed to create template");
        }

        const created = await res.json();
        createdItems.push(created);
      }

      setTemplates((prev) => [...prev, ...createdItems]);
      alert("Template saved in database. It will appear in the Default list.");
    } catch (e) {
      console.error(e);
      alert("Error while saving template, please try again.");
    }
  };

  // Apply a template to the Rx form (and bubble up if parent wants)
  const handleUseTemplate = () => {
    if (!selectedTpl) {
      alert("Select a template first.");
      return;
    }

    setRxItems(
      selectedTpl.items.map((tpl) => ({
        brand: tpl.medicineName || tpl.brand || "",
        contents: tpl.medicineContents || tpl.contents || "",
        type: tpl.medicineType || tpl.type || "tab",
        qty: tpl.volume || tpl.qty || "",
        days: tpl.days || "",
        dosage: tpl.dose || tpl.dosage || "",
        timing: tpl.timings || tpl.timing || "",
        duration: tpl.duration || "",
        instructions: tpl.instructions || "",
      }))
    );

    if (onUseTemplate) {
      onUseTemplate(selectedTpl);
    }

    alert("Template applied from database.");
    setTab("new");
  };

  // ---------- UI ----------

  const buildPrintData = () => {
    if (!loadedRx) return null;
    const visit = visits.find((v) => String(v.id) === String(visitId));
    const patientName = patientInfo?.name || "";
    const ageSex = toAgeSex(patientInfo);
    const rxDate = loadedRx.rxDate || visit?.visitDate || todayKey;
    const items = Array.isArray(loadedRx.items) ? loadedRx.items : [];

    // Get doctor name - prioritize from prescription (has full doctor info)
    const doctorName =
      loadedRx?.doctorName ||        // From backend PrescriptionResponse (BEST SOURCE)
      visit?.doctorName ||           // From backend VisitResponse
      visit?.doctorFullName ||       // Alternative from visit
      visit?.doctor?.name ||         // If doctor is an object
      "Doctor";                      // Fallback

    const rxList = items.map((it, idx) => {
      const freqMain = formatDose(it.dose || it.timings || "");
      const freqNote =
        it.timings && it.timings !== it.dose ? it.timings : "";
      const durationVal = it.duration || (it.days != null ? String(it.days) : "");
      const duration =
        durationVal !== ""
          ? `${durationVal} day${Number(durationVal) === 1 ? "" : "s"}`
          : "";
      const qty =
        it.volume || it.quantity || (it.medicineType === "syrup" ? "ml" : "");
      const qtyPretty =
        qty && it.medicineType !== "syrup" && !String(qty).toLowerCase().includes("tablet")
          ? `${qty} tablet(s)`
          : qty;

      return {
        sr: idx + 1,
        drugName: it.medicineName,
        strength: it.medicineContents,
        instruction: it.instructions,
        frequency: freqMain,
        frequencyNote: freqNote,
        duration: duration,
        quantity: qtyPretty,
      };
    });

    return {
      hospital: {
        name: "CLINIC",
        tagline: "Prescription",
        address: "",
        contactLine: "",
        regNo: "",
      },
      formMeta: {
        title: "Prescription / Medicine Order",
        subtitle: "Outpatient Prescription",
      },
      patientDetails: {
        patientName: patientName || "Patient",
        uhid: patientInfo?.userId || patientInfo?.id || "",
        ageSex: ageSex || "",
        visitDate: formatDateDMY(rxDate),
        contactNo: patientInfo?.mobile || "",
        doctorName: doctorName,
      },
      rxList,
      advice: {
        general: loadedRx.notes || "Follow the instructions and contact clinic if symptoms persist.",
        followUp: "As advised.",
      },
      consultantLine: "",
    };
  };

  return (
    <>
    <section className="view show">
      <div className="page-header">
        <div>
          <h2>Prescription (Rx)</h2>
          <div className="page-subtitle">Create and reuse prescriptions for visits.</div>
        </div>
      </div>

      <div className="page-body">
        <div className="colspan">
          <label>Rx (Prescription)</label>

        {/* Tabs */}
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={"btn sm" + (tab === "new" ? " primary" : "")}
            onClick={() => setTab("new")}
            style={{ marginRight: 8 }}
          >
            New Rx
          </button>
          <button
            type="button"
            className={"btn sm" + (tab === "default" ? " primary" : "")}
            onClick={() => setTab("default")}
          >
            Use Default
          </button>
        </div>

        {tab === "new" && (
          <div className="form-grid rx-form-grid">
            {/* Patient + Visit row (same idea as ScheduleView) */}
            <div className="colspan">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1.2fr",
                  gap: "8px",
                  alignItems: "end",
                  marginBottom: 8,
                }}
              >
                {/* PATIENT SELECT */}
                {panelType === "ORG" ? (
                  <div>
                    <label>Patient</label>
                    <PatientSelect
                      patients={patients}
                      selectedId={patientId}
                      onChange={(value) => setPatientId(value)}
                    />
                  </div>
                ) : (
                  <div>
                    <label>Patient</label>
                    <input
                      type="text"
                      disabled
                      value={
                        effectivePatientId
                        ? `ID (${effectivePatientId}) patient selected`
                          : "No patient selected in header"
                      }
                    />
                  </div>
                )}

                {/* VISIT SELECT */}
                <div>
                  <label>Visit</label>
                  <select
                    value={visitId}
                    onChange={(e) => setVisitId(e.target.value)}
                    disabled={!effectivePatientId}
                  >
                    <option value="">
                      {effectivePatientId
                        ? "-- Select visit --"
                        : "Select patient first"}
                    </option>
                    {visits.map((v) => (
                      <option key={v.id} value={v.id}>
                        {(v.visitType || "Visit") +
                          " - " +
                          (v.visitDate ? formatDateDMY(v.visitDate) : "") +
                          (v.chiefComplaint ? ` - ${v.chiefComplaint}` : "")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {rxItems.map((item, idx) => (
              <div className="colspan" key={`rx-item-${idx}`}>
                <div
                  className="exam-card"
                  style={{ marginTop: idx === 0 ? 0 : 10 }}
                >
                  <div className="exam-card-head">
                    <strong>Medicine #{idx + 1}</strong>
                  </div>

                  <div className="form-grid rx-form-grid rx-item-grid">
                    <div className="rx-span-2">
                      <label>Brand Name</label>
                      <input
                        value={item.brand}
                        onChange={(e) =>
                          handleItemChange(idx, "brand", e.target.value)
                        }
                        placeholder="e.g., Nivedita Dolo 650"
                      />
                    </div>
                    <div className="rx-span-2">
                      <label>Medicinal Contents</label>
                      <input
                        value={item.contents}
                        onChange={(e) =>
                          handleItemChange(idx, "contents", e.target.value)
                        }
                        placeholder="e.g., Paracetamol 650 mg"
                      />
                    </div>

                    <div>
                      <label>Type</label>
                      <select
                        value={item.type}
                        onChange={(e) =>
                          handleItemChange(idx, "type", e.target.value)
                        }
                      >
                        <option value="tab">Tab</option>
                        <option value="syrup">Syrup</option>
                        <option value="powder">Powder</option>
                        <option value="capsule">Capsule</option>
                        <option value="injection">Injection</option>
                        <option value="ointment">Ointment</option>
                        <option value="toothpaste">Toothpaste</option>
                      </select>
                    </div>

                    <div>
                      <label>
                        {item.type === "syrup"
                          ? "Volume (ml)"
                          : item.type === "powder"
                          ? "Weight (gram)"
                          : "Strength"}
                      </label>
                      <input
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(idx, "qty", e.target.value)
                        }
                        placeholder={
                          item.type === "syrup"
                            ? "e.g., 100 ml"
                            : item.type === "powder"
                            ? "e.g., 50 gm"
                            : "e.g., 10 tablets"
                        }
                      />
                    </div>

                    <div>
                      <label>Days</label>
                      <input
                        value={item.days}
                        onChange={(e) =>
                          handleItemChange(idx, "days", e.target.value)
                        }
                        placeholder="e.g., 5 days"
                      />
                    </div>

                    <div>
                      <label>Dosage</label>
                      <select
                        value={item.dosage}
                        onChange={(e) =>
                          handleItemChange(idx, "dosage", e.target.value)
                        }
                      >
                        <option value="">-- Select --</option>
                        <option value="Once a day morning">Once a day morning</option>
                        <option value="Once a day afternoon">Once a day afternoon</option>
                        <option value="Once a day evening">Once a day evening</option>
                        <option value="Twice a day">Twice a day</option>
                        <option value="Thrice a day">Thrice a day</option>
                      </select>
                    </div>

                    <div>
                      <label>Timing</label>
                      <select
                        value={item.timing}
                        onChange={(e) =>
                          handleItemChange(idx, "timing", e.target.value)
                        }
                      >
                        <option value="">-- Select --</option>
                        <option value="Pre meal">Pre meal</option>
                        <option value="After meal">After meal</option>
                      </select>
                    </div>

                    <div>
                      <label>Duration (optional)</label>
                      <input
                        value={item.duration || ""}
                        onChange={(e) =>
                          handleItemChange(idx, "duration", e.target.value)
                        }
                        placeholder="e.g., 1 week"
                      />
                    </div>

                    <div className="rx-span-2">
                      <label>Special Instructions</label>
                      <input
                        value={item.instructions}
                        onChange={(e) =>
                          handleItemChange(idx, "instructions", e.target.value)
                        }
                        placeholder="e.g., Take with water, avoid alcohol."
                      />
                    </div>
                  </div>

                  <div className="rx-item-actions">
                    <button
                      type="button"
                      className="btn sm primary"
                      onClick={() =>
                        setRxItems((prev) => [
                          ...prev,
                          {
                            brand: "",
                            contents: "",
                            type: "tab",
                            qty: "",
                            days: "",
                            dosage: "",
                            timing: "",
                            duration: "",
                            instructions: "",
                          },
                        ])
                      }
                    >
                      <i className="ri-add-line" aria-hidden="true"></i>
                      Add Medicine
                    </button>
                    {rxItems.length > 1 && (
                      <button
                        type="button"
                        className="btn sm danger"
                        onClick={() =>
                          setRxItems((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        <i className="ri-delete-bin-line" aria-hidden="true"></i>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="colspan">
              <label>Prescription Notes</label>
              <textarea
                rows={2}
                value={rxNotes}
                onChange={(e) => setRxNotes(e.target.value)}
                placeholder="General advice for this prescription"
              />
            </div>

            {/* Buttons */}
            <div
              className="colspan"
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                alignItems: "center",
              }}
            >
              {loadedRx && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setShowPreview((v) => !v)}
                >
                  {showPreview ? "Hide Preview" : "Preview / Print"}
                </button>
              )}
              <button
                type="button"
                className="btn primary"
                onClick={handleSaveVisit}
              >
                Save Patient Prescription
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={handleCreateDefault}
              >
                Save as Template
              </button>
            </div>
          </div>
        )}

        {tab === "default" && (
          <div style={{ marginTop: 8 }}>
            <label>Choose Default Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">-- Select template --</option>
              {groupedTemplates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} {t.items.length > 1 ? `(${t.items.length})` : ""}
                </option>
              ))}
            </select>

            {selectedTpl && (
              <div className="rx-template-card">
                <div className="rx-template-head">
                  <div className="rx-template-title">{selectedTpl.name}</div>
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={handleUseTemplate}
                  >
                    Use this template
                  </button>
                </div>
                <div className="rx-template-list">
                  {selectedTpl.items.map((tpl, idx) => (
                    <div className="rx-template-item" key={tpl.id || idx}>
                      <div className="rx-template-item-title">
                        {tpl.medicineName || tpl.brand || `Medicine ${idx + 1}`}
                      </div>
                      <div className="rx-template-grid">
                        <div>
                          <span className="rx-template-label">Contents</span>
                          <span className="rx-template-value">
                            {tpl.medicineContents || tpl.contents || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="rx-template-label">Type</span>
                          <span className="rx-template-value">
                            {tpl.medicineType || tpl.type || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="rx-template-label">Qty</span>
                          <span className="rx-template-value">
                            {tpl.volume || tpl.qty || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="rx-template-label">Dose</span>
                          <span className="rx-template-value">
                            {tpl.dose || tpl.dosage || "-"}
                          </span>
                        </div>
                        <div>
                          <span className="rx-template-label">Timing</span>
                          <span className="rx-template-value">
                            {tpl.timings || tpl.timing || "-"}
                          </span>
                        </div>
                        {tpl.days && (
                          <div>
                            <span className="rx-template-label">Days</span>
                            <span className="rx-template-value">{tpl.days}</span>
                          </div>
                        )}
                        {tpl.duration && (
                          <div>
                            <span className="rx-template-label">Duration</span>
                            <span className="rx-template-value">
                              {tpl.duration}
                            </span>
                          </div>
                        )}
                        <div className="rx-template-full">
                          <span className="rx-template-label">Instructions</span>
                          <span className="rx-template-value">
                            {tpl.instructions || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!templates.length && (
              <p
                style={{
                  marginTop: 8,
                  color: "var(--muted)",
                  fontSize: 13,
                }}
              >
                No templates yet. Go to <b>New Rx</b> and click{" "}
                <b>Create Default</b> after filling the form.
              </p>
            )}
          </div>
        )}
        </div>
      </div>
    </section>
    {showPreview && loadedRx && buildPrintData() && (
      <div className="print-surface" style={{ marginTop: 12 }} ref={printSurfaceRef}>
        <Prescription data={buildPrintData()} />
      </div>
    )}
    </>
  );
}
