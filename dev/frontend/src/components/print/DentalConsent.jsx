import React from "react";
import "./print-common.css";

const formatSectionText = (rows = []) =>
  rows.map((r) => (r.value ? `• ${r.label ? r.label + ": " : ""}${r.value}` : "")).filter(Boolean).join("\n\n");

export default function DentalConsent({ data }) {
  if (!data) return null;
  const d = data;

  const summaryText = d.informedSummary || formatSectionText(d.procedureRows || []);

  return (
    <div className="ed-wrapper">
      <button className="ed-print-btn no-print" onClick={() => window.print()}>
        Print / Save as PDF
      </button>

      <div className="ed-page ed-page-consent">
        <div className="ed-top-bar" />

        <header className="ed-header">
          <div className="ed-logo-wrap">
            {d.hospital.logo ? (
              <img src={d.hospital.logo} alt={d.hospital.name} className="ed-logo-img" />
            ) : (
              <div className="ed-logo-img" />
            )}
          </div>
          <div className="ed-header-main">
            <h1 className="ed-hospital-name">{d.hospital.name}</h1>
            <p className="ed-tagline">{d.hospital.tagline}</p>
            <p className="ed-contact">{d.hospital.address}</p>
            <p className="ed-contact">
              {d.hospital.contactLine} • {d.hospital.regNo}
            </p>
          </div>
        </header>

        <div className="ed-title-row">
          <div className="ed-title-left">
            <h2>{d.formMeta.title}</h2>
          </div>
          <div className="ed-title-right">
            <span className="ed-subtitle">{d.formMeta.subtitle}</span>
          </div>
        </div>

        <div className="ed-divider" />

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Patient Details</span>
          </div>
          <div className="ed-section-body consent-compact-body">
            <div className="consent-field-grid">
              <div className="consent-field-line">
                <span className="consent-field-label">Patient Name:</span>
                <span className="consent-field-value">{d.patientDetails.patientName}</span>
              </div>
              <div className="consent-field-line">
                <span className="consent-field-label">Patient ID:</span>
                <span className="consent-field-value">{d.patientDetails.uhid}</span>
              </div>
              <div className="consent-field-line">
                <span className="consent-field-label">Age / Gender:</span>
                <span className="consent-field-value">{d.patientDetails.ageSex}</span>
              </div>
              <div className="consent-field-line">
                <span className="consent-field-label">Mobile:</span>
                <span className="consent-field-value">{d.patientDetails.contactNo}</span>
              </div>
              <div className="consent-field-line consent-field-full">
                <span className="consent-field-label">Address:</span>
                <span className="consent-field-value">{d.patientDetails.address}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Treatment / Procedure Details</span>
          </div>
          <div className="ed-section-body consent-compact-body">
            <div className="consent-field-grid">
              <div className="consent-field-line consent-field-full">
                <span className="consent-field-label">Proposed Procedure:</span>
                <span className="consent-field-value">{d.procedureDetails.procedureName}</span>
              </div>
              <div className="consent-field-line">
                <span className="consent-field-label">Teeth / Region Involved:</span>
                <span className="consent-field-value">{d.procedureDetails.teethInvolved}</span>
              </div>
              <div className="consent-field-line">
                <span className="consent-field-label">Planned Date:</span>
                <span className="consent-field-value">{d.procedureDetails.plannedDate}</span>
              </div>
              <div className="consent-field-line consent-field-full">
                <span className="consent-field-label">Clinical Diagnosis:</span>
                <span className="consent-field-value">{d.procedureDetails.diagnosis}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ed-section consent-summary-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Informed Consent Summary</span>
          </div>
          <div className="ed-section-body">
            <p className="ed-multiline">{summaryText}</p>

            <div className="consent-place-row">
              <div>
                <span className="consent-place-label">Place: </span>
                <span className="consent-place-value">{d.placeDate.place}</span>
              </div>
              <div>
                <span className="consent-place-label">Date: </span>
                <span className="consent-place-value">{d.placeDate.date}</span>
              </div>
            </div>

            <div className="consent-signature-row">
              <div className="consent-signature-block">
                <div className="consent-sign-line" />
                <div className="consent-sign-label">Patient / Guardian</div>
              </div>
              <div className="consent-signature-block">
                <div className="consent-sign-line" />
                <div className="consent-sign-label">Witness</div>
              </div>
              <div className="consent-signature-block">
                <div className="consent-sign-line" />
                <div className="consent-sign-label">Treating Dentist</div>
              </div>
            </div>

            <p className="consent-note">
              *For minors or patients unable to consent, the form should be signed by a parent or legally authorised representative.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
