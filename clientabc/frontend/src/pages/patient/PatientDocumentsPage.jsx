import React, { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../config";

const getDocMeta = (href) => {
  const clean = String(href || "").split("?")[0];
  const ext = clean.includes(".") ? clean.split(".").pop().toLowerCase() : "";
  if (ext === "pdf") return { type: "PDF", icon: "PDF" };
  if (["png", "jpg", "jpeg", "webp"].includes(ext)) return { type: "Image", icon: "IMG" };
  return { type: "Document", icon: "DOC" };
};

export default function PatientDocumentsPage({ patient, visitId, patientUserId }) {
  const [diagnosisFiles, setDiagnosisFiles] = useState([]);
  const [allDiagnosisFiles, setAllDiagnosisFiles] = useState([]);
  const [reportFiles, setReportFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visitId) {
      setDiagnosisFiles([]);
      return;
    }

    const loadFiles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/visits/${visitId}/diagnosis-report-files`);
        if (!res.ok) {
          setDiagnosisFiles([]);
          return;
        }
        const data = await res.json();
        setDiagnosisFiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load diagnosis report files", err);
        setDiagnosisFiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [visitId]);

  useEffect(() => {
    const pid = patientUserId || patient?.userId || null;
    if (visitId || !pid) {
      setAllDiagnosisFiles([]);
      return;
    }

    const loadAllDiagnosis = async () => {
      setLoading(true);
      try {
        const visitsRes = await fetch(`${API_BASE_URL}/patients/${pid}/visits`);
        if (!visitsRes.ok) {
          setAllDiagnosisFiles([]);
          return;
        }
        const visits = await visitsRes.json();
        const list = Array.isArray(visits) ? visits : [];
        const results = await Promise.all(
          list.map(async (v) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/visits/${v.id}/diagnosis-report-files`
              );
              if (!res.ok) return [];
              const files = await res.json();
              const names = Array.isArray(files) ? files : [];
              return names.map((name) => ({
                visitId: v.id,
                visitLabel: v.visitDate || v.visit_date || "",
                name,
              }));
            } catch {
              return [];
            }
          })
        );
        setAllDiagnosisFiles(results.flat());
      } catch (err) {
        console.error("Failed to load diagnosis reports", err);
        setAllDiagnosisFiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllDiagnosis();
  }, [visitId, patientUserId, patient?.userId]);

  useEffect(() => {
    const pid = patientUserId || patient?.userId || null;
    if (!pid) {
      setReportFiles([]);
      return;
    }
    const loadReports = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${pid}/reports-files`);
        if (!res.ok) {
          setReportFiles([]);
          return;
        }
        const data = await res.json();
        setReportFiles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load report files", err);
        setReportFiles([]);
      }
    };
    loadReports();
  }, [patientUserId, patient?.userId]);

  const links = useMemo(() => {
    const pid = patientUserId || patient?.userId || null;
    const list = [];
    if (pid && (patient?.hasIdFile || patient?.hasIdFile === undefined)) {
      list.push({
        label: "ID / Insurance",
        href: `${API_BASE_URL}/patients/${pid}/id-file`,
      });
    }
    if (pid && (patient?.hasReportFile || patient?.hasReportFile === undefined)) {
      if (reportFiles.length === 0) {
        list.push({
          label: "Reports",
          href: `${API_BASE_URL}/patients/${pid}/reports-file`,
        });
      } else {
        reportFiles.forEach((name) => {
          list.push({
            label: `Report: ${name}`,
            href: `${API_BASE_URL}/patients/${pid}/reports-file?fileName=${encodeURIComponent(name)}`,
          });
        });
      }
    }
    if (visitId && diagnosisFiles.length) {
      diagnosisFiles.forEach((name) => {
        list.push({
          label: `Diagnosis: ${name}`,
          href: `${API_BASE_URL}/visits/${visitId}/diagnosis-report-file?fileName=${encodeURIComponent(name)}`,
        });
      });
    } else if (!visitId && allDiagnosisFiles.length) {
      allDiagnosisFiles.forEach((entry) => {
        const labelSuffix = entry.visitId ? ` (Visit #${entry.visitId})` : "";
        list.push({
          label: `Diagnosis${labelSuffix}: ${entry.name}`,
          href: `${API_BASE_URL}/visits/${entry.visitId}/diagnosis-report-file?fileName=${encodeURIComponent(entry.name)}`,
        });
      });
    }
    return list;
  }, [patient, visitId, diagnosisFiles, allDiagnosisFiles, patientUserId, reportFiles]);

  return (
    <section className="view show">
      <div className="panel">
        <div className="panel-body">
          <div className="mydocs-hero">
            <div className="mydocs-hero-text">
              <div className="mydocs-kicker">Patient Library</div>
              <h3 className="mydocs-title">My Documents</h3>
              <p className="mydocs-subtitle">
                Keep your reports, prescriptions, and files ready for your next visit. Tap a card to open.
              </p>
            </div>
            <div className="mydocs-hero-card">
              <div className="mydocs-hero-label">Stored files</div>
              <div className="mydocs-hero-count">{links.length}</div>
              <div className="mydocs-hero-meta">Auto-saved from clinic uploads</div>
            </div>
          </div>

          {!visitId && (
            <div className="mydocs-empty">
              <div className="mydocs-empty-icon">New</div>
              <div className="mydocs-empty-title">Select a visit</div>
              <div className="mydocs-empty-text">Choose a visit to load diagnosis report files.</div>
            </div>
          )}

          {visitId && loading && (
            <div className="mydocs-empty">
              <div className="mydocs-empty-icon">Wait</div>
              <div className="mydocs-empty-title">Loading documents...</div>
              <div className="mydocs-empty-text">Fetching files for this visit.</div>
            </div>
          )}

          {visitId && !loading && links.length === 0 && (
            <div className="mydocs-empty">
              <div className="mydocs-empty-icon">New</div>
              <div className="mydocs-empty-title">No documents yet</div>
              <div className="mydocs-empty-text">Your clinic files will appear here once uploaded.</div>
            </div>
          )}

          {links.length > 0 && (
            <div className="mydocs-grid">
              {links.map((l, idx) => {
                const meta = getDocMeta(l.href);
                return (
                  <a key={`${l.href}-${idx}`} className="mydocs-card" href={l.href} target="_blank" rel="noreferrer">
                    <div className="mydocs-card-top">
                      <div className="mydocs-icon">{meta.icon}</div>
                      <span className="mydocs-type">{meta.type}</span>
                    </div>
                    <div className="mydocs-card-title">{l.label}</div>
                    <div className="mydocs-card-action">Open document</div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
