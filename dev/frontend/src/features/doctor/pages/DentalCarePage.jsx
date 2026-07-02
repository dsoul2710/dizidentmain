import React, { useEffect, useRef, useState } from "react";

export default function DentalCarePage() {
  const frameWrapRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await frameWrapRef.current?.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch (err) {
      console.error("Unable to toggle fullscreen", err);
    }
  };

  return (
    <section className="view show">
      <div
        ref={frameWrapRef}
        className="card border-0 shadow-sm"
        style={{ minHeight: "calc(100vh - 120px)", position: "relative" }}
      >
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
          style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }}
        >
          <i className={isFullscreen ? "ri-fullscreen-exit-line" : "ri-fullscreen-line"}></i>
        </button>
        <iframe
          title="Dental Care"
          src="https://catelog.doctor32.in"
          style={{ width: "100%", height: "100%", minHeight: "calc(100vh - 120px)", border: 0 }}
          loading="lazy"
        />
      </div>
    </section>
  );
}
