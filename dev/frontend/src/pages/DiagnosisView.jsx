// src/pages/DiagnosisView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Odontogram from "../components/odontogram/Odontogram.jsx";
import ClinicalExam from "../components/clinical/ClinicalExam.jsx";
import { API_BASE } from "../config";
import { formatDateDMY } from "../utils/dateFormat";

// ---------- Helpers for professional sentences ----------
const formatTeethPhrase = (teeth = []) => {
  const list = (teeth || []).filter(Boolean).map(String);
  if (!list.length) return "";

  // Segment shortcut: if the full segment is selected, use segment name
  const sorted = [...list].sort();
  const asSet = new Set(sorted);
  const matches = (expected) =>
    expected.length === sorted.length &&
    expected.every((t) => asSet.has(String(t)));

  const segments = [
    // Adult quadrants
    { teeth: ["11","12","13","14","15","16","17","18"], label: "upper left segment" },
    { teeth: ["21","22","23","24","25","26","27","28"], label: "upper right segment" },
    { teeth: ["31","32","33","34","35","36","37","38"], label: "lower left segment" },
    { teeth: ["41","42","43","44","45","46","47","48"], label: "lower right segment" },
    // Full mouth adult
    {
      teeth: ["11","12","13","14","15","16","17","18","21","22","23","24","25","26","27","28","31","32","33","34","35","36","37","38","41","42","43","44","45","46","47","48"],
      label: "full mouth",
    },
    // Primary quadrants
    { teeth: ["51","52","53","54","55"], label: "upper left segment (primary)" },
    { teeth: ["61","62","63","64","65"], label: "upper right segment (primary)" },
    { teeth: ["71","72","73","74","75"], label: "lower left segment (primary)" },
    { teeth: ["81","82","83","84","85"], label: "lower right segment (primary)" },
    // Full mouth primary
    {
      teeth: ["51","52","53","54","55","61","62","63","64","65","71","72","73","74","75","81","82","83","84","85"],
      label: "full mouth (primary)",
    },
  ];

  const seg = segments.find((s) => matches(s.teeth));
  if (seg) return seg.label;

  // Try to cover selection with segment + remaining teeth
  const coverage = [];
  let remaining = new Set(sorted);
  segments.forEach((s) => {
    if (s.teeth.every((t) => remaining.has(String(t)))) {
      coverage.push(s.label);
      s.teeth.forEach((t) => remaining.delete(String(t)));
    }
  });

  const remainingList = Array.from(remaining);
  const parts = [];
  if (coverage.length) parts.push(...coverage);
  if (remainingList.length === 1) parts.push(`tooth ${remainingList[0]}`);
  else if (remainingList.length === 2)
    parts.push(`teeth ${remainingList[0]} and ${remainingList[1]}`);
  else if (remainingList.length > 2) {
    const last = remainingList.pop();
    parts.push(`teeth ${remainingList.join(", ")} and ${last}`);
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

const ensureSentence = (text) => {
  const t = (text || "").trim();
  if (!t) return "";
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
};

const composeDiagnosisSentence = ({
  prefix = "After thorough clinical and radiographic examination,",
  diagnosisLabel = "",
  note = "",
  teeth = [],
}) => {
  const parts = [];
  const teethPhrase = formatTeethPhrase(teeth);
  if (diagnosisLabel) parts.push(diagnosisLabel);
  if (note) parts.push(note);
  if (teethPhrase) parts.push(`involving ${teethPhrase}`);

  const body = parts.join(" ").trim();
  if (!body) return "";
  return ensureSentence(`${prefix} ${body}`);
};

function getSelectedPatientIdFromCookie() {
  if (typeof document === "undefined") return null;
  const cookie = document.cookie || "";
  const parts = cookie.split(";").map((c) => c.trim());
  const found = parts.find((c) => c.startsWith("selectedPatientId="));
  if (!found) return null;
  return decodeURIComponent(found.split("=")[1]);
}

export default function DiagnosisView() {
  const [patientUserId, setPatientUserId] = useState(null);
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState("");
  const [visitExamItems, setVisitExamItems] = useState([]);

  const [odoMode, setOdoMode] = useState("adult");
  const [selectedTeeth, setSelectedTeeth] = useState([]);

  const [diagnosisNote, setDiagnosisNote] = useState("");

  const [reportType, setReportType] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [reportFiles, setReportFiles] = useState([]);
  const [existingReports, setExistingReports] = useState([]);

  const odoRef = useRef(null);

  // ---- Load patient id from cookie + keep in sync if header changes cookie ----
  useEffect(() => {
    const syncFromCookie = () => {
      const pid = getSelectedPatientIdFromCookie();
      setPatientUserId((prev) => {
        if (prev === (pid || null)) return prev;
        return pid || null;
      });
    };

    syncFromCookie();
    const id = setInterval(syncFromCookie, 1500);
    return () => clearInterval(id);
  }, []);

              <option value="">- None -</option>
  const ensureVisitForPatient = async (pUserId) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/patients/${pUserId}/visits/auto-create`,
        { method: "POST" }
      );
      if (!res.ok) {
        console.warn("Auto-create visit failed");
        return null;
      }
      const v = await res.json();
      return v;
    } catch (e) {
      console.error("Error auto-creating visit", e);
      return null;
    }
  };

  // Ensure there is a visit selected/created; returns numeric id
  const ensureActiveVisit = async () => {
    if (visitId) return Number(visitId);
    if (!patientUserId) return null;
    const created = await ensureVisitForPatient(patientUserId);
    if (created && created.id) {
      setVisitId(String(created.id));
      setVisits((prev) => {
        const exists = prev.find((v) => v.id === created.id);
        return exists ? prev : [created, ...prev];
      });
      return created.id;
    }
    return null;
  };

  // ---- Load visits for patient ----
  useEffect(() => {
    if (!patientUserId) {
      setVisits([]);
      setVisitId("");
      return;
    }

    const loadVisits = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/patients/${patientUserId}/visits`
        );
        if (!res.ok) {
          console.error("Failed to load visits for patient", patientUserId);
          return;
        }
        let data = await res.json();
        let list = Array.isArray(data) ? data : [];

        if (!list.length) {
          const created = await ensureVisitForPatient(patientUserId);
          if (created) {
            list = [created];
          }
        }

        setVisits(list);
        if (!visitId && list.length > 0) {
          setVisitId(String(list[0].id));
        }
      } catch (e) {
        console.error("Error loading visits", e);
      }
    };

    loadVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientUserId]);

  // ---- When visit changes: load exam items + diagnosis detail + report files ----
  useEffect(() => {
    if (!visitId) {
      setVisitExamItems([]);
      setSelectedTeeth([]);
      setDiagnosisNote("");
      setReportType("");
      setReportNote("");
      setExistingReports([]);
      return;
    }

    const vid = visitId;

    // 1) load exam items
    const loadVisitExamItems = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/visits/${vid}/exam-items`);
        if (!res.ok) {
          console.error("Failed to load visit exam items", vid);
          setVisitExamItems([]);
          setSelectedTeeth([]);
          return;
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setVisitExamItems(list);

        const firstWithTeeth =
          list.find(
            (it) =>
              Array.isArray(it.selectedTeeth) &&
              it.selectedTeeth.length > 0
          ) || null;

        if (firstWithTeeth) {
          setOdoMode(firstWithTeeth.odontogramMode || "adult");
          setSelectedTeeth(firstWithTeeth.selectedTeeth || []);
        } else {
          setOdoMode("adult");
          setSelectedTeeth([]);
        }
      } catch (e) {
        console.error("Error loading visit exam items", e);
        setVisitExamItems([]);
        setSelectedTeeth([]);
      }
    };

    // 2) load diagnosis detail (freeDescription + reportType + reportNote, etc.)
    const loadDiagnosisDetail = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/visits/${vid}/diagnosis-detail`
        );
        if (!res.ok) {
          return;
        }
        const dto = await res.json();

        setDiagnosisNote(dto.freeDescription || dto.free_description || "");

        setReportType(
          dto.reportType ||
            dto.report_type ||
            dto.reportKind ||
            dto.report_kind ||
            ""
        );
        setReportNote(
          dto.reportNote ||
            dto.report_note ||
            dto.reportDescription ||
            dto.report_description ||
            ""
        );

        if (dto.odontogramMode) {
          setOdoMode(dto.odontogramMode);
        }
        if (Array.isArray(dto.selectedTeeth)) {
          setSelectedTeeth(dto.selectedTeeth);
        }
      } catch (e) {
        console.error("Error loading diagnosis detail", e);
      }
    };

    // 3) load list of report files
    const loadReportFiles = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/visits/${vid}/diagnosis-report-files`
        );
        if (!res.ok) {
          setExistingReports([]);
          return;
        }
        const files = await res.json();
        setExistingReports(Array.isArray(files) ? files : []);
      } catch (e) {
        console.error("Error loading diagnosis report files", e);
        setExistingReports([]);
      }
    };

    loadVisitExamItems();
    loadDiagnosisDetail();
    loadReportFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId]);

  const handleReportSave = async () => {
    if (!patientUserId) {
      alert("No patient selected.");
      return;
    }

    const numericVisitId = await ensureActiveVisit();
    if (!numericVisitId) {
      alert("No visit selected.");
      return;
    }

    try {
      const diagPayload = {
        patientUserId: Number(patientUserId),
        visitId: numericVisitId,
        reportType,
        reportNote,
      };

      const diagRes = await fetch(`${API_BASE}/api/visits/diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diagPayload),
      });

      if (!diagRes.ok) throw new Error("Failed to save report info");

      // Upload files if chosen
      if (reportFiles && reportFiles.length) {
        const fd = new FormData();
        reportFiles.forEach((f) => fd.append("files", f));
        if (reportType) fd.append("reportType", reportType);
        if (reportNote) fd.append("reportNote", reportNote);

        const uploadRes = await fetch(
          `${API_BASE}/api/visits/${numericVisitId}/diagnosis-report`,
          {
            method: "POST",
            body: fd,
          }
        );
        if (!uploadRes.ok) {
          console.warn("Report upload failed");
        }
      }

      // Refresh existingReports list
      try {
        const res = await fetch(
          `${API_BASE}/api/visits/${numericVisitId}/diagnosis-report-files`
        );
        if (res.ok) {
          const files = await res.json();
          setExistingReports(Array.isArray(files) ? files : []);
        }
      } catch (e) {
        console.error("Error reloading report files", e);
      }

      alert("Diagnosis report saved.");
    } catch (err) {
      console.error(err);
      alert("Error saving diagnosis report.");
    }
  };

  // ---- Derived composed description ----
  const clinicalExamBlock = useMemo(() => {
    if (!visitExamItems || !visitExamItems.length) return "";
    const lines = visitExamItems.map((e) =>
      (() => {
        const teethPhrase = formatTeethPhrase(e.selectedTeeth || []);
        const suffix = teethPhrase ? ` - ${teethPhrase}` : "";
        return ` - ${e.title || e.itemKey}: ${e.text || ""}${suffix}`.trim();
      })()
    );
    return "Clinical Examination:\n" + lines.join("\n");
  }, [visitExamItems]);

  const diagnosisPreview = useMemo(
    () =>
      composeDiagnosisSentence({
        diagnosisLabel: "",
        note: diagnosisNote,
        teeth: selectedTeeth,
      }),
    [diagnosisNote, selectedTeeth]
  );

  const composedDescription = useMemo(() => {
    return clinicalExamBlock || "";
  }, [clinicalExamBlock]);

  useEffect(() => {
    const next = (composedDescription || "").trim();
    window.__diagnosisPreview = next;
    window.dispatchEvent(new CustomEvent("diagnosis-preview", { detail: next }));
  }, [composedDescription]);

  useEffect(() => {
    return () => {
      window.__diagnosisPreview = "";
      window.dispatchEvent(new CustomEvent("diagnosis-preview", { detail: "" }));
    };
  }, []);

  // ---- ClinicalExam change ----
  const handleExamChange = (itemsForActiveTab) => {
    if (!Array.isArray(itemsForActiveTab) || !itemsForActiveTab.length)
      return;
    const active = itemsForActiveTab[0];
    const key = active.key;

    setVisitExamItems((prev) => {
      const existing = prev || [];
      const idx = existing.findIndex((x) => x.itemKey === key);
      const updatedItem = {
        ...existing[idx],
        itemKey: key,
        title: active.title,
        text: active.text,
        odontogramMode: odoMode,
        selectedTeeth: [...selectedTeeth],
      };

      if (idx === -1) {
        return [...existing, updatedItem];
      } else {
        const copy = [...existing];
        copy[idx] = updatedItem;
        return copy;
      }
    });
  };

  // ---- Final Save Diagnosis ----
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!patientUserId) {
      alert("No patient selected.");
      return;
    }
    const numericVisitId = await ensureActiveVisit();
    if (!numericVisitId) {
      alert("No visit selected.");
      return;
    }

    try {
      // 1) Save all exam items
      if (visitExamItems && visitExamItems.length) {
        await Promise.all(
          visitExamItems.map((item) => {
            const payload = {
              visitId: numericVisitId,
              itemKey: item.itemKey,
              text: item.text || "",
              odontogramMode: item.odontogramMode || odoMode,
              selectedTeeth: item.selectedTeeth || [],
            };
            return fetch(
              `${API_BASE}/api/visits/${numericVisitId}/exam-items`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            );
          })
        );
      }

      // 2) Save diagnosis summary
      const diagPayload = {
        patientUserId: Number(patientUserId),
        visitId: numericVisitId,
        odontogramMode: odoMode,
        selectedTeeth,
        freeDescription: diagnosisNote,
        finalDescription: composedDescription,
        examFindings: (visitExamItems || []).map((e) => ({
          itemKey: e.itemKey,
          title: e.title,
          description: e.text,
          section: "CLINICAL_EXAM",
          abnormal: e.isAbnormal ?? true,
        })),
        reportType,
        reportNote,
      };

      const diagRes = await fetch(`${API_BASE}/api/visits/diagnosis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diagPayload),
      });
      if (!diagRes.ok) throw new Error("Failed to save diagnosis");
      const diagJson = await diagRes.json();
      const savedVisitId = diagJson.visitId || numericVisitId;

      // 3) Upload report files (if any)
      if (reportFiles && reportFiles.length) {
        const fd = new FormData();
        reportFiles.forEach((f) => fd.append("files", f));
        if (reportType) fd.append("reportType", reportType);
        if (reportNote) fd.append("reportNote", reportNote);

        const uploadRes = await fetch(
          `${API_BASE}/api/visits/${savedVisitId}/diagnosis-report`,
          {
            method: "POST",
            body: fd,
          }
        );
        if (!uploadRes.ok) {
          console.warn("Report upload failed");
        }
      }

      alert("Diagnosis saved successfully.");
    } catch (err) {
      console.error(err);
      alert("Error while saving diagnosis.");
    }
  };

  // ---- Render ----
  if (!patientUserId) {
    return (
      <section id="view-diagnosis" className="view show">
        <div className="page-header">
          <div>
            <h2>Examination &amp; Diagnosis</h2>
            <div className="page-subtitle">Clinical exam notes and diagnosis records.</div>
          </div>
        </div>
        <div className="page-body">
          <div className="panel">
            <p>
              No patient selected.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="view-diagnosis" className="view show">
      <div className="page-header">
        <div>
          <h2>Examination &amp; Diagnosis</h2>
          <div className="page-subtitle">Document findings, odontogram, and reports.</div>
        </div>
      </div>

      <div className="page-body">
        <form className="form-grid" onSubmit={handleSubmit}>
        {/* Visit selector */}
        <div className="colspan">
          <label>Visit</label>
          <select
            value={visitId}
            onChange={(e) => {
              setVisitId(e.target.value);
              setSelectedTeeth([]);
              setOdoMode("adult");
              setDiagnosisNote("");
              setReportType("");
              setReportNote("");
              setExistingReports([]);
            }}
          >
            {!visitId && <option value="">- Select Visit -</option>}
            {visits.map((v) => (
              <option key={v.id} value={v.id}>
                {formatDateDMY(v.visitDate || v.visit_date)}{" "}
                {v.visitType ? `(${v.visitType})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Main row */}
        <div className="colspan">
          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                flex: "1 1 320px",
                minWidth: "320px",
              }}
            >
              <label>Clinical Examination</label>
              <ClinicalExam
                visitId={visitId ? Number(visitId) : null}
                value={visitExamItems}
                onChange={handleExamChange}
                selectedTeeth={selectedTeeth}
                odontogramMode={odoMode}
                ensureVisitId={ensureActiveVisit}
                onSelectedTeethChange={setSelectedTeeth}
                onOdoModeChange={setOdoMode}
              />
            </div>

            <div
              style={{
                flex: "1 1 320px",
                minWidth: "320px",
              }}
            >
              <label>Odontogram</label>
              <div ref={odoRef}>
                <Odontogram
                  mode={odoMode}
                  onModeChange={setOdoMode}
                  value={selectedTeeth}
                  onChange={setSelectedTeeth}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Diagnosis builder */}
        <div className="colspan">
          <div className="exam-card">
            <label style={{ marginTop: 8 }}>Diagnosis note</label>
            <textarea
              rows={3}
              value={diagnosisNote}
              onChange={(e) => setDiagnosisNote(e.target.value)}
              placeholder="e.g., radiolucency in apical portion suggestive of pericoronitis"
            />

            <div
              style={{
                marginTop: 8,
                padding: "8px 12px",
                border: "1px dashed #ccc",
                borderRadius: 10,
                background: "#fafbff",
                fontSize: 14,
              }}
            >
              <strong>Preview:</strong>{" "}
              <span style={{ color: "#2f3b52" }}>
                {diagnosisPreview || "Add a note or select teeth to auto-compose"}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnosis Reports */}
        <div className="colspan">
          <div className="exam-card">
            <div className="exam-card-head section-head">
              <strong>Diagnosis Reports</strong>
            </div>

            <label style={{ marginTop: "8px" }}>Report Type</label>
            <select
              name="report_type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="">- None -</option>
              <option value="xray">X-ray</option>
              <option value="cbct">CBCT</option>
              <option value="blood">Blood Report</option>
              <option value="urine">Urine Report</option>
              <option value="other">Other</option>
            </select>

            <label style={{ marginTop: "8px" }}>Report Description</label>
            <textarea
              id="report-note-box"
              className="exam-text"
              rows={3}
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder="Short note about this report..."
            />

            <label style={{ marginTop: "8px" }}>Attach Report</label>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length > 5) {
                  alert("You can upload up to 5 files.");
                  e.target.value = "";
                  setReportFiles([]);
                  return;
                }
                setReportFiles(files);
              }}
            />

            <div style={{ marginTop: "12px" }}>
              <button
                type="button"
                className="btn sm primary"
                onClick={handleReportSave}
              >
                Save
              </button>
            </div>

            {existingReports.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <strong>Uploaded Reports:</strong>
                <ul style={{ marginTop: "4px" }}>
                  {existingReports.map((name, idx) => (
                    <li key={idx}>
                      <a
                        href={`${API_BASE}/api/visits/${visitId}/diagnosis-report-file?fileName=${encodeURIComponent(
                          name
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="actions">
          <button className="btn primary" type="submit">
            Save Diagnosis
          </button>
        </div>
        </form>
      </div>
    </section>
  );
}

