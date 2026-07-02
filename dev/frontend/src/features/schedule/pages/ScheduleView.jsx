// src/pages/ScheduleView.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import PatientSelect from "@/shared/components/common/PatientSelect";
import "@/features/chat/pages/chat.css";
import "@/features/schedule/pages/ScheduleView.css";
import { formatDateDMY } from "@/shared/utils/dateFormat";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Generate 30-min slots from 9:00 AM to 11:30 PM
const TIME_SLOTS = (() => {
  const slots = [];
  let hour = 9;
  let minute = 0;

  while (hour < 24) {
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    const ampm = hour < 12 ? "AM" : "PM";
    const mm = String(minute).padStart(2, "0");
    slots.push(`${h12}:${mm} ${ampm}`);

    minute += 30;
    if (minute >= 60) {
      minute = 0;
      hour += 1;
    }
  }
  return slots.filter((t) => t !== "12:00 AM");
})();

const TODAY = new Date();
const INITIAL_RANGE_DAYS = 30;

// Helper to store dates
const dateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// Normalize slot strings for safe comparison
const normalizeSlot = (s) => (s || "").trim().toUpperCase();
const formatDateLabel = (value) => formatDateDMY(value) || value || "-";

const initialsFor = (value) => {
  const safe = (value || "").trim();
  if (!safe) return "?";
  const parts = safe.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

// ---- Cookie helpers (for doctor panel) ----
function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

export default function ScheduleView({
  apiBaseUrl = "/api",
  panelType = "ORG", // "ORG" or "DOCTOR"
  currentUser, // expected to have .id for doctorUserId
}) {
  const [viewDate, setViewDate] = useState(
    () => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  
  // Date range filter
  const [filterType, setFilterType] = useState("thisweek"); // "thisweek", "custom", or "all"
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const start = new Date(TODAY);
    start.setDate(start.getDate() - start.getDay()); // Sunday of current week
    return start;
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const end = new Date(TODAY);
    end.setDate(end.getDate() + (6 - end.getDay())); // Saturday of current week
    return end;
  });

  // Appointments for all dates (we will filter)
  const [meetings, setMeetings] = useState([]);

  // Patients list (used in ADMIN mode)
  const [patients, setPatients] = useState([]);

  // Visits for the selected patient
  const [visits, setVisits] = useState([]);
  const [visitId, setVisitId] = useState("");

  // Form for booking
  const [form, setForm] = useState({
    patientId: "",
    doctorId: "", // kept but not used (doctor decided by role / backend)
    description: "",
  });

  // Which appointment is selected (for right panel)
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [editAppointmentOpen, setEditAppointmentOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    date: "",
    slot: "",
    visitId: "",
    description: "",
  });
  const [editVisits, setEditVisits] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // --- LOAD PATIENTS only for ORG panel ---
  useEffect(() => {
    if (panelType !== "ORG") return;

    const fetchPatients = async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/patients`);
        if (!res.ok) throw new Error("Failed to load patients");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setPatients(arr);
      } catch (e) {
        console.error("Error fetching patients", e);
        setPatients([]);
      }
    };

    fetchPatients();
  }, [apiBaseUrl, panelType]);

  const [cookiePatientId, setCookiePatientId] = useState(() => {
    return panelType === "DOCTOR" ? getCookie("selectedPatientId") || "" : "";
  });

  // --- Sync selectedPatientId cookie / custom event for Doctors ---
  useEffect(() => {
    if (panelType !== "DOCTOR") return;

    const syncFromCookie = () => {
      const pid = getCookie("selectedPatientId") || "";
      setCookiePatientId((prev) => {
        if (prev === pid) return prev;
        return pid;
      });
    };
    syncFromCookie();

    window.addEventListener("patient-changed", syncFromCookie);
    const id = setInterval(syncFromCookie, 1500);

    return () => {
      window.removeEventListener("patient-changed", syncFromCookie);
      clearInterval(id);
    };
  }, [panelType]);

  // --- Resolve patientId depending on panel type ---
  const effectivePatientId =
    panelType === "DOCTOR"
      ? cookiePatientId
      : form.patientId;

  // --- Resolve doctorUserId depending on panel type ---
  const doctorUserId =
    panelType === "DOCTOR"
      ? (() => {
          const id = currentUser?.id ?? currentUser?.userId ?? null;
          return id != null ? Number(id) : null;
        })()
      : null; // ORG: always null - backend will use assignedDoctor

  // console logs (you can remove later)
  console.log("ScheduleView -> currentUser:", currentUser);
  console.log("ScheduleView -> doctorUserId:", doctorUserId);

  const fetchVisitsForPatient = async (patientId, setter) => {
    if (!patientId) {
      setter([]);
      return;
    }

    try {
      const res = await fetch(
        `${apiBaseUrl}/patients/${encodeURIComponent(patientId)}/visits`
      );
      if (!res.ok) throw new Error("Failed to load visits");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setter(arr);
    } catch (e) {
      console.error("Error fetching visits", e);
      setter([]);
    }
  };

  // --- Load visits when patient changes ---
  useEffect(() => {
    if (!effectivePatientId) {
      setVisits([]);
      setVisitId("");
      return;
    }

    fetchVisitsForPatient(effectivePatientId, setVisits);
  }, [apiBaseUrl, effectivePatientId]);

  const fetchAppointmentsInRange = async (fromDate, toDate) => {
    try {
      const from = dateKey(fromDate);
      const to = dateKey(toDate);
      const res = await fetch(
        `${apiBaseUrl}/appointments/range?from=${from}&to=${to}`
      );
      if (!res.ok) throw new Error("Failed to load appointments");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setMeetings(arr);
    } catch (e) {
      console.error("Error fetching appointments", e);
      setMeetings([]);
    }
  };

  // Initial: load next 30 days only
  useEffect(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + INITIAL_RANGE_DAYS);
    fetchAppointmentsInRange(start, end);
  }, [apiBaseUrl]);

  // When month changes, load that month from backend
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0);
    fetchAppointmentsInRange(from, to);
  }, [apiBaseUrl, viewDate]);

  const todayKey = dateKey(TODAY);
  const selectedKey = dateKey(selectedDate);

  const { weeks, monthLabel } = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const rows = [];
    let date = 1;

    for (let i = 0; i < 6; i++) {
      const row = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          row.push(null);
        } else if (date > daysInMonth) {
          row.push(null);
        } else {
          row.push(date);
          date++;
        }
      }
      rows.push(row);
      if (date > daysInMonth) break;
    }

    return {
      weeks: rows,
      monthLabel: `${MONTH_NAMES[month]} ${year}`,
    };
  }, [viewDate]);

  const handlePrevMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const nextDate = new Date(year, month - 1, 1);
    setViewDate(nextDate);
    setSelectedDate(nextDate);
    setSelectedSlot(null);
    setSelectedMeetingId(null);
  };

  const handleNextMonth = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const nextDate = new Date(year, month + 1, 1);
    setViewDate(nextDate);
    setSelectedDate(nextDate);
    setSelectedSlot(null);
    setSelectedMeetingId(null);
  };

  const handleJumpToToday = () => {
    const todayDate = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
    setViewDate(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
    setSelectedDate(todayDate);
    setSelectedSlot(null);
    setSelectedMeetingId(null);
  };
  const handleDateClick = (day) => {
    if (!day) return;
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(d);
    setSelectedSlot(null);
    setSelectedMeetingId(null);
  };

  const isSameDay = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const resolveMeetingDate = (meeting) => {
    const key = meeting?.dateKey || meeting?.date;
    if (!key) return null;
    const parts = key.split("-");
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map((val) => Number(val));
    if (!year || !month || !day) return null;
    const dt = new Date(year, month - 1, day);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  };

  const handleSelectMeeting = (meeting) => {
    if (!meeting) return;
    setSelectedMeetingId(meeting.id);
    setEditAppointmentOpen(false);
    const dt = resolveMeetingDate(meeting);
    if (dt) {
      setSelectedDate(dt);
      setViewDate(new Date(dt.getFullYear(), dt.getMonth(), 1));
    }
  };

  const meetingsForSelectedDate = useMemo(() => {
    const key = dateKey(selectedDate);
    const list = meetings.filter(
      (m) => m.dateKey === key || m.date === key
    );
    return list.sort(
      (a, b) => TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot)
    );
  }, [meetings, selectedDate]);

  const todayMeetings = useMemo(() => {
    const list = meetings.filter(
      (m) => m.dateKey === todayKey || m.date === todayKey
    );
    return list.sort(
      (a, b) => TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot)
    );
  }, [meetings]);

  // Upcoming meetings (future dates beyond today)
  const upcomingMeetings = useMemo(() => {
    const todayStr = todayKey;

    const list = meetings.filter((m) => {
      const d = m.dateKey || m.date;
      return d && d > todayStr;
    });

    return list.sort((a, b) => {
      const da = a.dateKey || a.date;
      const db = b.dateKey || b.date;
      if (da !== db) return da.localeCompare(db);
      return TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot);
    });
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    let result = meetings;
    
    // Apply date range filter
    if (filterType === "thisweek" || filterType === "custom") {
      const startKey = dateKey(filterStartDate);
      const endKey = dateKey(filterEndDate);
      result = result.filter((m) => {
        const mDate = m.dateKey || m.date;
        return mDate >= startKey && mDate <= endKey;
      });
    }
    // If filterType === "all", no date filtering
    
    // Apply search filter
    const query = (appointmentSearch || "").trim().toLowerCase();
    if (!query) return result;
    return result.filter((m) => {
      const name = (m.patientName || "").toLowerCase();
      const mobile = String(m.patientMobile || "");
      return name.includes(query) || mobile.includes(query);
    });
  }, [meetings, appointmentSearch, filterType, filterStartDate, filterEndDate]);

  const meetingsForSelectedDateFiltered = useMemo(() => {
    const key = dateKey(selectedDate);
    const list = filteredMeetings.filter(
      (m) => m.dateKey === key || m.date === key
    );
    return list.sort(
      (a, b) => TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot)
    );
  }, [filteredMeetings, selectedDate]);

  const todayMeetingsFiltered = useMemo(() => {
    const list = filteredMeetings.filter(
      (m) => m.dateKey === todayKey || m.date === todayKey
    );
    return list.sort(
      (a, b) => TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot)
    );
  }, [filteredMeetings]);

  const selectedPatientMeetings = useMemo(() => {
    if (panelType !== "DOCTOR" || !effectivePatientId) return [];
    return filteredMeetings.filter((m) => {
      const pid = m.patientUserId ?? m.patientId;
      return pid != null && String(pid) === String(effectivePatientId);
    });
  }, [filteredMeetings, panelType, effectivePatientId]);

  const selectedPatientRecentMeetings = useMemo(() => {
    const todayStr = todayKey;
    const list = selectedPatientMeetings.filter((m) => {
      const d = m.dateKey || m.date;
      return d && d < todayStr;
    });
    return list.sort((a, b) => {
      const da = a.dateKey || a.date;
      const db = b.dateKey || b.date;
      if (da !== db) return db.localeCompare(da);
      return TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot);
    });
  }, [selectedPatientMeetings]);

  const selectedPatientUpcomingMeetings = useMemo(() => {
    const todayStr = todayKey;
    const list = selectedPatientMeetings.filter((m) => {
      const d = m.dateKey || m.date;
      return d && d > todayStr;
    });
    return list.sort((a, b) => {
      const da = a.dateKey || a.date;
      const db = b.dateKey || b.date;
      if (da !== db) return da.localeCompare(db);
      return TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot);
    });
  }, [selectedPatientMeetings]);

  const upcomingMeetingsFiltered = useMemo(() => {
    const todayStr = todayKey;

    const list = filteredMeetings.filter((m) => {
      const d = m.dateKey || m.date;
      return d && d > todayStr;
    });

    return list.sort((a, b) => {
      const da = a.dateKey || a.date;
      const db = b.dateKey || b.date;
      if (da !== db) return da.localeCompare(db);
      return TIME_SLOTS.indexOf(a.slot) - TIME_SLOTS.indexOf(b.slot);
    });
  }, [filteredMeetings]);

  const isSlotBooked = (slot) =>
    meetingsForSelectedDate.some(
      (m) => normalizeSlot(m.slot) === normalizeSlot(slot)
    );

  const handleModalBackdropClick = (e) => {
    if (e.target.classList.contains("modal")) {
      setShowSlotModal(false);
      setShowAddModal(false);
      setEditAppointmentOpen(false);
    }
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfirm = async () => {
    if (!selectedSlot) {
      alert("Please select a time slot.");
      return;
    }

    if (!effectivePatientId) {
      alert("Please select a patient first.");
      return;
    }

    if (isSlotBooked(selectedSlot)) {
      alert("This time slot is already booked for the selected date.");
      return;
    }

    if (panelType === "DOCTOR" && !doctorUserId) {
      console.error("Doctor panel but doctorUserId is missing!", {
        currentUser,
        doctorUserId,
      });
      alert("Doctor id is missing - check login / user object.");
      return;
    }

    try {
      let finalVisitId = visitId;

      // If user chose "NEW_VISIT" option - create visit first
      if (visitId === "NEW_VISIT") {
        const newVisitPayload = {
          patientUserId: Number(effectivePatientId),
          doctorUserId: doctorUserId, // for DOCTOR; null for ORG
          visitType: "NEW",
          chiefComplaint: form.description || "",
          notes: form.description || "",
          createdByUserId: currentUser?.id ?? currentUser?.userId ?? null,
        };

        const resVisit = await fetch(`${apiBaseUrl}/visits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newVisitPayload),
        });
        if (!resVisit.ok) throw new Error("Failed to create visit");
        const createdVisit = await resVisit.json();
        finalVisitId = createdVisit.id;
        setVisits((prev) => [...prev, createdVisit]);
      }

      const appointmentPayload = {
        date: selectedKey, // "YYYY-MM-DD"
        slot: selectedSlot,
        patientUserId: Number(effectivePatientId),
        doctorUserId: doctorUserId, // DOCTOR id, ORG null
        visitId: finalVisitId || null,
        description: form.description || "",
        createdByUserId: currentUser?.id ?? currentUser?.userId ?? null,
      };

      const resAppt = await fetch(`${apiBaseUrl}/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentPayload),
      });
      if (!resAppt.ok) throw new Error("Failed to create appointment");
      const createdAppt = await resAppt.json();

      setMeetings((prev) => [...prev, createdAppt]);
      setSelectedMeetingId(createdAppt.id);
      setShowAddModal(false);
      setShowSlotModal(false);

      const label = `${formatDateDMY(selectedDate)} at ${selectedSlot}`;
      alert("Appointment booked:\n" + label);
    } catch (e) {
      console.error(e);
      alert("Error while booking appointment, please try again.");
    }
  };

  const selectedMeeting = useMemo(
    () => meetings.find((m) => m.id === selectedMeetingId) || null,
    [meetings, selectedMeetingId]
  );

  const handleCancelAppointment = async () => {
    if (!selectedMeeting) return;
    if (
      !window.confirm(
        `Cancel this appointment for ${
          selectedMeeting.patientName || "patient"
        } at ${selectedMeeting.slot}?`
      )
    ) {
      return;
    }

    try {
      await fetch(`${apiBaseUrl}/appointments/${selectedMeeting.id}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error("Error cancelling appointment", e);
    }

    const updated = meetings.filter((m) => m.id !== selectedMeeting.id);
    setMeetings(updated);
    setSelectedMeetingId(null);
  };

  const isSlotBookedForEdit = (dateValue, slotValue, doctorId, excludeId) => {
    const normalizedSlot = normalizeSlot(slotValue);
    return meetings.some((m) => {
      const sameDate = (m.dateKey || m.date) === dateValue;
      if (!sameDate) return false;
      if (normalizeSlot(m.slot) !== normalizedSlot) return false;
      if (m.id === excludeId) return false;
      const meetingDoctor = m.doctorUserId ?? null;
      return doctorId == null
        ? meetingDoctor == null
        : String(meetingDoctor) === String(doctorId);
    });
  };

  const handleEditAppointmentStart = async () => {
    if (!selectedMeeting) return;
    setEditAppointmentOpen(true);
    setEditForm({
      date: selectedMeeting.dateKey || selectedMeeting.date || "",
      slot: selectedMeeting.slot || "",
      visitId: selectedMeeting.visitId ? String(selectedMeeting.visitId) : "",
      description: selectedMeeting.description || "",
    });
    setEditLoading(true);
    await fetchVisitsForPatient(selectedMeeting.patientUserId, setEditVisits);
    setEditLoading(false);
  };

  const handleUpdateAppointment = async () => {
    if (!selectedMeeting) return;
    if (!editForm.date || !editForm.slot) {
      alert("Please select date and time.");
      return;
    }

    const doctorId = selectedMeeting.doctorUserId ?? null;
    if (
      isSlotBookedForEdit(
        editForm.date,
        editForm.slot,
        doctorId,
        selectedMeeting.id
      )
    ) {
      alert("This time slot is already booked for the selected date.");
      return;
    }

    const payload = {
      date: editForm.date,
      slot: editForm.slot,
      visitId: editForm.visitId ? Number(editForm.visitId) : null,
      description: editForm.description || "",
    };

    try {
      const res = await fetch(`${apiBaseUrl}/appointments/${selectedMeeting.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update appointment");
      const updated = await res.json();

      setMeetings((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
      setSelectedMeetingId(updated.id);
      setEditAppointmentOpen(false);

      const nextDate = resolveMeetingDate(updated);
      if (nextDate) {
        setSelectedDate(nextDate);
        setViewDate(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
      }
    } catch (e) {
      console.error("Error updating appointment", e);
      alert("Unable to update appointment. Please try again.");
    }
  };

  return (
    <section id="view-schedule" className="view show appointment-chat">
      <div className="chat-wrapper">
        <div className="chat-sidebar card">
          <div className="chat-sidebar-single active top-profile">
            <div className="img">
              <div className="chat-avatar">AP</div>
            </div>
            <div className="info">
              <h6 className="text-md mb-0">Appointments</h6>
              <p className="mb-0">{monthLabel}</p>
            </div>
            <div className="action text-end">
              {filteredMeetings.length > 0 && (
                <span className="chat-count">{filteredMeetings.length}</span>
              )}
            </div>
          </div>

          <div className="chat-search">
            <span className="icon">
              <i className="ri-search-line"></i>
            </span>
            <input
              type="search"
              placeholder="Search by patient name or mobile"
              value={appointmentSearch}
              onChange={(e) => setAppointmentSearch(e.target.value)}
            />
          </div>

          {/* Date Range Filter */}
          <div style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#f9fafb"
          }}>
            <div style={{ marginBottom: "8px", fontSize: "12px", fontWeight: "600", color: "#6b7280" }}>Filter by Date</div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  setFilterType("thisweek");
                  const start = new Date(TODAY);
                  start.setDate(start.getDate() - start.getDay());
                  const end = new Date(TODAY);
                  end.setDate(end.getDate() + (6 - end.getDay()));
                  setFilterStartDate(start);
                  setFilterEndDate(end);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: filterType === "thisweek" ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  backgroundColor: filterType === "thisweek" ? "#eff6ff" : "#fff",
                  color: filterType === "thisweek" ? "#1f2937" : "#6b7280",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: filterType === "thisweek" ? "600" : "500"
                }}
              >
                This Week
              </button>
              <button
                onClick={() => setFilterType("custom")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: filterType === "custom" ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  backgroundColor: filterType === "custom" ? "#eff6ff" : "#fff",
                  color: filterType === "custom" ? "#1f2937" : "#6b7280",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: filterType === "custom" ? "600" : "500"
                }}
              >
                Custom
              </button>
              <button
                onClick={() => setFilterType("all")}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: filterType === "all" ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  backgroundColor: filterType === "all" ? "#eff6ff" : "#fff",
                  color: filterType === "all" ? "#1f2937" : "#6b7280",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: filterType === "all" ? "600" : "500"
                }}
              >
                All
              </button>
            </div>
            {(filterType === "custom" || filterType === "thisweek") && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}>
                <div style={{ flex: "1", minWidth: "120px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>From</label>
                  <input
                    type="date"
                    value={filterStartDate.toISOString().split("T")[0]}
                    onChange={(e) => setFilterStartDate(new Date(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "13px"
                    }}
                  />
                </div>
                <div style={{ flex: "1", minWidth: "120px" }}>
                  <label style={{ display: "block", fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>To</label>
                  <input
                    type="date"
                    value={filterEndDate.toISOString().split("T")[0]}
                    onChange={(e) => setFilterEndDate(new Date(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "4px",
                      fontSize: "13px"
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="chat-all-list schedule-list">
            {panelType === "DOCTOR" && effectivePatientId && (
              <>
                <div className="schedule-list-section">
                  <div className="schedule-list-label">Selected Patient - Recent</div>
                  {selectedPatientRecentMeetings.length === 0 && (
                    <div className="schedule-list-empty">No recent appointments.</div>
                  )}
                  {selectedPatientRecentMeetings.slice(0, 10).map((meeting) => {
                    const dateLabel = meeting.dateKey || meeting.date || "";
                    const isActive = selectedMeetingId === meeting.id;
                    return (
                      <div
                        key={`recent-${meeting.id}`}
                        className={`chat-sidebar-single${isActive ? " active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectMeeting(meeting)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSelectMeeting(meeting);
                        }}
                      >
                        <div className="img">
                          <div className="chat-avatar chat-avatar--sm">
                            {initialsFor(meeting.patientName)}
                          </div>
                        </div>
                        <div className="info">
                          <h6 className="text-sm mb-1">{meeting.patientName || "Patient"}</h6>
                          <p className="mb-0 text-xs">
                            {meeting.slot || "Time"} {dateLabel ? `- ${formatDateLabel(dateLabel)}` : ""}
                          </p>
                        </div>
                        <div className="action text-end">
                          <p className="mb-0 text-neutral-400 text-xs lh-1">{formatDateLabel(dateLabel)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="schedule-list-section">
                  <div className="schedule-list-label">Selected Patient - Upcoming</div>
                  {selectedPatientUpcomingMeetings.length === 0 && (
                    <div className="schedule-list-empty">No upcoming appointments.</div>
                  )}
                  {selectedPatientUpcomingMeetings.slice(0, 20).map((meeting) => {
                    const dateLabel = meeting.dateKey || meeting.date || "";
                    const isActive = selectedMeetingId === meeting.id;
                    return (
                      <div
                        key={`upcoming-${meeting.id}`}
                        className={`chat-sidebar-single${isActive ? " active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectMeeting(meeting)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSelectMeeting(meeting);
                        }}
                      >
                        <div className="img">
                          <div className="chat-avatar chat-avatar--sm">
                            {initialsFor(meeting.patientName)}
                          </div>
                        </div>
                        <div className="info">
                          <h6 className="text-sm mb-1">{meeting.patientName || "Patient"}</h6>
                          <p className="mb-0 text-xs">
                            {meeting.slot || "Time"} {dateLabel ? `- ${formatDateLabel(dateLabel)}` : ""}
                          </p>
                        </div>
                        <div className="action text-end">
                          <p className="mb-0 text-neutral-400 text-xs lh-1">{formatDateLabel(dateLabel)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="schedule-list-section">
              <div className="schedule-list-label">Today</div>
              {todayMeetingsFiltered.length === 0 && (
                <div className="schedule-list-empty">No appointment scheduled today.</div>
              )}
              {todayMeetingsFiltered.map((meeting) => {
                const dateLabel = meeting.dateKey || meeting.date || "";
                const isActive = selectedMeetingId === meeting.id;
                return (
                  <div
                    key={meeting.id}
                    className={`chat-sidebar-single${isActive ? " active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectMeeting(meeting)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelectMeeting(meeting);
                    }}
                  >
                    <div className="img">
                      <div className="chat-avatar chat-avatar--sm">
                        {initialsFor(meeting.patientName)}
                      </div>
                    </div>
                    <div className="info">
                      <h6 className="text-sm mb-1">{meeting.patientName || "Patient"}</h6>
                      <p className="mb-0 text-xs">
                        {meeting.slot || "Time"} {dateLabel ? `- ${formatDateLabel(dateLabel)}` : ""}
                      </p>
                    </div>
                    <div className="action text-end">
                      <p className="mb-0 text-neutral-400 text-xs lh-1">
                        {meeting.slot || "-"}
                      </p>
                      {meeting.visitId && <span className="chat-pill">Visit {meeting.visitId}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="schedule-list-section">
              <div className="schedule-list-label">Upcoming</div>
              {upcomingMeetingsFiltered.length === 0 && (
                <div className="schedule-list-empty">No upcoming appointment.</div>
              )}
              {upcomingMeetingsFiltered.slice(0, 20).map((meeting) => {
                const dateLabel = meeting.dateKey || meeting.date || "";
                const isActive = selectedMeetingId === meeting.id;
                return (
                  <div
                    key={meeting.id}
                    className={`chat-sidebar-single${isActive ? " active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectMeeting(meeting)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelectMeeting(meeting);
                    }}
                  >
                    <div className="img">
                      <div className="chat-avatar chat-avatar--sm">
                        {initialsFor(meeting.patientName)}
                      </div>
                    </div>
                    <div className="info">
                      <h6 className="text-sm mb-1">{meeting.patientName || "Patient"}</h6>
                      <p className="mb-0 text-xs">
                        {meeting.slot || "Time"} {dateLabel ? `- ${formatDateLabel(dateLabel)}` : ""}
                      </p>
                    </div>
                    <div className="action text-end">
                      <p className="mb-0 text-neutral-400 text-xs lh-1">{formatDateLabel(dateLabel)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="chat-main card">
          <div className="chat-sidebar-single active schedule-header">
            <div className="img">
              <div className="chat-avatar">{String(selectedDate.getDate()).padStart(2, "0")}</div>
            </div>
            <div className="info">
              <h6 className="text-md mb-0">{formatDateDMY(selectedDate)}</h6>
              <p className="mb-0">
                {meetingsForSelectedDate.length} appointment
                {meetingsForSelectedDate.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="action schedule-header-actions">
              <button type="button" className="btn sm" onClick={handlePrevMonth}>
                Prev
              </button>
              <button type="button" className="btn sm" onClick={handleNextMonth}>
                Next
              </button>
            </div>
          </div>

          <div className="chat-message-list schedule-message-list">
            <div className="schedule-calendar-card">
              <div className="schedule-calendar-header">
                <span className="month-label">{monthLabel}</span>
                <button type="button" className="btn sm" onClick={handleJumpToToday}>
                  Jump to today
                </button>
              </div>
              <div className="schedule-calendar">
                <table className="calendar-table">
                  <thead>
                    <tr>
                      <th>Sun</th>
                      <th>Mon</th>
                      <th>Tue</th>
                      <th>Wed</th>
                      <th>Thu</th>
                      <th>Fri</th>
                      <th>Sat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((row, i) => (
                      <tr key={i}>
                        {row.map((day, j) => {
                          if (!day) {
                            return (
                              <td key={j}>
                                <button type="button" className="calendar-day-btn empty" disabled>
                                  &nbsp;
                                </button>
                              </td>
                            );
                          }

                          const thisDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                          const isToday = isSameDay(thisDate, TODAY);
                          const isSelected = isSameDay(thisDate, selectedDate);

                          return (
                            <td key={j}>
                              <button
                                type="button"
                                className={
                                  "calendar-day-btn" +
                                  (isToday ? " today" : "") +
                                  (isSelected ? " selected" : "")
                                }
                                onClick={() => handleDateClick(day)}
                              >
                                {day}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedMeeting ? (
              <div className="schedule-detail-card">
                <div className="schedule-detail-header">Selected appointment</div>
                <div className="schedule-detail-title">
                  {selectedMeeting.patientName || "Patient"}
                </div>
                <div className="schedule-detail-meta">
                  <span>Date: {formatDateLabel(selectedMeeting.dateKey || selectedMeeting.date)}</span>
                  <span>Time: {selectedMeeting.slot}</span>
                  {selectedMeeting.visitId && <span>Visit ID: {selectedMeeting.visitId}</span>}
                </div>
                <div className="schedule-detail-body">
                  {selectedMeeting.description || "No description added."}
                </div>
                <div className="schedule-detail-actions">
                  <button type="button" className="btn sm" onClick={handleEditAppointmentStart}>
                    Edit Appointment
                  </button>
                  <button type="button" className="btn sm" onClick={handleCancelAppointment}>
                    Cancel Appointment
                  </button>
                </div>
              </div>
            ) : (
              <div className="schedule-detail-card schedule-detail-empty">
                Select an appointment from the list to see details.
              </div>
            )}

            <div className="schedule-day-list">
              <div className="schedule-day-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Appointment on {formatDateDMY(selectedDate)}</span>
                <button type="button" className="btn sm primary" onClick={() => setShowAddModal(true)}>
                  Add Appointment
                </button>
              </div>
              {meetingsForSelectedDate.length === 0 && (
                <div className="chat-hint">No appointment booked for this date.</div>
              )}
              {meetingsForSelectedDate.map((meeting) => {
                const dateLabel = meeting.dateKey || meeting.date || "";
                const isActive = selectedMeetingId === meeting.id;
                return (
                  <div
                    key={meeting.id}
                    className={`chat-single-message left schedule-message${isActive ? " selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectMeeting(meeting)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSelectMeeting(meeting);
                    }}
                  >
                    <div className="chat-avatar chat-avatar--sm">
                      {initialsFor(meeting.patientName)}
                    </div>
                    <div className="chat-message-content">
                      <p className="mb-3">
                        <strong>{meeting.slot || "Time"}</strong>
                        {meeting.patientName ? ` - ${meeting.patientName}` : ""}
                      </p>
                      {meeting.description && <p className="mb-3">{meeting.description}</p>}
                      <p className="chat-time mb-0">
                        <span>
                          {formatDateLabel(dateLabel)}
                          {meeting.visitId ? ` - Visit ${meeting.visitId}` : ""}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
      {/* Time Slot Modal */}
      {showSlotModal && (
        <div
          className="modal show"
          style={{ zIndex: 70 }}
          onClick={handleModalBackdropClick}
        >
          <div className="modal-card modal-card-lg">
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>
              Select Time Slot
            </h3>
            <div className="time-slot-list">
              {TIME_SLOTS.map((slot) => {
                const booked = isSlotBooked(slot);
                const isActive = selectedSlot === slot;

                // If booked, find the existing meeting for this slot on selected date
                const existingMeeting = booked
                  ? meetingsForSelectedDate.find(
                      (m) =>
                        normalizeSlot(m.slot) === normalizeSlot(slot)
                  )
                  : null;

                return (
                  <button
                    key={slot}
                    type="button"
                    className={
                      "btn time-slot-btn" +
                      (isActive ? " primary" : "") +
                      (booked ? " booked" : "")
                    }
                    onClick={() => {
                      if (booked && existingMeeting) {
                        // Clicking a booked slot -> show that existing appointment
                        setSelectedMeetingId(existingMeeting.id);
                        setSelectedSlot(existingMeeting.slot);
                        setShowSlotModal(false);
                      } else {
                        // Free slot -> choose for new appointment
                        setSelectedSlot(slot);
                        setShowSlotModal(false);
                      }
                    }}
                    style={{ margin: "4px", minWidth: "90px" }}
                  >
                    {slot}
                    {booked ? " (Booked)" : ""}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "12px", textAlign: "right" }}>
              <button
                type="button"
                className="btn sm"
                onClick={() => setShowSlotModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="modal show" onClick={handleModalBackdropClick}>
          <div className="modal-card modal-card-lg">
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Add Appointment</h3>
            <div className="schedule-composer-grid">
              <div className="schedule-field">
                <label>Time slot</label>
                <button type="button" className="btn sm" onClick={() => setShowSlotModal(true)}>
                  {selectedSlot ? `Selected: ${selectedSlot}` : "Select time slot"}
                </button>
              </div>

              {panelType === "ORG" ? (
                <div className="schedule-field">
                  <label>Patient</label>
                  <PatientSelect
                    patients={patients}
                    selectedId={form.patientId}
                    onChange={(value) => handleFormChange("patientId", value)}
                  />
                </div>
              ) : (
                <div className="schedule-field">
                  <label>Patient</label>
                  <input
                    type="text"
                    disabled
                    value={
                      effectivePatientId
                        ? `ID (${effectivePatientId}) patient selected`
                        : "No patient selected in header"
                    }
                  />
                </div>
              )}

              <div className="schedule-field">
                <label>Visit</label>
                <select value={visitId} onChange={(e) => setVisitId(e.target.value)} disabled={!effectivePatientId}>
                  <option value="">
                    {effectivePatientId ? "- Select visit -" : "Select patient first"}
                  </option>
                  {visits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {(v.visitType || "Visit") +
                        " - " +
                        (formatDateDMY(v.visitDate) || "") +
                        (v.chiefComplaint ? ` - ${v.chiefComplaint}` : "")}
                    </option>
                  ))}
                  {effectivePatientId && <option value="NEW_VISIT">+ Create new visit</option>}
                </select>
              </div>

              <div className="schedule-field schedule-field--full">
                <label>Description</label>
                <input
                  type="text"
                  placeholder="e.g., RCT follow-up, pain in 36"
                  value={form.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                />
              </div>
            </div>

            <div className="schedule-composer-actions">
              <button type="button" className="btn primary" onClick={handleConfirm}>
                Add Appointment
              </button>
              <button type="button" className="btn" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editAppointmentOpen && (
        <div className="modal show" onClick={handleModalBackdropClick}>
          <div className="modal-card modal-card-lg">
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Edit Appointment</h3>
            <div className="schedule-composer-grid">
              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div>
                <label>Time slot</label>
                <select
                  value={editForm.slot}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, slot: e.target.value }))
                  }
                >
                  <option value="">Select time</option>
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Visit</label>
                <select
                  value={editForm.visitId}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, visitId: e.target.value }))
                  }
                  disabled={editLoading}
                >
                  <option value="">- No visit -</option>
                  {editVisits.map((v) => (
                    <option key={v.id} value={v.id}>
                      {(v.visitType || "Visit") +
                        " - " +
                        (formatDateDMY(v.visitDate) || "") +
                        " (ID: " +
                        v.id +
                        ")"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="schedule-field schedule-field--full">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
              <div className="schedule-composer-actions">
                <button className="btn primary" type="button" onClick={handleUpdateAppointment}>
                  Save Changes
                </button>
                <button className="btn" type="button" onClick={() => setEditAppointmentOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
