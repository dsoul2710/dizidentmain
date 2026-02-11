import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/css/notification-panel.css";

export default function NotificationPanel({ 
  unreadMessages = [], 
  onClose, 
  isOpen = false,
  userId,
  role
}) {
  const [messages, setMessages] = useState(unreadMessages);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setMessages(unreadMessages);
  }, [unreadMessages]);

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

  if (!isOpen) return null;

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" ref={panelRef}>
        <div className="notification-panel-header">
          <h4 className="notification-panel-title">
            Notifications
            {messages.length > 0 && (
              <span className="notification-badge">{messages.length}</span>
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

        <div className="notification-panel-content">
          {messages.length > 0 ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
