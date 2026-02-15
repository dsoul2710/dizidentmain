import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/css/notification-panel.css";

export default function NotificationPanel({ 
  unreadMessages = [], 
  unreadEvents = [],
  onClose, 
  isOpen = false,
  userId,
  role
}) {
  const [messages, setMessages] = useState(unreadMessages);
  const [events, setEvents] = useState(unreadEvents);
  const [activeTab, setActiveTab] = useState("messages");
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setMessages(unreadMessages);
  }, [unreadMessages]);

  useEffect(() => {
    setEvents(unreadEvents);
  }, [unreadEvents]);

  useEffect(() => {
    // Mark events as read when Events tab is viewed
    if (activeTab === "events" && events.length > 0 && userId) {
      const timestamps = events
        .map((event) => event?.timestamp)
        .filter(Boolean)
        .sort();
      const lastSeen = timestamps.length > 0 ? timestamps[timestamps.length - 1] : new Date().toISOString();
      
      // Store in localStorage
      const lastSeenKey = `hms_events_last_seen_${userId}`;
      localStorage.setItem(lastSeenKey, lastSeen);
      
      // Dispatch event to update bell icon
      window.dispatchEvent(new CustomEvent("events-read", { detail: { lastSeen } }));
    }
  }, [activeTab, events, userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSeeAll = () => {
    onClose?.();
    const roleMap = {
      DOCTOR: "/doctor/chat",
      PATIENT: "/patient/chat",
      ADMIN: "/admin/chat",
    };
    const chatPath = roleMap[role] || "/chat";
    navigate(chatPath);
  };

  const handleSeeAllEvents = () => {
    onClose?.();
    const roleMap = {
      DOCTOR: "/doctor/chat",
      PATIENT: "/patient/chat",
      ADMIN: "/admin/chat",
    };
    const chatPath = roleMap[role] || "/chat";
    navigate(chatPath);
  };

  const handleClickMessage = (senderId) => {
    onClose?.();
    const roleMap = {
      DOCTOR: "/doctor/chat",
      PATIENT: "/patient/chat",
      ADMIN: "/admin/chat",
    };
    const chatPath = roleMap[role] || "/chat";
    navigate(chatPath, { state: { selectedUserId: senderId } });
  };

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

  const formatEventPreview = (event) => {
    if (event.title) return event.title;
    if (event.subtitle) return event.subtitle;
    return eventTypeLabel(event.type);
  };

  const totalCount = messages.length + events.length;

  if (!isOpen) return null;

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" ref={panelRef} onClick={(e) => e.stopPropagation()}>
        <div className="notification-panel-header">
          <h4 className="notification-panel-title">
            Notifications
            {totalCount > 0 && (
              <span className="notification-badge">{totalCount}</span>
            )}
          </h4>
          <button
            type="button"
            className="notification-panel-close"
            onClick={onClose}
            aria-label="Close notifications"
          >
            ×
          </button>
        </div>

        <div className="notification-panel-tabs">
          <button 
            className={`notification-tab ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => setActiveTab("messages")}
            type="button"
          >
            Messages
            {messages.length > 0 && (
              <span className="notification-tab-badge">{messages.length}</span>
            )}
          </button>
          <button 
            className={`notification-tab ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
            type="button"
          >
            Events
            {events.length > 0 && (
              <span className="notification-tab-badge">{events.length}</span>
            )}
          </button>
        </div>

        <div className="notification-panel-content">
          {activeTab === "messages" ? (
            messages.length > 0 ? (
              <>
                <div className="notification-items">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="notification-item"
                      onClick={() => handleClickMessage(msg.id)}
                    >
                      <div className="notification-item-header">
                        <span className="notification-sender">
                          {msg.senderName || "Unknown"}
                        </span>
                      </div>
                      <p className="notification-preview">
                        {msg.preview || msg.message || "New message"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="notification-panel-footer">
                  <button
                    type="button"
                    className="notification-see-all-btn"
                    onClick={handleSeeAll}
                  >
                    View all messages
                  </button>
                </div>
              </>
            ) : (
              <div className="notification-empty">
                <p>No unread messages</p>
              </div>
            )
          ) : (
            events.length > 0 ? (
              <>
                <div className="notification-items">
                  {events.map((event, index) => (
                    <div
                      key={`${event.id || index}`}
                      className="notification-item"
                      onClick={handleSeeAllEvents}
                    >
                      <div className="notification-item-header">
                        <span className="notification-sender">
                          {eventTypeLabel(event.type)}
                        </span>
                        {event.timestamp && (
                          <span className="notification-time">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="notification-preview">
                        {formatEventPreview(event)}
                      </p>
                      {event.patientName && (
                        <p className="notification-meta">Patient: {event.patientName}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="notification-panel-footer">
                  <button
                    type="button"
                    className="notification-see-all-btn"
                    onClick={handleSeeAllEvents}
                  >
                    View all events
                  </button>
                </div>
              </>
            ) : (
              <div className="notification-empty">
                <p>No recent events</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
