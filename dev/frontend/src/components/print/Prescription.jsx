import React from "react";
import { formatDateDMY } from "../../utils/dateFormat";
import "./print-common.css";

const defaultRxData = {
  hospital: {
    name: "CLINIC",
    tagline: "Prescription",
    address: "",
    contactLine: "",
    regNo: "",
    logo: "/images/logo.png",
  },
  formMeta: {
    title: "Prescription / Medicine Order",
    subtitle: "Outpatient Prescription",
  },
  patientDetails: {
    patientName: "Patient Name",
    uhid: "UHID-0001",
    ageSex: "30 | M",
    visitDate: formatDateDMY(new Date()),
    contactNo: "",
  },
  rxList: [
    {
      sr: 1,
      drugName: "Amoxicillin 500 mg",
      strength: "",
      instruction: "Swallow whole with water.",
      frequency: "1 - 0 - 1",
      frequencyNote: "After food",
      duration: "5 days",
      quantity: "10 tablets",
    },
  ],
    advice: {
    general: "• Drink plenty of water and take adequate rest.\n• Report back if fever persists beyond 3 days.\n• Avoid self-medication and over-the-counter antibiotics.",
    followUp: "Next follow-up after 3 days or earlier if symptoms worsen.",
  },
  consultantLine: "",
};

const formatCurrency = (value) => {
  if (value == null || isNaN(value)) return "";
  return `₹ ${(Number(value) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function Prescription({ data }) {
  const d = data || defaultRxData;

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
          <div className="ed-section-body rx-patient-line">
            <div>
              <span className="rx-patient-label">Patient Name: </span>
              <span className="rx-patient-value">{d.patientDetails.patientName}</span>
            </div>
            <div>
              <span className="rx-patient-label">Age: </span>
              <span className="rx-patient-value">{d.patientDetails.ageSex.split("|")[0]?.trim()}</span>
            </div>
            <div>
              <span className="rx-patient-label">Gender: </span>
              <span className="rx-patient-value">{d.patientDetails.ageSex.split("|")[1]?.trim()}</span>
            </div>
            <div>
              <span className="rx-patient-label">Date: </span>
              <span className="rx-patient-value">
                {formatDateDMY(d.patientDetails.visitDate) || d.patientDetails.visitDate}
              </span>
            </div>
          </div>
          <div className="ed-section-body rx-patient-line">
            <div>
              <span className="rx-patient-label">Patient ID / UHID: </span>
              <span className="rx-patient-value">{d.patientDetails.uhid}</span>
            </div>
            <div>
              <span className="rx-patient-label">Contact No.: </span>
              <span className="rx-patient-value">{d.patientDetails.contactNo}</span>
            </div>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">Prescription</span>
          </div>
          <div className="ed-section-body">
            <table className="rx-table">
              <thead>
                <tr>
                  <th className="rx-col-sr">Rx</th>
                  <th>Medicine</th>
                  <th>
                    <div>Frequency</div>
                    <div className="rx-th-sub">(MN • AF • NT)</div>
                  </th>
                  <th>Duration</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {(d.rxList || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="rx-col-sr">{item.sr || idx + 1}</td>
                    <td>
                      <div className="rx-drug-name">{item.drugName}</div>
                      {item.strength && (
                        <div className="rx-drug-strength">{item.strength}</div>
                      )}
                      {item.instruction && (
                        <div className="rx-drug-note">{item.instruction}</div>
                      )}
                    </td>
                    <td>
                      <div className="rx-freq-main">{item.frequency}</div>
                      {item.frequencyNote && (
                        <div className="rx-freq-note">{item.frequencyNote}</div>
                      )}
                    </td>
                    <td>
                      <div className="rx-duration-main">{item.duration}</div>
                    </td>
                    <td>
                      <div className="rx-qty-main">{item.quantity}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ed-section">
          <div className="ed-section-header">
            <span className="ed-section-title">General Advice / Instructions</span>
          </div>
          <div className="ed-section-body">
            <div className="rx-advice-box">
              <p className="rx-advice-text">{d.advice.general}</p>
            </div>

            <div className="rx-followup-line">
              <span className="rx-followup-label">Next Follow-up: </span>
              <span className="rx-followup-value">{d.advice.followUp}</span>
            </div>

            <p className="rx-note">
              *This is a computer-generated prescription. Signature not required if sent digitally.
            </p>

            <div className="ed-sign-block">
              <div className="ed-sign-line" />
              <div className="ed-sign-text">Doctor&apos;s Signature</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
