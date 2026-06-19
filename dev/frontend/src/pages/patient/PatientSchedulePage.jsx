import React, { useState, useMemo } from "react";
import VisitPicker from "./VisitPicker.jsx";
import { formatDateDMY } from "../../utils/dateFormat";

export default function PatientSchedule({
  visits,
  visitId,
  onVisitChange,
  appointments,
  loading,
}) {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const parseDate = (str) => {
    if (!str) return null;
    const clean = String(str).trim().slice(0, 10);
    const parts = clean.split("-");
    if (parts.length < 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]) - 1;
    const d = Number(parts[2]);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
    return new Date(y, m, d);
  };

  const dateKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  const getApptDateKey = (appt) => {
    const raw = appt?.date || appt?.appointmentDate;
    const dt = parseDate(raw);
    return dt ? dateKey(dt) : "";
  };

  const todayKey = dateKey(new Date());

  const recentAppointments = useMemo(() => {
    const list = (appointments || []).filter((a) => {
      const key = getApptDateKey(a);
      return key && key < todayKey;
    });
    return list.sort((a, b) => {
      const da = getApptDateKey(a);
      const db = getApptDateKey(b);
      if (da !== db) return db.localeCompare(da);
      return String(a.slot || "").localeCompare(String(b.slot || ""));
    });
  }, [appointments, todayKey]);

  const upcomingAppointments = useMemo(() => {
    const list = (appointments || []).filter((a) => {
      const key = getApptDateKey(a);
      return key && key >= todayKey;
    });
    return list.sort((a, b) => {
      const da = getApptDateKey(a);
      const db = getApptDateKey(b);
      if (da !== db) return da.localeCompare(db);
      return String(a.slot || "").localeCompare(String(b.slot || ""));
    });
  }, [appointments, todayKey]);

  const goToPrevApptMonth = () => {
    const ref = calendarMonth || new Date();
    const all = (appointments || [])
      .map((a) => parseDate(a.date || a.appointmentDate))
      .filter(Boolean)
      .sort((a, b) => a - b);
    const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();
    const currentKey = monthKey(ref);
    const prev = [...all].reverse().find((d) => monthKey(d) < currentKey);
    const target = prev || all[0];
    if (target) setCalendarMonth(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  const goToNextApptMonth = () => {
    const ref = calendarMonth || new Date();
    const all = (appointments || [])
      .map((a) => parseDate(a.date || a.appointmentDate))
      .filter(Boolean)
      .sort((a, b) => a - b);
    const monthKey = (d) => d.getFullYear() * 12 + d.getMonth();
    const currentKey = monthKey(ref);
    const next = all.find((d) => monthKey(d) > currentKey);
    const target = next || all[all.length - 1];
    if (target) setCalendarMonth(new Date(target.getFullYear(), target.getMonth(), 1));
  };

  const groupedByDate = useMemo(() => {
    const map = {};
    (appointments || []).forEach((a) => {
      const date = a.date || a.appointmentDate || "Unknown";
      if (!map[date]) map[date] = [];
      map[date].push(a);
    });
    return map;
  }, [appointments]);

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const apptDays = new Set(
    (appointments || [])
      .map((a) => parseDate(a.date || a.appointmentDate))
      .filter(Boolean)
      .map((dt) =>
        dt.getMonth() === month && dt.getFullYear() === year ? dt.getDate() : null
      )
      .filter(Boolean)
  );

  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  return (
    <section className="view show">
      <div className="card">
        <div className="card-header border-bottom">
          <h6 className="mb-0 fw-bold text-lg">Appointment Schedule</h6>
        </div>
        <div className="card-body">
          <VisitPicker visits={visits} visitId={visitId} onChange={onVisitChange} />
          <div className="row gy-4 mt-3">
            <div className="col-xxl-7">
              <div className="schedule-section">
                <div className="schedule-section-title">Upcoming appointments</div>
                {loading && (
                  <div className="schedule-empty">Loading appointments.</div>
                )}
                {!loading && upcomingAppointments.length === 0 && (
                  <div className="schedule-empty">No upcoming appointments.</div>
                )}
                <div className="d-flex flex-column gap-3">
                {upcomingAppointments.map((a) => {
                  const dateStr = a.date || a.appointmentDate || "-";
                  const slot = a.slot || a.startTime || "Time TBD";
                  const status = (a.status || "BOOKED").toUpperCase();
                  const statusColor =
                    status.includes("CANCEL")
                      ? "#ef4444"
                      : status.includes("DONE")
                      ? "#16a34a"
                      : "#2563eb";
                  const dt = parseDate(dateStr);
                  const prettyDate = dt ? formatDateDMY(dt) : dateStr;
                  const dayNum = dt ? dt.getDate() : "";
                  const monthStr = dt
                    ? dt.toLocaleString("default", { month: "short" }).toUpperCase()
                    : "";
                  return (
                    <div
                      key={a.id}
                      className="p-3 rounded-3 border bg-light"
                      style={{ boxShadow: "0 6px 20px rgba(15,23,42,0.08)" }}
                    >
                      <div className="d-flex justify-content-between align-items-center gap-3">
                        <div className="d-flex gap-3 align-items-center">
                          <div
                            className="text-white d-flex flex-column justify-content-center align-items-center rounded-3"
                            style={{
                              width: 44,
                              height: 44,
                              background: "#1d4ed8",
                              boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", opacity: 0.9 }}>
                              {monthStr || "---"}
                            </div>
                            <div style={{ fontSize: "1.1rem", lineHeight: 1 }}>
                              {dayNum || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="fw-semibold">{prettyDate}</div>
                            <div className="text-secondary-light fw-semibold mt-1">
                              {slot} - {a.description || "Scheduled"}
                            </div>
                          </div>
                        </div>
                        <span
                          className="badge rounded-pill"
                          style={{
                            background: `${statusColor}22`,
                            color: statusColor,
                          }}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="text-secondary-light mt-2">
                        Doctor: <strong>{a.doctorName || a.doctor || "-"}</strong> - Visit:{" "}
                        {a.visitId || "-"}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              <div className="schedule-section">
                <div className="schedule-section-title">Recent appointments</div>
                {!loading && recentAppointments.length === 0 && (
                  <div className="schedule-empty">No recent appointments.</div>
                )}
                <div className="d-flex flex-column gap-3">
                {recentAppointments.map((a) => {
                  const dateStr = a.date || a.appointmentDate || "-";
                  const slot = a.slot || a.startTime || "Time TBD";
                  const status = (a.status || "BOOKED").toUpperCase();
                  const statusColor =
                    status.includes("CANCEL")
                      ? "#ef4444"
                      : status.includes("DONE")
                      ? "#16a34a"
                      : "#2563eb";
                  const dt = parseDate(dateStr);
                  const prettyDate = dt ? formatDateDMY(dt) : dateStr;
                  const dayNum = dt ? dt.getDate() : "";
                  const monthStr = dt
                    ? dt.toLocaleString("default", { month: "short" }).toUpperCase()
                    : "";
                  return (
                    <div
                      key={`recent-${a.id}`}
                      className="p-3 rounded-3 border bg-light"
                      style={{ boxShadow: "0 6px 20px rgba(15,23,42,0.08)" }}
                    >
                      <div className="d-flex justify-content-between align-items-center gap-3">
                        <div className="d-flex gap-3 align-items-center">
                          <div
                            className="text-white d-flex flex-column justify-content-center align-items-center rounded-3"
                            style={{
                              width: 44,
                              height: 44,
                              background: "#64748b",
                              boxShadow: "0 4px 14px rgba(100,116,139,0.35)",
                            }}
                          >
                            <div style={{ fontSize: "0.7rem", opacity: 0.9 }}>
                              {monthStr || "---"}
                            </div>
                            <div style={{ fontSize: "1.1rem", lineHeight: 1 }}>
                              {dayNum || "-"}
                            </div>
                          </div>
                          <div>
                            <div className="fw-semibold">{prettyDate}</div>
                            <div className="text-secondary-light fw-semibold mt-1">
                              {slot} - {a.description || "Scheduled"}
                            </div>
                          </div>
                        </div>
                        <span
                          className="badge rounded-pill"
                          style={{
                            background: `${statusColor}22`,
                            color: statusColor,
                          }}
                        >
                          {status}
                        </span>
                      </div>
                      <div className="text-secondary-light mt-2">
                        Doctor: <strong>{a.doctorName || a.doctor || "-"}</strong> - Visit:{" "}
                        {a.visitId || "-"}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            <div className="col-xxl-5">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() =>
                    setCalendarMonth(
                      (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)
                    )
                  }
                >
                  Prev
                </button>
                <div className="fw-semibold">
                  {calendarMonth.toLocaleString("default", { month: "long" })} {year}
                </div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() =>
                    setCalendarMonth(
                      (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)
                    )
                  }
                >
                  Next
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={goToPrevApptMonth}
                  title="Jump to previous appointment month"
                >
                  Prev Appt
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={goToNextApptMonth}
                  title="Jump to next appointment month"
                >
                  Next Appt
                </button>
              </div>
              <div
                className="p-2 rounded-3 border bg-white"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 6,
                  fontSize: "0.85rem",
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className="text-secondary-light text-center fw-semibold"
                  >
                    {d}
                  </div>
                ))}
                {calendarCells.map((d, idx) => (
                  <div
                    key={idx}
                    className="d-flex align-items-center justify-content-center rounded-2"
                    style={{
                      height: 40,
                      background: d && apptDays.has(d) ? "rgba(59,130,246,0.12)" : "#fff",
                      border: d && apptDays.has(d) ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                      color: "#0f172a",
                    }}
                  >
                    {d || ""}
                  </div>
                ))}
              </div>
              {apptDays.size > 0 && (
                <div className="text-secondary-light mt-2">
                  Days highlighted have appointments.
                </div>
              )}
              {groupedByDate && Object.keys(groupedByDate).length > 0 && (
                <div className="text-secondary-light mt-3">
                  {Object.keys(groupedByDate).length} upcoming appointment dates.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
