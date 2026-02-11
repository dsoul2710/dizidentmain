// src/components/HeaderPatientSelector.jsx
import React, { useEffect, useRef, useState } from "react";
import PatientSelect from "../common/PatientSelect";

// Simple helpers for cookies
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : "";
}

// Global flag to prevent duplicate API calls across StrictMode
let headerPatientSelectorFetched = false;

export default function HeaderPatientSelector({
  apiBaseUrl,
  onPatientChange,
  doctorUserId = null,
}) {
  const [selectedPatient, setSelectedPatient] = useState(() => {
    // Try to get patient name from cookie on initial load
    const patientName = getCookie("selectedPatientName");
    const patientId = getCookie("selectedPatientId");
    
    if (patientId && patientName) {
      // Create a minimal patient object from cached data
      return { 
        patientUserId: patientId, 
        patientName: patientName 
      };
    }
    return null;
  });
  
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(
    () => getCookie("selectedPatientId") || ""
  );

  // Log on mount
  useEffect(() => {
    console.log("HeaderPatientSelector mounted with selectedPatientId:", selectedPatientId);
  }, []);

  // Fetch selected patient on mount if selectedPatientId exists
  useEffect(() => {
    // Use global flag to prevent double calls in StrictMode
    if (headerPatientSelectorFetched) {
      console.log("Already fetched selected patient, skipping");
      return;
    }

    if (!selectedPatientId || !apiBaseUrl || !doctorUserId) {
      console.log("Skipping fetch - missing required params");
      return;
    }

    headerPatientSelectorFetched = true;
    
    const fetchSelectedPatient = async () => {
      try {
        setLoading(true);
        setLoadError("");
        
        // Use search endpoint with doctorId filter
        const searchUrl = `${apiBaseUrl}/patients?doctorid=${doctorUserId}&search=${selectedPatientId}&page=1&pagesize=10`;
        console.log("Fetching selected patient from search:", searchUrl);
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
        
        const data = await searchRes.json();
        const items = data.items || data || [];
        if (items.length > 0) {
          const patient = items[0];
          setSelectedPatient(patient);
          // Cache patient name for next page load
          const { getPatientName } = require("../../utils/patientList");
          const name = getPatientName(patient) || "Unknown";
          setCookie("selectedPatientName", name, 7);
          console.log("Selected patient set from search:", patient);
        }
      } catch (err) {
        console.error("Error fetching selected patient:", err);
        setLoadError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSelectedPatient();
    // Empty dependency array - run only once on mount
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      setCookie("selectedPatientId", selectedPatientId, 7);
      if (onPatientChange) {
        onPatientChange(selectedPatientId);
      }
    }
  }, [selectedPatientId, onPatientChange]);

  return (
    <div className="header-patient-selector">
      <label className="header-patient-label">Patient:</label>
      <div className="header-patient-select">
        <PatientSelect
          selectedPatient={selectedPatient}
          selectedId={selectedPatientId}
          onChange={setSelectedPatientId}
          loading={loading}
          error={loadError}
          apiBaseUrl={apiBaseUrl}
          doctorUserId={doctorUserId}
          enableBackendSearch={true}
          enablePagination={true}
        />
      </div>
    </div>
  );
}
