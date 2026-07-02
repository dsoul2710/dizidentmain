import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { API_BASE, API_BASE_URL } from "@/config";
import { formatDateDMY } from "@/shared/utils/dateFormat";
import "@/features/chat/pages/chat.css";

const DEFAULT_MODE = {
  ORG: "patient",
  DOCTOR: "patient",
  PATIENT: "doctor",
};

const safeTrim = (value) => (value || "").trim();

export default function ChatPage({ role, currentUser, onUnreadChange, assignedDoctorId }) {
  const currentUserId = currentUser?.id || currentUser?.userId;
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState(DEFAULT_MODE[role] || "patient");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [orgs, setOrgs] = useState([]);

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");

  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);

  const [composerText, setComposerText] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [unreadBySender, setUnreadBySender] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [doctorSearch, setDoctorSearch] = useState("");
  const [orgSearch, setOrgSearch] = useState("");
  const [patientSearch, setPatientSearch] = useState("");

  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const unreadSubscriptionRef = useRef(null);
  const eventSubscriptionRef = useRef(null);
  const userEventSubscriptionRef = useRef(null);
  const messagesRef = useRef(null);
  const threadIdRef = useRef(null);
  const isAtBottomRef = useRef(true);

  threadIdRef.current = thread?.id || null;

  const isOrg = role === "ORG";
  const isDoctor = role === "DOCTOR";
  const isPatient = role === "PATIENT";
  const isEventsMode = mode === "events";
  const roleTopic = useMemo(() => (role ? String(role).toUpperCase() : ""), [role]);

  const apiFetch = async (url, options) => {
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
  };

  const loadUnreadBySender = async () => {
    if (!currentUserId) return;
    try {
      const data = await apiFetch(`${API_BASE_URL}/chat/unread/by-sender?userId=${currentUserId}`);
      const map = {};
      let total = 0;
      (data || []).forEach((item) => {
        const count = Number(item.count) || 0;
        map[String(item.senderUserId)] = count;
        total += count;
      });
      setUnreadBySender(map);
      setTotalUnread(total);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("chat-unread-update", { detail: total }));
      }
      if (typeof onUnreadChange === "function") {
        onUnreadChange(total);
      }
    } catch (err) {
      console.error("Failed to load unread counts", err);
    }
  };

  useEffect(() => {
    if (!role) return;

    const loadPatients = async () => {
      try {
        const doctorParam =
          isDoctor && currentUserId
            ? `?doctorid=${encodeURIComponent(currentUserId)}`
            : "";
        let data = await apiFetch(`${API_BASE_URL}/patients${doctorParam}`);
        let list = (data || []).map((p) => ({
          id: String(p.userId ?? p.id),
          name: p.name || p.mobile || "Patient",
          mobile: p.mobile,
          createdAt: p.createdAt || p.createdDate || p.created_at || "",
        }));

        // If doctor-specific filter returns no patients, keep the list empty.
        setPatients(list);
        if (!selectedPatientId && list.length) {
          setSelectedPatientId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load patients", err);
      }
    };

    const loadDoctors = async () => {
      try {
        const data = await apiFetch(`${API_BASE_URL}/doctors`);
        let list = (data || []).map((d) => ({
          id: String(d.id),
          name: d.name || d.mobile || "Doctor",
          mobile: d.mobile,
        }));
        if (isPatient && assignedDoctorId != null) {
          list = list.filter((d) => String(d.id) === String(assignedDoctorId));
        }
        setDoctors(list);
        if (!selectedDoctorId && list.length) {
          setSelectedDoctorId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load doctors", err);
      }
    };

    const loadOrgs = async () => {
      try {
        const data = await apiFetch(`${API_BASE_URL}/users?role=ORG`);
        const list = (data || []).map((a) => ({
          id: String(a.id),
          name: a.name || a.mobile || "Org",
          mobile: a.mobile,
        }));
        setOrgs(list);
        if (!selectedOrgId && list.length) {
          setSelectedOrgId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load orgs", err);
      }
    };

    if (isOrg || isDoctor) {
      loadPatients();
    }
    if (isOrg || isPatient) {
      loadDoctors();
    }
    if (isDoctor || isPatient) {
      loadOrgs();
    }
  }, [
    role,
    isOrg,
    isDoctor,
    isPatient,
    selectedPatientId,
    selectedDoctorId,
    selectedOrgId,
    currentUserId,
    assignedDoctorId,
  ]);

  useEffect(() => {
    loadUnreadBySender();
  }, [currentUserId]);

  useEffect(() => {
    // Handle navigation state to auto-select user
    const selectedUserId = location.state?.selectedUserId;
    if (!selectedUserId) return;
    
    // Wait for user lists to be loaded
    if (patients.length === 0 && doctors.length === 0 && orgs.length === 0) {
      return;
    }
    
    const userId = String(selectedUserId);
    
    // Check in patients
    const patient = patients.find(p => String(p.id) === userId);
    if (patient) {
      setMode("patient");
      setSelectedPatientId(userId);
      // Clear navigation state immediately
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    
    // Check in doctors
    const doctor = doctors.find(d => String(d.id) === userId);
    if (doctor) {
      setMode("doctor");
      setSelectedDoctorId(userId);
      // Clear navigation state immediately
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    
    // Check in orgs
    const org = orgs.find(a => String(a.id) === userId);
    if (org) {
      setMode("org");
      setSelectedOrgId(userId);
      // Clear navigation state immediately
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
  }, [location.state?.selectedUserId, patients, doctors, orgs, navigate, location.pathname]);

  useEffect(() => {
    if (!isEventsMode || eventsLoading) return;
    const timestamps = (events || [])
      .map((event) => event?.timestamp)
      .filter(Boolean)
      .sort();
    const lastSeen = timestamps.length > 0 ? timestamps[timestamps.length - 1] : new Date().toISOString();
    window.dispatchEvent(new CustomEvent("events-read", { detail: { lastSeen } }));
  }, [isEventsMode, eventsLoading, events]);

  const loadEvents = async () => {
    if (!role) return;
    setEventsLoading(true);
    setEventsError("");
    try {
      const data = await apiFetch(
        `${API_BASE_URL}/events?userId=${currentUserId || ""}&role=${encodeURIComponent(roleTopic)}`
      );
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load events", err);
      setEvents([]);
      setEventsError("Unable to load events.");
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    if (isEventsMode) {
      loadEvents();
    }
  }, [isEventsMode, currentUserId, roleTopic]);

  const markThreadRead = async (threadId) => {
    if (!threadId || !currentUserId) return;
    try {
      await fetch(`${API_BASE_URL}/chat/threads/${threadId}/read?userId=${currentUserId}`, {
        method: "POST",
      });
      await loadUnreadBySender();
    } catch (err) {
      console.error("Failed to mark messages read", err);
    }
  };

  const resolvePayload = useMemo(() => {
    if (!currentUserId) return null;

    if (isOrg && mode === "doctor") {
      if (!selectedDoctorId) return null;
      return {
        type: "ORG_DOCTOR",
        orgUserId: currentUserId,
        doctorUserId: Number(selectedDoctorId),
      };
    }

    if (isDoctor && mode === "org") {
      if (!selectedOrgId) return null;
      return {
        type: "ORG_DOCTOR",
        orgUserId: Number(selectedOrgId),
        doctorUserId: currentUserId,
      };
    }

    if ((isOrg || isDoctor) && mode === "patient") {
      if (!selectedPatientId) return null;
      return {
        type: isOrg ? "ORG_PATIENT" : "DOCTOR_PATIENT",
        orgUserId: isOrg ? currentUserId : undefined,
        doctorUserId: isDoctor ? currentUserId : undefined,
        patientUserId: Number(selectedPatientId),
      };
    }

    if (isPatient && mode === "org") {
      if (!selectedOrgId) return null;
      return {
        type: "ORG_PATIENT",
        orgUserId: Number(selectedOrgId),
        patientUserId: currentUserId,
      };
    }

    if (isPatient && mode === "doctor") {
      if (!selectedDoctorId) return null;
      return {
        type: "DOCTOR_PATIENT",
        doctorUserId: Number(selectedDoctorId),
        patientUserId: currentUserId,
      };
    }

    return null;
  }, [
    currentUserId,
    isOrg,
    isDoctor,
    isPatient,
    mode,
    selectedOrgId,
    selectedDoctorId,
    selectedPatientId,
  ]);

  useEffect(() => {
    let cancelled = false;

    const resolveThread = async () => {
      if (!resolvePayload) {
        setThread(null);
        setMessages([]);
        return;
      }

      setLoadingThread(true);
      setError("");

      try {
        const data = await apiFetch(`${API_BASE_URL}/chat/threads/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolvePayload),
        });
        if (!cancelled) {
          setThread(data);
        }
      } catch (err) {
        console.error("Failed to resolve chat thread", err);
        if (!cancelled) {
          setError("Unable to open chat thread.");
          setThread(null);
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingThread(false);
        }
      }
    };

    resolveThread();

    return () => {
      cancelled = true;
    };
  }, [resolvePayload]);

  useEffect(() => {
    if (!thread?.id) return;

    const loadMessages = async () => {
      try {
        const data = await apiFetch(`${API_BASE_URL}/chat/threads/${thread.id}/messages`);
        setMessages(Array.isArray(data) ? data : []);
        await markThreadRead(thread.id);
      } catch (err) {
        console.error("Failed to load messages", err);
        setMessages([]);
      }
    };

    loadMessages();
  }, [thread?.id]);

  const subscribeToThread = (threadId) => {
    if (!threadId || !clientRef.current) return;

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    subscriptionRef.current = clientRef.current.subscribe(`/topic/chat.${threadId}`, (message) => {
      const payload = JSON.parse(message.body);
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.id)) {
          return prev;
        }
        return [...prev, payload];
      });
      if (String(payload.receiverUserId) === String(currentUserId)) {
        if (isAtBottomRef.current && threadIdRef.current === payload.threadId) {
          markThreadRead(payload.threadId);
        } else {
          loadUnreadBySender();
        }
      }
    });
  };

  const subscribeToUnread = (userId) => {
    if (!userId || !clientRef.current) return;

    if (unreadSubscriptionRef.current) {
      unreadSubscriptionRef.current.unsubscribe();
      unreadSubscriptionRef.current = null;
    }

    unreadSubscriptionRef.current = clientRef.current.subscribe(`/topic/chat.unread.${userId}`, () => {
      loadUnreadBySender();
    });
  };

  const subscribeToEvents = () => {
    if (!clientRef.current || !roleTopic) return;

    if (eventSubscriptionRef.current) {
      eventSubscriptionRef.current.unsubscribe();
      eventSubscriptionRef.current = null;
    }
    if (userEventSubscriptionRef.current) {
      userEventSubscriptionRef.current.unsubscribe();
      userEventSubscriptionRef.current = null;
    }

    eventSubscriptionRef.current = clientRef.current.subscribe(`/topic/events.role.${roleTopic}`, (message) => {
      try {
        const payload = JSON.parse(message.body);
        setEvents((prev) => {
          const key = eventKey(payload);
          if (prev.some((item) => eventKey(item) === key)) {
            return prev;
          }
          return [payload, ...prev].slice(0, 50);
        });
      } catch {
        // ignore
      }
    });

    if (currentUserId) {
      userEventSubscriptionRef.current = clientRef.current.subscribe(`/topic/events.user.${currentUserId}`, (message) => {
        try {
          const payload = JSON.parse(message.body);
          setEvents((prev) => {
            const key = eventKey(payload);
            if (prev.some((item) => eventKey(item) === key)) {
              return prev;
            }
            return [payload, ...prev].slice(0, 50);
          });
        } catch {
          // ignore
        }
      });
    }
  };

  useEffect(() => {
    if (!thread?.id) return;

    if (!clientRef.current) {
      const client = new Client({
        webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
        reconnectDelay: 5000,
      });

      client.onConnect = () => {
        subscribeToThread(threadIdRef.current);
        subscribeToUnread(currentUserId);
        subscribeToEvents();
      };

      client.activate();
      clientRef.current = client;
      return;
    }

    if (clientRef.current.connected) {
      subscribeToThread(thread.id);
    }
  }, [thread?.id]);

  useEffect(() => {
    if (!currentUserId || !clientRef.current?.connected) return;
    subscribeToUnread(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (!clientRef.current?.connected) return;
    subscribeToEvents();
  }, [currentUserId, roleTopic]);

  useEffect(() => {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  const resolveReceiverId = () => {
    if (isOrg && mode === "doctor") return selectedDoctorId;
    if (isOrg && mode === "patient") return selectedPatientId;
    if (isDoctor && mode === "org") return selectedOrgId;
    if (isDoctor && mode === "patient") return selectedPatientId;
    if (isPatient && mode === "doctor") return selectedDoctorId;
    if (isPatient && mode === "org") return selectedOrgId;
    return null;
  };

  const sendMessage = async () => {
    if (!thread?.id || sending) return;

    const content = safeTrim(composerText);
    if (!content && (!attachmentFiles || attachmentFiles.length === 0)) return;

    setSending(true);

    try {
      let attachmentIds = [];

      if (attachmentFiles && attachmentFiles.length > 0) {
        if (attachmentFiles.length > 5) {
          throw new Error("Maximum 5 attachments are allowed");
        }
        const formData = new FormData();
        attachmentFiles.forEach((file) => formData.append("files", file));
        formData.append("uploaderId", currentUserId);

        const res = await fetch(`${API_BASE_URL}/chat/attachments/bulk`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Attachment upload failed");
        }

        const uploaded = await res.json();
        attachmentIds = Array.isArray(uploaded)
          ? uploaded.map((u) => u?.id).filter(Boolean)
          : [];
      }

      const payload = {
        threadId: thread.id,
        senderUserId: currentUserId,
        receiverUserId: resolveReceiverId() ? Number(resolveReceiverId()) : null,
        content,
        attachmentIds: attachmentIds.length ? attachmentIds : null,
      };

      if (clientRef.current?.connected) {
        clientRef.current.publish({
          destination: "/app/chat.send",
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(`${API_BASE_URL}/chat/threads/${thread.id}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Send failed");
        }

        const data = await res.json();
        setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      }

      setComposerText("");
      setAttachmentFiles([]);
      loadUnreadBySender();
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const peopleMap = useMemo(() => {
    const map = new Map();
    doctors.forEach((d) => map.set(String(d.id), d.name));
    patients.forEach((p) => map.set(String(p.id), p.name));
    orgs.forEach((a) => map.set(String(a.id), a.name));
    return map;
  }, [doctors, patients, orgs]);

  const patientIdSet = useMemo(() => new Set(patients.map((p) => String(p.id))), [patients]);
  const doctorIdSet = useMemo(() => new Set(doctors.map((d) => String(d.id))), [doctors]);
  const orgIdSet = useMemo(() => new Set(orgs.map((a) => String(a.id))), [orgs]);

  const sumUnreadForIds = (idSet) => {
    let total = 0;
    Object.entries(unreadBySender).forEach(([id, count]) => {
      if (idSet.has(id)) {
        total += Number(count) || 0;
      }
    });
    return total;
  };

  const unreadPatients = sumUnreadForIds(patientIdSet);
  const unreadDoctors = sumUnreadForIds(doctorIdSet);
  const unreadOrgs = sumUnreadForIds(orgIdSet);

  const formatTimestamp = (value) => {
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const timePart = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    if (dt >= startOfToday) return `Today ${timePart}`;
    if (dt >= startOfYesterday && dt < startOfToday) return `Yesterday ${timePart}`;
    return `${formatDateDMY(dt)} ${timePart}`;
  };


  const filteredDoctors = useMemo(() => {
    const query = doctorSearch.trim().toLowerCase();
    if (!query) return doctors;
    return doctors.filter((d) => (d.name || "").toLowerCase().includes(query) || (d.mobile || "").includes(query));
  }, [doctors, doctorSearch]);

  const filteredOrgs = useMemo(() => {
    const query = orgSearch.trim().toLowerCase();
    if (!query) return orgs;
    return orgs.filter((a) => (a.name || "").toLowerCase().includes(query) || (a.mobile || "").includes(query));
  }, [orgs, orgSearch]);

  const filteredPatients = useMemo(() => {
    const query = patientSearch.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((p) => (p.name || "").toLowerCase().includes(query) || (p.mobile || "").includes(query));
  }, [patients, patientSearch]);

  const activePartnerName = (() => {
    if (isEventsMode) return "Events";
    if (isOrg && mode === "doctor") return peopleMap.get(selectedDoctorId) || "Doctor";
    if (isOrg && mode === "patient") return peopleMap.get(selectedPatientId) || "Patient";
    if (isDoctor && mode === "org") return peopleMap.get(selectedOrgId) || "Org";
    if (isDoctor && mode === "patient") return peopleMap.get(selectedPatientId) || "Patient";
    if (isPatient && mode === "doctor") return peopleMap.get(selectedDoctorId) || "Doctor";
    if (isPatient && mode === "org") return peopleMap.get(selectedOrgId) || "Org";
    return "Chat";
  })();

  const eventTypeLabel = (type) => {
    switch (type) {
      case "APPOINTMENT_SCHEDULED":
        return "Appointment";
      case "VISIT_CREATED":
        return "Visit";
      case "BILL_GENERATED":
        return "Billing";
      default:
        return "Event";
    }
  };

  const eventKey = (event) => {
    const type = event?.type || "event";
    const appointmentId = event?.appointmentId ?? "na";
    const visitId = event?.visitId ?? "na";
    const billId = event?.billId ?? "na";
    const timestamp = event?.timestamp ?? "na";
    return `${type}-${appointmentId}-${visitId}-${billId}-${timestamp}`;
  };

  const initialsFor = (name) => {
    const safe = safeTrim(name);
    if (!safe) return "?";
    const parts = safe.split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const activeList = (() => {
    if (isEventsMode) return [];
    if (mode === "patient") return filteredPatients;
    if (mode === "doctor") return filteredDoctors;
    if (mode === "org") return filteredOrgs;
    return [];
  })();

  const activeSelectedId = (() => {
    if (mode === "patient") return selectedPatientId;
    if (mode === "doctor") return selectedDoctorId;
    if (mode === "org") return selectedOrgId;
    return "";
  })();

  const setActiveSelectedId = (id) => {
    if (mode === "patient") setSelectedPatientId(id);
    if (mode === "doctor") setSelectedDoctorId(id);
    if (mode === "org") setSelectedOrgId(id);
  };

  return (
    <section className="view show">
      <div className="chat-wrapper">
        <div className="chat-sidebar card">
          <div className="chat-sidebar-single active top-profile">
            <div className="img">
              <div className="chat-avatar">{initialsFor(currentUser?.name || role || "User")}</div>
            </div>
            <div className="info">
              <h6 className="text-md mb-0">{isOrg ? "Welcome Org" : currentUser?.name || "User"}</h6>
              <p className="mb-0">{role || "User"}</p>
            </div>
            <div className="action text-end">
              {totalUnread > 0 && <span className="chat-count">{totalUnread}</span>}
            </div>
          </div>

          <div className="chat-tabs">
            <button
              className={mode === "events" ? "tab active" : "tab"}
              onClick={() => setMode("events")}
              type="button"
            >
              Events
            </button>
            {isOrg && (
              <>
                <button
                  className={mode === "patient" ? "tab active" : "tab"}
                  onClick={() => setMode("patient")}
                  type="button"
                >
                  Patients {unreadPatients > 0 ? <span className="tab-badge">{unreadPatients}</span> : null}
                </button>
                <button
                  className={mode === "doctor" ? "tab active" : "tab"}
                  onClick={() => setMode("doctor")}
                  type="button"
                >
                  Doctors {unreadDoctors > 0 ? <span className="tab-badge">{unreadDoctors}</span> : null}
                </button>
              </>
            )}
            {isDoctor && (
              <>
                <button
                  className={mode === "patient" ? "tab active" : "tab"}
                  onClick={() => setMode("patient")}
                  type="button"
                >
                  Patients {unreadPatients > 0 ? <span className="tab-badge">{unreadPatients}</span> : null}
                </button>
                <button
                  className={mode === "org" ? "tab active" : "tab"}
                  onClick={() => setMode("org")}
                  type="button"
                >
                  Org {unreadOrgs > 0 ? <span className="tab-badge">{unreadOrgs}</span> : null}
                </button>
              </>
            )}
            {isPatient && (
              <>
                <button
                  className={mode === "doctor" ? "tab active" : "tab"}
                  onClick={() => setMode("doctor")}
                  type="button"
                >
                  Doctor {unreadDoctors > 0 ? <span className="tab-badge">{unreadDoctors}</span> : null}
                </button>
                <button
                  className={mode === "org" ? "tab active" : "tab"}
                  onClick={() => setMode("org")}
                  type="button"
                >
                  Org {unreadOrgs > 0 ? <span className="tab-badge">{unreadOrgs}</span> : null}
                </button>
              </>
            )}
          </div>

          <div className="chat-search">
            <span className="icon">
              <i className="ri-search-line"></i>
            </span>
            <input
              type="text"
              value={mode === "patient" ? patientSearch : mode === "doctor" ? doctorSearch : orgSearch}
              onChange={(e) => {
                if (mode === "patient") setPatientSearch(e.target.value);
                if (mode === "doctor") setDoctorSearch(e.target.value);
                if (mode === "org") setOrgSearch(e.target.value);
              }}
              placeholder={`Search ${mode === "events" ? "events" : mode}`}
              disabled={isEventsMode}
            />
          </div>

          {isEventsMode ? (
            <div className="chat-hint">
              Events feed is shown on the right panel.
            </div>
          ) : (
            <div className="chat-all-list">
              {activeList.length === 0 && (
                <div className="chat-hint">No contacts to show.</div>
              )}
              {activeList.map((person) => {
                const count = unreadBySender[String(person.id)] || 0;
                const isActive = String(activeSelectedId) === String(person.id);
                return (
                  <div
                    key={person.id}
                    className={`chat-sidebar-single${isActive ? " active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveSelectedId(String(person.id))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setActiveSelectedId(String(person.id));
                    }}
                  >
                    <div className="img">
                      <div className="chat-avatar chat-avatar--sm">{initialsFor(person.name)}</div>
                    </div>
                    <div className="info">
                      <h6 className="text-sm mb-1">{person.name || "User"}</h6>
                      <p className="mb-0 text-xs">{person.mobile || "Tap to open chat"}</p>
                    </div>
                    <div className="action text-end">
                      <p className="mb-0 text-neutral-400 text-xs lh-1">
                        {person.createdAt ? formatTimestamp(person.createdAt) : ""}
                      </p>
                      {count > 0 && (
                        <span className="chat-pill">{count}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && <div className="chat-error">{error}</div>}
        </div>

        <div className="chat-main card">
          <div className="chat-sidebar-single active">
            <div className="img">
              <div className="chat-avatar chat-avatar--sm">{initialsFor(activePartnerName)}</div>
            </div>
            <div className="info">
              <h6 className="text-md mb-0">{activePartnerName}</h6>
              <p className="mb-0">Thread: {thread?.id || "-"}</p>
            </div>
            <div className="action d-inline-flex align-items-center gap-3">
              {isEventsMode && (
                <button className="text-xl text-primary-light" type="button" onClick={loadEvents} disabled={eventsLoading}>
                  <i className="ri-refresh-line"></i>
                </button>
              )}
            </div>
          </div>

          {isEventsMode ? (
            <div className="event-feed">
              {eventsLoading && <div className="muted-small">Loading events...</div>}
              {eventsError && <div className="chat-error">{eventsError}</div>}
              {!eventsLoading && !eventsError && events.length === 0 && (
                <div className="event-empty">No recent events.</div>
              )}
              {events.map((event, index) => (
                <div key={`${eventKey(event)}-${index}`} className="event-card">
                  <div className="event-header">
                    <div className="event-type">{eventTypeLabel(event.type)}</div>
                    <div className="event-time">{formatTimestamp(event.timestamp)}</div>
                  </div>
                  <div className="event-title">{event.title}</div>
                  {event.subtitle && <div className="event-subtitle">{event.subtitle}</div>}
                  <div className="event-meta">
                    {event.status && <span>Status: {event.status}</span>}
                    {event.patientName && <span>Patient: {event.patientName}</span>}
                    {event.doctorName && <span>Doctor: {event.doctorName}</span>}
                    {event.amount != null && <span>Amount: {event.amount}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div
                className="chat-message-list"
                ref={messagesRef}
                onScroll={() => {
                  if (!messagesRef.current) return;
                  const el = messagesRef.current;
                  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
                  isAtBottomRef.current = distance < 40;
                  if (isAtBottomRef.current && thread?.id) {
                    markThreadRead(thread.id);
                  }
                }}
              >
                {messages.length === 0 && !loadingThread && (
                  <div className="chat-hint">No messages yet.</div>
                )}
                {messages.map((msg) => {
                  const mine = String(msg.senderUserId) === String(currentUserId);
                  return (
                    <div key={msg.id} className={`chat-single-message ${mine ? "right" : "left"}`}>
                      {!mine && (
                        <div className="chat-avatar chat-avatar--sm">{initialsFor(msg.senderName || "User")}</div>
                      )}
                      <div className="chat-message-content">
                        {msg.content && <p className="mb-3">{msg.content}</p>}
                        {Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                          <div className="chat-attachment-list">
                            {msg.attachments.map((att) => (
                              <a
                                key={att.id || att.fileName}
                                className="chat-attachment"
                                href={`${API_BASE}${att.url}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {att.fileName || "Attachment"}
                              </a>
                            ))}
                          </div>
                        )}
                        {!msg.attachments && msg.attachment && (
                          <a
                            className="chat-attachment"
                            href={`${API_BASE}${msg.attachment.url}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {msg.attachment.fileName || "Attachment"}
                          </a>
                        )}
                        <p className="chat-time mb-0">
                          <span>{formatTimestamp(msg.createdAt)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form
                className="chat-message-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <input
                  type="text"
                  name="chatMessage"
                  placeholder="Write message"
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <div className="chat-message-box-action">
                  <label className="text-xl" htmlFor="chat-attachment">
                    <i className="ri-attachment-2"></i>
                  </label>
                  <input
                    id="chat-attachment"
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 5) {
                        alert("You can upload up to 5 files.");
                        e.target.value = "";
                        setAttachmentFiles([]);
                        return;
                      }
                      // Check file sizes (5MB max per file)
                      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
                      const oversizedFiles = files.filter((f) => f.size > MAX_SIZE);
                      if (oversizedFiles.length > 0) {
                        const names = oversizedFiles.map((f) => f.name).join(", ");
                        alert(`File size must be less than 5MB. Oversized: ${names}`);
                        e.target.value = "";
                        setAttachmentFiles([]);
                        return;
                      }
                      setAttachmentFiles(files);
                    }}
                    style={{ display: "none" }}
                  />
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary-600 radius-8 d-inline-flex align-items-center gap-1"
                    disabled={sending || !thread?.id}
                  >
                    Send
                    <i className="ri-send-plane-2-line"></i>
                  </button>
                </div>
              </form>
              {attachmentFiles.length > 0 && (
                <div className="chat-attachment-preview">
                  Selected: {attachmentFiles.map((f) => f.name).join(", ")}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
