import React, { useEffect, useState } from "react";

export default function GlobalLoader() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer;
    if (count > 0) {
      timer = setTimeout(() => setVisible(true), 150);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timer);
  }, [count]);

  useEffect(() => {
    const handler = (event) => {
      const delta = Number(event?.detail || 0);
      if (!Number.isFinite(delta)) return;
      setCount((prev) => Math.max(0, prev + delta));
    };
    window.addEventListener("app-loading", handler);
    return () => window.removeEventListener("app-loading", handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="app-loader" role="status" aria-live="polite">
      <div className="app-loader__spinner" />
      <span className="app-loader__text">Loading...</span>
    </div>
  );
}
