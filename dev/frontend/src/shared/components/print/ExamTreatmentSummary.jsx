import React from "react";
import { formatDateDMY } from "@/shared/utils/dateFormat";
import "@/shared/components/print/print-common.css";

// Simple printable exam + treatment summary
export default function ExamTreatmentSummary({ patient, visit, examItems, treatmentPlan }) {
  if (!patient || !visit) return null;

  const examList = Array.isArray(examItems) ? examItems : [];
  const plan = treatmentPlan?.payload || treatmentPlan || {};
  const planProcedures = plan.selectedProcedures || {};
  const planTeeth = plan.selectedTeeth || [];

  const groupedProcs = Object.entries(planProcedures).map(([cat, items]) => ({
    cat,
    items: items || [],
  }));

  return (
    <div className="ed-wrapper">
      <button className="ed-print-btn no-print" onClick={() => window.print()}>
        Print / Save as PDF
      </button>

      <div className="ed-page">
        <div className="ed-top-bar" />

        <header className="ed-header">
          <div className="ed-logo-wrap">
            <img src="/images/logo.png" alt="Clinic Control Hub" className="ed-logo-img" />
          </div>
          <div className="ed-header-main">
            <h1 className="ed-hospital-name">Clinic</h1>
            <p className="ed-tagline">Examination &amp; Treatment Summary</p>
            <p className="ed-contact">Visit ID: {visit.id}</p>
          </div>
        </header>

        <div className="ed-title-row">
          <div className="ed-title-left">
            <h2>Patient Summary</h2>
          </div>
          <div className="ed-title-right">
            <span className="ed-subtitle">Exam + Treatment</span>
          </div>
        </div>

        <div className="ed-divider" />

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Patient Details</span>
          </div>
          <div className="ed-section-body ed-grid ed-grid-2">
            <div className="ed-field">
              <span className="ed-label">Patient Name</span>
              <span className="ed-value">{patient.name || "Patient"}</span>
            </div>
            <div className="ed-field">
              <span className="ed-label">Patient ID</span>
              <span className="ed-value">{patient.userId || patient.id || "-"}</span>
            </div>
            <div className="ed-field">
              <span className="ed-label">Age / Gender</span>
              <span className="ed-value">
                {patient.age != null ? patient.age : "-"} {patient.gender ? `| ${patient.gender}` : ""}
              </span>
            </div>
            <div className="ed-field">
              <span className="ed-label">Visit Date</span>
              <span className="ed-value">{formatDateDMY(visit.visitDate || visit.visit_date) || ""}</span>
            </div>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Examination Findings</span>
          </div>
          <div className="ed-section-body">
            {examList.length === 0 && <div className="ed-value">No exam items found.</div>}
            {examList.length > 0 && (
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {examList.map((it, idx) => (
                  <li key={idx} style={{ marginBottom: 6 }}>
                    <strong>{it.title || it.itemKey}</strong>
                    {it.text ? `: ${it.text}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Treatment Plan</span>
          </div>
          <div className="ed-section-body">
            <div className="ed-field">
              <span className="ed-label">Selected Teeth</span>
              <span className="ed-value">{planTeeth.join(", ") || "-"}</span>
            </div>
            {groupedProcs.length === 0 && (
              <div className="ed-value" style={{ marginTop: 6 }}>
                No treatment procedures recorded.
              </div>
            )}
            {groupedProcs.length > 0 && (
              <div style={{ marginTop: 8 }}>
                {groupedProcs.map((g, idx) => (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: "#1f2937" }}>{g.cat}</div>
                    <ul style={{ paddingLeft: 18, margin: "4px 0" }}>
                      {g.items.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
