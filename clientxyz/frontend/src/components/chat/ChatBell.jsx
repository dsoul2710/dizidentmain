import React, { useEffect, useMemo, useRef, useState } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { API_BASE, API_BASE_URL } from "../../config";

export default function ChatBell({ userId, onClick, label, role, className = "" }) {
  const [chatCount, setChatCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const eventSubscriptionRef = useRef(null);
  const userEventSubscriptionRef = useRef(null);

  const roleTopic = useMemo(() => (role ? String(role).toUpperCase() : ""), [role]);

  const lastSeenKey = useMemo(() => (userId ? `hms_events_last_seen_${userId}` : ""), [userId]);

  const setLastSeen = (value) => {
    if (!lastSeenKey) return;
    try {
      localStorage.setItem(lastSeenKey, value);
    } catch {
      // ignore
    }
  };

  const getLastSeen = () => {
    if (!lastSeenKey) return "";
    try {
      return localStorage.getItem(lastSeenKey) || "";
    } catch {
      return "";
    }
  };

  const loadEventCount = async () => {
    if (!userId || roleTopic !== "PATIENT") return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/events?userId=${userId}&role=${encodeURIComponent(roleTopic)}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const lastSeen = getLastSeen();
      const list = Array.isArray(data) ? data : [];
      const count = list.filter((item) => {
        if (!item?.timestamp || item.timestamp <= lastSeen) return false;
        if (String(item?.actorUserId) === String(userId)) return false;
        return true;
      }).length;
      setEventCount(count);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!userId) return undefined;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      subscriptionRef.current = client.subscribe(`/topic/chat.unread.${userId}`, (message) => {
        try {
          const payload = JSON.parse(message.body);
          const next = Number(payload?.count);
          if (!Number.isNaN(next)) {
            setChatCount(next);
          }
        } catch {
          // ignore
        }
      });

      if (eventSubscriptionRef.current) {
        eventSubscriptionRef.current.unsubscribe();
      }
      if (userEventSubscriptionRef.current) {
        userEventSubscriptionRef.current.unsubscribe();
      }
      if (roleTopic === "PATIENT") {
        userEventSubscriptionRef.current = client.subscribe(`/topic/events.user.${userId}`, (message) => {
          try {
            const payload = JSON.parse(message.body);
            if (String(payload?.actorUserId) === String(userId)) return;
          } catch {
            // ignore parse errors and still count
          }
          setEventCount((prev) => prev + 1);
        });
      }

      client.publish({
        destination: "/app/chat.unread.request",
        body: JSON.stringify({ userId }),
      });
    };

    client.activate();
    clientRef.current = client;

    const handler = (event) => {
      if (typeof event?.detail === "number") {
        setChatCount(event.detail);
      }
      if (event?.type === "events-read") {
        if (event?.detail?.lastSeen) {
          setLastSeen(event.detail.lastSeen);
        }
        setEventCount(0);
      }
    };
    window.addEventListener("chat-unread-update", handler);
    window.addEventListener("events-read", handler);
    return () => {
      window.removeEventListener("chat-unread-update", handler);
      window.removeEventListener("events-read", handler);
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      if (eventSubscriptionRef.current) {
        eventSubscriptionRef.current.unsubscribe();
        eventSubscriptionRef.current = null;
      }
      if (userEventSubscriptionRef.current) {
        userEventSubscriptionRef.current.unsubscribe();
        userEventSubscriptionRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
    };
  }, [userId, roleTopic]);

  useEffect(() => {
    if (roleTopic !== "PATIENT") {
      setEventCount(0);
      return;
    }
    loadEventCount();
  }, [userId, roleTopic]);

  const ariaLabel = useMemo(() => label || "Unread chat messages", [label]);
  const total = chatCount + eventCount;

  return (
    <button
      className={`has-indicator w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center position-relative ${className}`}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <i className="ri-chat-1-line text-primary-light text-xl"></i>
      {total > 0 && (
        <span className="position-absolute top-0 end-0 translate-middle badge rounded-pill bg-danger">
          {total}
        </span>
      )}
    </button>
  );
}
