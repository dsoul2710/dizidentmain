import { useState, useEffect } from "react";
import api from "../api/api";

export default function useNotifications(user, isOpen) {
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [unreadEvents, setUnreadEvents] = useState([]);

  const userId = user?.id ?? user?.userId;
  const role = user?.role;

  useEffect(() => {
    if (!userId || !isOpen) return undefined;

    let cancelled = false;

    const loadNotifications = async () => {
      try {
        const [unreadRes, patientsRes, doctorsRes, orgsRes] = await Promise.all([
          api.get(`/chat/unread/by-sender?userId=${userId}`),
          api.get(`/patients`).catch(() => ({ data: [] })),
          api.get(`/doctors`).catch(() => ({ data: [] })),
          api.get(`/users?role=ORG`).catch(() => ({ data: [] }))
        ]);

        if (cancelled) return;

        const unreadData = unreadRes.data || [];
        const patientsData = patientsRes.data || [];
        const doctorsData = doctorsRes.data || [];
        const orgsData = orgsRes.data || [];

        // Build a unified sender name map
        const userMap = {};
        patientsData.forEach((p) => {
          const id = String(p.userId ?? p.id);
          userMap[id] = p.name || p.mobile || "Patient";
        });
        doctorsData.forEach((d) => {
          const id = String(d.userId ?? d.id);
          userMap[id] = d.name || d.mobile || "Doctor";
        });
        orgsData.forEach((org) => {
          const id = String(org.id);
          userMap[id] = org.name || org.mobile || "Clinic Administrator";
        });

        const formatted = unreadData.map((item) => {
          const senderId = String(item.senderUserId);
          const senderName = userMap[senderId] || item.senderName || "User";
          return {
            id: item.senderUserId || Math.random(),
            senderName,
            preview: `${item.count} unread message${item.count > 1 ? "s" : ""}`,
            count: item.count,
          };
        });

        setUnreadMessages(formatted);
      } catch (err) {
        console.error("Failed to load unread messages in hook", err);
      }

      // Load events
      try {
        let endpointRole = role;
        if (role === "SUPERADMIN") endpointRole = "SUPER_ADMIN";

        const eventsRes = await api.get(
          `/events?userId=${userId}&role=${encodeURIComponent(endpointRole || "ORG")}`
        );
        if (cancelled) return;

        const eventsData = eventsRes.data || [];
        const lastSeenKey = `hms_events_last_seen_${userId}`;
        const lastSeen = localStorage.getItem(lastSeenKey) || "";

        const isEventForUser = (event) => {
          const userIdStr = String(userId);
          const roleName = String(user?.name || "").trim().toLowerCase();

          const candidates = [
            event?.userId,
            event?.recipientUserId,
            event?.targetUserId,
            event?.patientUserId,
            event?.doctorUserId,
            event?.orgUserId,
            event?.assignedDoctorId,
            event?.patientId,
            event?.doctorId,
            event?.orgId,
          ];
          if (candidates.some((value) => value != null && String(value) === userIdStr)) {
            return true;
          }
          if (roleName) {
            if (role === "DOCTOR") {
              return String(event?.doctorName || "").trim().toLowerCase() === roleName;
            }
            if (role === "PATIENT") {
              return String(event?.patientName || "").trim().toLowerCase() === roleName;
            }
            if (role === "ORG") {
              return String(event?.actorUserId || "") === userIdStr;
            }
          }
          return false;
        };

        const unreadEventsList = (Array.isArray(eventsData) ? eventsData : []).filter((item) => {
          if (!item?.timestamp || item.timestamp <= lastSeen) return false;
          if (role !== "SERVICE_PROVIDER" && !isEventForUser(item)) return false;
          return true;
        });

        setUnreadEvents(unreadEventsList);
      } catch (err) {
        console.error("Failed to load events in hook", err);
      }
    };

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [userId, role, isOpen, user?.name]);

  return { unreadMessages, unreadEvents, setUnreadMessages, setUnreadEvents };
}
