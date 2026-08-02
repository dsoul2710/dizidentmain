import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ToastContext = createContext(null);

const normalizeType = (value) => {
  const type = String(value || "info").toLowerCase();
  if (type === "success" || type === "error" || type === "warning") return type;
  return "info";
};

const guessType = (message) => {
  const text = String(message || "").toLowerCase();
  if (text.includes("fail") || text.includes("error") || text.includes("unable")) return "error";
  if (text.includes("success") || text.includes("saved") || text.includes("created")) return "success";
  return "info";
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", opts = {}) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = {
      id,
      message: String(message || ""),
      type: normalizeType(type),
      duration: typeof opts.duration === "number" ? opts.duration : 4000,
    };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => removeToast(id), toast.duration);
    }
    return id;
  }, [removeToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__toastPatched) return;
    window.__toastPatched = true;
    const originalAlert = window.alert;
    window.__nativeAlert = originalAlert;

    window.alert = (msg) => {
      addToast(msg, guessType(msg));
    };

    const handler = (event) => {
      const detail = event?.detail || {};
      const message = detail.message || detail.text || "";
      if (!message) return;
      addToast(message, detail.type || "info", { duration: detail.duration });
    };

    window.addEventListener("app-toast", handler);
    return () => {
      window.removeEventListener("app-toast", handler);
    };
  }, [addToast]);

  const api = useMemo(
    () => ({
      show: (message, type, opts) => addToast(message, type, opts),
      success: (message, opts) => addToast(message, "success", opts),
      error: (message, opts) => addToast(message, "error", opts),
      info: (message, opts) => addToast(message, "info", opts),
      warning: (message, opts) => addToast(message, "warning", opts),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="app-toast-host" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`app-toast app-toast--${toast.type}`}>
            <span className="app-toast__message">{toast.message}</span>
            <button
              type="button"
              className="app-toast__close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              <i className="ri-close-line"></i>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
