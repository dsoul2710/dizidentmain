import React from "react";
import { formatDateDMY } from "../../utils/dateFormat";
import VisitPicker from "./VisitPicker";
import Prescription from "../../components/print/Prescription.jsx";
import "../../components/print/print-common.css";

const toAgeSex = (p) =>
  p && (p.age != null || p.gender) ? `${p.age ?? ""}${p.gender ? ` | ${p.gender}` : ""}` : "";

const formatDate = (value) => {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return formatDateDMY(dt);
};

const formatDose = (dose) => {
  if (!dose) return "";
  const lowered = String(dose).toLowerCase();
  
  // Handle new specific timing options
  if (lowered.includes("once") && lowered.includes("morning")) return "1 - 0 - 0";
  if (lowered.includes("once") && lowered.includes("afternoon")) return "0 - 1 - 0";
  if (lowered.includes("once") && lowered.includes("evening")) return "0 - 0 - 1";
  
  // Handle generic options
  if (lowered.includes("once")) return "1 - 0 - 0";
  if (lowered.includes("twice")) return "1 - 1 - 0";
  if (lowered.includes("thrice") || lowered.includes("3")) return "1 - 1 - 1";
  if (lowered.includes("stat")) return "STAT";
  
  // Handle manual format
  const parts = String(dose)
    .split(/[x\-]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 3) return `${parts[0]} - ${parts[1]} - ${parts[2]}`;
  if (parts.length === 2) return `${parts[0]} - ${parts[1]} - 0`;
  if (parts.length === 1) return `${parts[0]} - 0 - 0`;
  return String(dose);
};

const buildPrintData = ({ prescription, visits, visitId, patient }) => {
  if (!prescription) return null;
  const visit = visits.find((v) => String(v.id) === String(visitId));
  const rxDate = prescription.rxDate || visit?.visitDate || visit?.visit_date || "";
  const items = Array.isArray(prescription.items) ? prescription.items : [];

  const rxList = items.map((it, idx) => {
    const freqMain = formatDose(it.dose || it.timings || "");
    const freqNote = it.timings && it.timings !== it.dose ? it.timings : "";
    const durationVal = it.duration || (it.days != null ? String(it.days) : "");
    const duration = durationVal ? (String(durationVal).includes("day") ? durationVal : `${durationVal} day(s)`) : "";
    const qty = it.volume || it.quantity || "";

    return {
      sr: idx + 1,
      drugName: it.medicineName || "-",
      strength: it.medicineContents || "",
      instruction: it.instructions || "",
      frequency: freqMain,
      frequencyNote: freqNote,
      duration: duration,
      quantity: qty,
    };
  });

  return {
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
      patientName: patient?.name || patient?.fullName || "Patient",
      uhid: patient?.userId || patient?.id || "",
      ageSex: toAgeSex(patient),
      visitDate: formatDate(rxDate),
      contactNo: patient?.mobile || patient?.phone || "",
    },
    rxList,
    advice: {
      general: prescription.notes || "Follow the instructions and contact the clinic if symptoms persist.",
      followUp: "As advised.",
    },
    consultantLine: "",
  };
};

export default function PatientReportsPage({ prescription, visits, visitId, onVisitChange, patient }) {
  const printData = buildPrintData({ prescription, visits, visitId, patient });

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
        }
        @media (max-width: 768px) {
          .ed-wrapper { padding: 12px; }
          .ed-page { width: 100%; padding: 14px; }
          .ed-header { grid-template-columns: 1fr; gap: 10px; text-align: left; }
          .ed-logo-wrap { margin: 0 auto 8px; width: 64px; height: 64px; }
          .ed-title-row { flex-direction: column; align-items: flex-start; gap: 6px; }
          .ed-section-header { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
          .ed-section-title,
          .ed-subtitle { white-space: normal; word-break: break-word; }
          .ed-value,
          .ed-multiline { overflow-wrap: anywhere; word-break: break-word; }
          .rx-patient-line { flex-direction: column; gap: 8px; }
        }
        `}
      </style>
      <div className="panel patient-reports-panel">
        <div className="panel-header">
          <h3>My Medicines</h3>
        </div>
        <div className="panel-body patient-reports-body">
          <VisitPicker visits={visits} visitId={visitId} onChange={onVisitChange} />
          {!visitId && <div className="muted-small">Select a visit to view prescription.</div>}
          {visitId && !printData && (
            <div className="muted-small" style={{ textAlign: "center", padding: "12px 0" }}>
              No prescription found for this visit.
            </div>
          )}
          {printData && <Prescription data={printData} />}
        </div>
      </div>
    </section>
  );
}
