// src/pages/patient/PatientOverviewPage.jsx
import React from "react";
import "../../components/print/print-common.css";
import { formatDateDMY } from "../../utils/dateFormat";

export default function PatientOverviewPage({
  patient,
  visits,
  examItemsByVisit,
  planByVisit,
  diagnosisByVisit,
  doctorsById,
  loading,
  error,
}) {
  const formatTeethInline = (teeth = []) => {
    const list = (teeth || []).filter(Boolean).map(String);
    if (!list.length) return "";

    const sorted = [...list].sort();
    const asSet = new Set(sorted);
    const matches = (expected) =>
      expected.length === sorted.length &&
      expected.every((t) => asSet.has(String(t)));

    const segments = [
      { teeth: ["11", "12", "13", "14", "15", "16", "17", "18"], label: "upper left segment" },
      { teeth: ["21", "22", "23", "24", "25", "26", "27", "28"], label: "upper right segment" },
      { teeth: ["31", "32", "33", "34", "35", "36", "37", "38"], label: "lower left segment" },
      { teeth: ["41", "42", "43", "44", "45", "46", "47", "48"], label: "lower right segment" },
      {
        teeth: [
          "11", "12", "13", "14", "15", "16", "17", "18",
          "21", "22", "23", "24", "25", "26", "27", "28",
          "31", "32", "33", "34", "35", "36", "37", "38",
          "41", "42", "43", "44", "45", "46", "47", "48",
        ],
        label: "full mouth",
      },
      { teeth: ["51", "52", "53", "54", "55"], label: "upper left segment (primary)" },
      { teeth: ["61", "62", "63", "64", "65"], label: "upper right segment (primary)" },
      { teeth: ["71", "72", "73", "74", "75"], label: "lower left segment (primary)" },
      { teeth: ["81", "82", "83", "84", "85"], label: "lower right segment (primary)" },
      {
        teeth: ["51", "52", "53", "54", "55", "61", "62", "63", "64", "65", "71", "72", "73", "74", "75", "81", "82", "83", "84", "85"],
        label: "full mouth (primary)",
      },
    ];

    const exact = segments.find((s) => matches(s.teeth));
    if (exact) return exact.label;

    const coverage = [];
    let remaining = new Set(sorted);
    segments.forEach((s) => {
      if (s.teeth.every((t) => remaining.has(String(t)))) {
        coverage.push(s.label);
        s.teeth.forEach((t) => remaining.delete(String(t)));
      }
    });

    const rem = Array.from(remaining);
    const parts = [];
    if (coverage.length) parts.push(...coverage);
    if (rem.length === 1) parts.push(`tooth ${rem[0]}`);
    else if (rem.length === 2) parts.push(`teeth ${rem[0]} and ${rem[1]}`);
    else if (rem.length > 2) {
      const last = rem.pop();
      parts.push(`teeth ${rem.join(", ")} and ${last}`);
    }

    if (parts.length === 1) return parts[0];
    if (parts.length > 1) {
      const last = parts.pop();
      return `${parts.join(", ")} and ${last}`;
    }

    if (list.length === 1) return `tooth ${list[0]}`;
    if (list.length === 2) return `teeth ${list[0]} and ${list[1]}`;
    const last = list[list.length - 1];
    return `teeth ${list.slice(0, -1).join(", ")} and ${last}`;
  };
  const handlePrint = () => window.print();
  const handleShare = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Patient Overview", url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard.");
      } else {
        alert(shareUrl);
      }
    } catch (err) {
      console.error("Share failed", err);
      alert("Unable to share. Please copy the link manually.");
    }
  };
  const assignedDoctorLabel =
    doctorsById?.[String(patient?.assignedDoctorId ?? patient?.assigned_doctor_id)] ||
    patient?.assignedDoctorName ||
    patient?.assigned_doctor_name ||
    patient?.assignedDoctor?.name ||
    patient?.assignedDoctor?.fullName ||
    "-";
  const allergiesValue = patient?.allergies || "-";
  const medicalHistoryValue = patient?.medical_hx || patient?.medicalHistory || "-";
  const primaryComplaintValue =
    patient?.primary_complaint || patient?.primaryComplaint || "-";

  return (
    <section className="view show">
      <style>
        {`
        @media print {
          body { background: #ffffff; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .ed-page, .ed-page * { visibility: visible !important; }
          @page { size: A4; margin: 8mm; }
          .sidebar, .topbar, .quick-actions, .sidebar-backdrop, .no-print { display: none !important; }
          .main { padding: 0 !important; margin: 0 !important; }
          .ed-wrapper { padding: 0 !important; background: #ffffff; display: block !important; }
          .ed-page { box-shadow: none; width: 180mm; margin: 0 auto; display: block !important; background: #ffffff; padding: 10mm 10mm 6mm; }
          .view { display: block !important; }
          .ed-title-row { margin: 4px 0 6px; }
          .ed-section { margin: 0 0 6px 0; padding: 2px 0; }
          .ed-section:not(:first-of-type) { padding-top: 0 !important; }
          .ed-section-header { margin-bottom: 3px; }
          .ed-section-title { white-space: normal; line-height: 1.3; }
          .ed-section-body { padding: 4px 0; }
          .ed-grid { gap: 6px 10px !important; }
          .plan-row { margin: 4px 0; padding: 6px 10px; }
        }
        .ed-subsection-header {
          margin-top: 8px;
          padding: 4px 10px;
          border-radius: 8px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
        }
        .ed-subsection-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #1f2937;
        }
        @media (max-width: 768px) {
          .ed-wrapper { padding: 12px; }
          .ed-page { width: 100%; padding: 16px; }
          .ed-header { grid-template-columns: 1fr; gap: 10px; text-align: left; }
          .ed-logo-wrap { margin: 0 auto 8px; width: 64px; height: 64px; }
          .ed-title-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .ed-section-header { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
          .ed-hospital-name,
          .ed-tagline,
          .ed-title-left h2,
          .ed-section-title,
          .ed-subtitle { white-space: normal; word-break: break-word; }
          .ed-value,
          .ed-multiline { overflow-wrap: anywhere; word-break: break-word; }
          .ed-grid, .ed-grid.ed-grid-2 { grid-template-columns: 1fr !important; }
          .plan-row { grid-template-columns: 1fr; }
          .ed-section { padding: 10px 0; }
          .ed-section-body { padding: 8px 6px; }
          .ed-section-body-top { margin-top: 8px; padding-top: 10px; }
        }
        .ed-section-body-top { margin-top: 6px; padding-top: 6px; }
        @media (max-width: 480px) {
          .ed-page { padding: 18px 16px; }
          .ed-grid { padding: 0 4px; }
          .ed-field { padding-left: 4px; }
          .plan-row { margin: 0 6px; }
        }
        `}
      </style>
      <div className="ed-wrapper">
        <div style={{ display: "flex", gap: 8 }} className="no-print">
          <button type="button" className="ed-print-btn" onClick={handlePrint}>
            Print / Save as PDF
          </button>
          <button type="button" className="ed-print-btn" onClick={handleShare}>
            Share
          </button>
        </div>

        <div className="ed-page">
          <div className="ed-top-bar" />

          <header className="ed-header">
            <div className="ed-logo-wrap">
              <img src="/images/logo.png" alt="Clinic Control Hub" className="ed-logo-img" />
            </div>
            <div className="ed-header-main">
              <h1 className="ed-hospital-name">Clinic</h1>
              <p className="ed-tagline">Examination &amp; Diagnosis Form</p>
              <div className="ed-header-meta">
                <p className="ed-contact">Patient overview across all visits</p>
                <p className="ed-contact">Generated from system records</p>
              </div>
            </div>
          </header>

          <div className="ed-title-row">
            <div className="ed-title-left">
              <h2>Patient Details</h2>
            </div>
            <div className="ed-title-right">
              <span className="ed-subtitle">{patient?.name || "Patient"}</span>
            </div>
          </div>

          <div className="ed-divider" />

          <section className="ed-section">
            <div className="ed-section-header">
              <span className="ed-section-title">Patient Details</span>
            </div>
            <div className="ed-section-body">
              <div className="ed-grid ed-grid-2">
                <div className="ed-field">
                  <span className="ed-label">Patient Name</span>
                  <span className="ed-value">{patient?.name || patient?.fullName || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">UHID / Patient ID</span>
                  <span className="ed-value">{patient?.userId || patient?.id || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Age / Sex</span>
                  <span className="ed-value">
                    {patient?.age ? `${patient.age}` : "-"} &nbsp;|&nbsp; {patient?.gender || "-"}
                  </span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Mobile</span>
                  <span className="ed-value">{patient?.mobile || patient?.phone || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Email</span>
                  <span className="ed-value">{patient?.email || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">City / Address</span>
                  <span className="ed-value">{patient?.city || patient?.address || "-"}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Assigned Doctor</span>
                  <span className="ed-value">{assignedDoctorLabel}</span>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Allergies</span>
                  <p className="ed-multiline">{allergiesValue}</p>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Medical History</span>
                  <p className="ed-multiline">{medicalHistoryValue}</p>
                </div>
                <div className="ed-field">
                  <span className="ed-label">Primary Complaint</span>
                  <p className="ed-multiline">{primaryComplaintValue}</p>
                </div>
              </div>
            </div>
          </section>

          <div className="ed-title-row">
            <div className="ed-title-left">
              <h2>Visit-wise Examination &amp; Plan</h2>
            </div>
            <div className="ed-title-right">
              <span className="ed-subtitle">{visits.length ? `${visits.length} visit(s)` : "No visits yet"}</span>
            </div>
          </div>

          {loading && <div className="muted-small" style={{ marginTop: 8 }}>Loading visit details...</div>}
          {error && (
            <div className="pill pill-soft" style={{ marginTop: 8, color: "#c2410c" }}>
              {error}
            </div>
          )}

          {visits.length === 0 && <div className="muted-small" style={{ padding: "12px 0" }}>No visits found for this patient.</div>}

          {visits.map((visit) => {
            const vid = String(visit.id);
            const examList = examItemsByVisit?.[vid] || [];
            const plan = planByVisit?.[vid];
            const diagnosis = diagnosisByVisit?.[vid];
            const planPayload = plan?.payload || plan || {};
            const procedures = planPayload.selectedProcedures || {};
            const procedureTeeth =
              planPayload.procedureTeeth || plan?.procedureTeeth || {};
            const procedureNotes =
              planPayload.procedureNotes || plan?.procedureNotes || {};
            const procedureList = Object.entries(procedures).flatMap(([catKey, items]) =>
              (items || []).map((name) => ({
                catKey,
                cat: catKey && String(catKey).includes("::")
                  ? String(catKey).split("::")[1]
                  : catKey,
                name,
              }))
            );
            const plannedVisits = planPayload.plannedVisits || planPayload.visitCount || planPayload.totalVisits || "";
            const selectedTeeth = planPayload.selectedTeeth || planPayload.teeth || plan?.selectedTeeth || [];
            const planNotes = planPayload.description || planPayload.planNotes || planPayload.othersText || "";
            const diagnosisSummary =
              diagnosis?.finalDescription ||
              diagnosis?.freeDescription ||
              diagnosis?.free_description ||
              visit.diagnosisFinalText ||
              visit.diagnosisFreeText ||
              planPayload.diagnosisSummary ||
              planPayload.diagnosis ||
              planPayload.summary ||
              "";
            const diagnosisNote =
              diagnosis?.freeDescription ||
              diagnosis?.free_description ||
              visit.diagnosisFreeText ||
              "";
            const chiefComplaint = planPayload.chiefComplaint || planPayload.complaint || "";
            const visitMeta = [
              formatDateDMY(visit.visitDate || visit.visit_date),
              visit.visitType,
              visit.status,
            ]
              .filter(Boolean)
              .join(" | ");
            const doctorLabel =
              visit.doctorName ||
              visit.doctor ||
              visit.doctorFullName ||
              visit.doctor?.name ||
              doctorsById?.[String(visit.doctorUserId ?? visit.doctorId)] ||
              doctorsById?.[String(patient?.assignedDoctorId ?? patient?.assigned_doctor_id)] ||
              patient?.assignedDoctorName ||
              "-";

            return (
              <section className="ed-section" key={vid}>
                <div className="ed-section-header">
                  <span className="ed-section-title">{visitMeta ? `Visit #${vid} - ${visitMeta}` : `Visit #${vid}`}</span>
                </div>

                <div className="ed-section-body ed-grid ed-grid-2 ed-section-body-top visit-summary-grid">
                  <div className="ed-field">
                    <span className="ed-label">Doctor / Consultant</span>
                    <span className="ed-value">{doctorLabel}</span>
                  </div>
                  <div className="ed-field">
                    <span className="ed-label">Planned visits</span>
                    <span className="ed-value">{plannedVisits || "-"}</span>
                  </div>
                  <div className="ed-field">
                    <span className="ed-label">Chief Complaint</span>
                    <p className="ed-multiline">{chiefComplaint || "-"}</p>
                  </div>
                  <div className="ed-field">
                    <span className="ed-label">Diagnosis</span>
                    <p className="ed-multiline">{diagnosisSummary || "-"}</p>
                  </div>
                  <div className="ed-field">
                    <span className="ed-label">Diagnosis Note</span>
                    <p className="ed-multiline">{diagnosisNote || "-"}</p>
                  </div>
                </div>

                <div className="ed-section-body">
                  <div className="ed-field">
                    <span className="ed-label">Examination Findings</span>
                    {examList.length === 0 ? (
                      <p className="ed-multiline">No examination details for this visit.</p>
                    ) : (
                      <ul className="bullet-list" style={{ paddingLeft: 18, margin: "6px 0" }}>
                        {examList.map((item, idx) => {
                          const teeth = formatTeethInline(item.selectedTeeth || []);
                          return (
                            <li key={item.itemKey || item.id || item.title || idx}>
                              <strong>{item.title || item.itemKey || "Finding"}:</strong>{" "}
                              {item.text || item.description || "-"}
                              {teeth ? ` (Teeth: ${teeth})` : ""}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="ed-subsection-header">
                    <span className="ed-subsection-title">Treatment / Management Plan</span>
                  </div>
                  <div className="ed-field" style={{ marginTop: 6 }}>
                    {planNotes && <p className="ed-multiline" style={{ marginBottom: 6 }}>{planNotes}</p>}
                    {procedureList.length === 0 ? (
                      <p className="ed-multiline">No treatment plan saved for this visit.</p>
                    ) : (
                      <div className="plan-list" style={{ marginTop: 6 }}>
                        {procedureList.map((proc, idx) => (
                            <div key={`${proc.catKey || "proc"}-${idx}`} className="plan-row">
                              <div>
                                <div className="text-main">
                                  {proc.name}
                                {(() => {
                                  const procKey = `${proc.catKey}::${proc.name}`;
                                  const teeth = procedureTeeth[procKey] || [];
                                  const label = formatTeethInline(teeth);
                                  return label ? ` - ${label}` : "";
                                })()}
                                </div>
                                <div className="muted-small">{proc.cat || "Procedure"}</div>
                                {(() => {
                                  const procKey = `${proc.catKey}::${proc.name}`;
                                  const note = (procedureNotes[procKey] || "").trim();
                                  return note ? (
                                    <div
                                      className="ed-multiline"
                                      style={{ marginTop: 4, color: "#64748b", fontSize: 12 }}
                                    >
                                      <span style={{ fontWeight: 600 }}>Procedure Notes:</span>{" "}
                                      {note}
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            <div className="pill pill-soft">Planned</div>
                            <div className="muted-small">{plannedVisits ? `${plannedVisits} visits` : ""}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}

          <div className="ed-bottom-bar" />
        </div>
      </div>
    </section>
  );
}


