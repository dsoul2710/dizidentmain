// src/pages/ConsentPostOpView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE } from "../config";
import DentalConsent from "../components/print/DentalConsent.jsx";
import PostOperativeGuide from "../components/print/PostOperativeGuide.jsx";
import "../components/print/print-common.css";
import PatientSelect from "../components/common/PatientSelect";
import { formatDateDMY } from "../utils/dateFormat";

// Simple helpers
const toAgeSex = (p) =>
  p && (p.age != null || p.gender)
    ? `${p.age ?? ""}${p.gender ? ` | ${p.gender}` : ""}`
    : "";

export default function ConsentPostOpView() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [patient, setPatient] = useState(null);
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState("");

  const [selectedTeeth, setSelectedTeeth] = useState([]);

  const [treatmentCategories, setTreatmentCategories] = useState([]);
  const [planProcedures, setPlanProcedures] = useState([]); // from plan
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [customProcedure, setCustomProcedure] = useState("");
  const [procSource, setProcSource] = useState("plan"); // plan | custom

  const [previewType, setPreviewType] = useState(null); // "consent" | "guide"
  const [previewData, setPreviewData] = useState(null);
  const previewRef = useRef(null);

  // Load patients
  useEffect(() => {
    fetch(`${API_BASE}/api/patients`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setPatients([]));
  }, []);

  // Load visits for patient
  useEffect(() => {
    if (!patientId) {
      setVisits([]);
      setVisitId("");
      setPatient(null);
      return;
    }
    const current = patients.find(
      (p) =>
        String(p.userId || p.id) === String(patientId) ||
        String(p.id) === String(patientId)
    );
    setPatient(current || null);

    fetch(`${API_BASE}/api/patients/${patientId}/visits`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setVisits(Array.isArray(data) ? data : []))
      .catch(() => setVisits([]));
  }, [patientId, patients]);

  // When visit selected: pull treatment plan detail to populate teeth + procedures
  useEffect(() => {
    if (!visitId) {
      setPlanProcedures([]);
      setSelectedProcedure("");
      setCustomProcedure("");
      setSelectedTeeth([]);
      return;
    }
    fetch(`${API_BASE}/api/visits/${visitId}/treatment-plan/detail`)
      .then((res) => (res.ok ? res.json() : null))
      .then((plan) => {
        if (!plan) {
          setPlanProcedures([]);
          setSelectedProcedure("");
          setCustomProcedure("");
          setSelectedTeeth([]);
          return;
        }
        const flatProcs = Array.from(
          new Set(
            Object.values(plan.selectedProcedures || {})
              .flat()
              .filter(Boolean)
          )
        );
        setPlanProcedures(flatProcs);
        setSelectedProcedure(flatProcs[0] || "");
        setCustomProcedure("");
        setSelectedTeeth(Array.isArray(plan.selectedTeeth) ? plan.selectedTeeth : []);
      })
      .catch(() => {
        setPlanProcedures([]);
        setSelectedProcedure("");
        setCustomProcedure("");
        setSelectedTeeth([]);
      });
  }, [visitId]);

  // Load treatment masters
  useEffect(() => {
    fetch(`${API_BASE}/api/masters/treatments`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTreatmentCategories(Array.isArray(data) ? data : []))
      .catch(() => setTreatmentCategories([]));
  }, []);

  useEffect(() => {
    if (previewData && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [previewData, previewType]);

  const allProcedures = useMemo(
    () => (treatmentCategories || []).flatMap((c) => c.procedures || []),
    [treatmentCategories]
  );
  const allProcedureNames = useMemo(
    () =>
      Array.from(
        new Set(
          allProcedures
            .map((p) => p.name)
            .filter(Boolean)
        )
      ),
    [allProcedures]
  );

  const buildPreview = (type) => {
    if (!patient) {
      alert("Please select a patient.");
      return;
    }
    const chosen =
      procSource === "custom"
        ? (customProcedure || "").trim()
        : (selectedProcedure || "").trim();
    if (!chosen) {
      alert("Select a procedure.");
      return;
    }

    const rows = [chosen]
      .map((name) => {
        const rawKey = String(name).trim();
        const itemKey = rawKey.includes("::")
          ? rawKey.split("::").pop().trim()
          : rawKey;
        const match =
          allProcedures.find((p) => String(p.itemKey || "") === rawKey) ||
          allProcedures.find((p) => String(p.itemKey || "") === itemKey) ||
          allProcedures.find((p) => String(p.id || "") === rawKey) ||
          allProcedures.find((p) => String(p.id || "") === itemKey) ||
          allProcedures.find(
            (p) =>
              String(p.name).trim().toLowerCase() === rawKey.toLowerCase()
          ) ||
          allProcedures.find(
            (p) =>
              String(p.name).trim().toLowerCase() === itemKey.toLowerCase()
          );
        const text =
          type === "consent" ? match?.consentText : match?.guidelineText;
        const fallback =
          type === "consent"
            ? `I have read and understood the information and consent to proceed with: ${name}.`
            : `Follow the post-operative instructions for ${name}. Contact the clinic if you experience severe pain, swelling, fever, bleeding, or any concern.`;
        return (text && text.trim()) || fallback;
      })
      .filter(Boolean);

    const today = formatDateDMY(new Date());
    const teethInfo =
      (selectedTeeth && selectedTeeth.length && selectedTeeth.join(", ")) || "-";
    const firstProc = chosen;
    const patientName = patient?.name || "";
    const ageSex = toAgeSex(patient);

    if (type === "consent") {
      const data = {
        hospital: {
          name: "CLINIC",
          tagline: "Patient Care",
          address: "",
          contactLine: "",
          regNo: "",
          logo: "/images/logo.png",
        },
        formMeta: {
          title: "Dental Treatment Consent",
          subtitle: "Informed consent for dental procedure",
        },
        patientDetails: {
          patientName: patientName || "Patient",
          uhid: patient.userId || patient.id || "",
          ageSex: ageSex || "",
          contactNo: patient?.mobile || "",
          address: patient?.city || "",
        },
        procedureDetails: {
          procedureName: firstProc,
          teethInvolved: teethInfo,
          diagnosis: "",
          plannedDate: today,
        },
        informedSummary: rows.join("\n\n"),
        placeDate: { place: "", date: today },
        procedureRows: rows,
      };
      setPreviewType("consent");
      setPreviewData(data);
    } else {
      const data = {
        hospital: {
          name: "CLINIC",
          tagline: "Post-Operative Care",
          address: "",
          contactLine: "",
          regNo: "",
          logo: "/images/logo.png",
        },
        formMeta: {
          title: "Post-Operative Guide",
          subtitle: "Instructions after dental treatment",
        },
        patientDetails: {
          patientName: patientName || "Patient",
          uhid: patient.userId || patient.id || "",
          ageSex: ageSex || "",
          contactNo: patient?.mobile || "",
          treatment: `${firstProc} - ${teethInfo}`,
        },
        guideLines: rows,
      };
      setPreviewType("guide");
      setPreviewData(data);
    }
  };

  return (
    <div className="reports-container">
      <h2 className="reports-title mb-2">Consent &amp; Post-Operative Guide</h2>

      <div className="neo-card mb-3 allow-overflow">
        <div className="neo-card-body consent-filters">
          <div className="filter-block">
            <label className="filter-label">Select Patient</label>
            <PatientSelect
              patients={patients}
              selectedId={patientId}
              onChange={(value) => {
                setPatientId(value);
                setVisitId("");
                setPreviewData(null);
                setPreviewType(null);
              }}
            />
          </div>

          <div className="filter-block">
            <label className="filter-label">Select Visit</label>
            <select
              className="neo-input"
              value={visitId}
              onChange={(e) => setVisitId(e.target.value)}
              disabled={!patientId}
            >
              <option value="">-- Select Visit --</option>
              {visits.map((v) => (
                <option key={v.id} value={v.id}>
                {formatDateDMY(v.visitDate || v.visit_date)} {v.visitType ? `(${v.visitType})` : ""}
              </option>
            ))}
          </select>
          </div>

          <div className="filter-block">
            <label className="filter-label">Select Procedure (one at a time)</label>
            <div className="radio-group">
              <label className="radio-pill">
                <input
                  type="radio"
                  name="procSource"
                  value="plan"
                  checked={procSource === "plan"}
                  onChange={() => setProcSource("plan")}
                  disabled={!visitId}
                />
                <span>Doctor procedures</span>
              </label>
              <label className="radio-pill">
                <input
                  type="radio"
                  name="procSource"
                  value="custom"
                  checked={procSource === "custom"}
                  onChange={() => setProcSource("custom")}
                />
                <span>New</span>
              </label>
            </div>

            {procSource === "plan" ? (
              <select
                className="neo-input"
                value={selectedProcedure}
                onChange={(e) => setSelectedProcedure(e.target.value)}
                disabled={!visitId}
              >
                <option value="">-- Select from plan --</option>
                {planProcedures.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="neo-input"
                value={customProcedure}
                onChange={(e) => setCustomProcedure(e.target.value)}
              >
                <option value="">-- Select procedure --</option>
                {allProcedureNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="filter-block">
            <label className="filter-label">Selected Teeth (from plan)</label>
            <input
              className="neo-input"
              value={selectedTeeth.join(", ")}
              readOnly
              placeholder="Auto from treatment plan"
            />
          </div>
        </div>
        <div className="neo-card-body consent-actions">
          <div className="consent-actions-row">
            <button className="neo-btn" onClick={() => buildPreview("consent")}>
              Preview Consent
            </button>
            <button className="neo-btn ghost" onClick={() => buildPreview("guide")}>
              Preview Post-Op Guide
            </button>
          </div>
        </div>
      </div>

      {previewData && (
        <div ref={previewRef} className="print-surface" style={{ marginTop: 12 }}>
          {previewType === "consent" && <DentalConsent data={previewData} />}
          {previewType === "guide" && <PostOperativeGuide data={previewData} />}
        </div>
      )}
    </div>
  );
}


