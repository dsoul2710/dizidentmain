import React from "react";
import "./print-common.css";

export default function PostOperativeGuide({ data }) {
  if (!data) return null;
  const d = data;
  const points = (d.guideLines || [])
    .flatMap((line) =>
      String(line || "")
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .map((p) =>
      /[.!?]$/.test(p) ? p : `${p}.`
    );

  return (
    <div className="ed-wrapper">
      <button className="ed-print-btn no-print" onClick={() => window.print()}>
        Print / Save as PDF
      </button>

      <div className="ed-page">
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

          <div className="ed-section-body">
            <div className="ed-grid ed-grid-2">
              <div className="ed-field">
                <span className="ed-label">Patient Name</span>
                <span className="ed-value">{d.patientDetails.patientName}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Patient ID</span>
                <span className="ed-value">{d.patientDetails.uhid}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Age / Gender</span>
                <span className="ed-value">{d.patientDetails.ageSex}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Contact No.</span>
                <span className="ed-value">{d.patientDetails.contactNo}</span>
              </div>
              <div className="ed-field">
                <span className="ed-label">Treatment</span>
                <span className="ed-value">{d.patientDetails.treatment}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Post-Operative Instructions</span>
          </div>

          <div className="ed-section-body">
            <div className="post-op-guide">
              {points.map((text, index) => (
                <div key={index} className="guide-line">
                  <span className="guide-icon">🦷</span>
                  <span className="guide-text">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
