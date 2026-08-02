import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildPatientOptionLabel,
  getPatientId,
  selectPatientsForDropdown,
} from "@/shared/utils/patientList";

export default function PatientSelect({
  patients = [],
  selectedId,
  selectedPatient = null,
  onChange,
  placeholder = "Select patient",
  loading = false,
  error = "",
  disabled = false,
  className = "",
  apiBaseUrl = null,
  doctorUserId = null,
  enableBackendSearch = false,
  enablePagination = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [backendLoading, setBackendLoading] = useState(false);
  const [visiblePatients, setVisiblePatients] = useState(patients);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const ITEMS_PER_PAGE = 10;

  // Use selectedPatient from prop if available, otherwise find it in patients/visiblePatients
  const currentSelectedPatient = useMemo(
    () =>
      selectedPatient ||
      [...patients, ...visiblePatients].find(
        (patient) => String(getPatientId(patient)) === String(selectedId)
      ) ||
      null,
    [selectedPatient, patients, visiblePatients, selectedId]
  );

  const triggerLabel = currentSelectedPatient
    ? buildPatientOptionLabel(currentSelectedPatient)
    : loading || backendLoading
    ? "Loading patients..."
    : error
    ? "Error loading patients"
    : placeholder;

  // Fetch patients from backend with pagination
  const fetchPatientsFromBackend = async (searchQuery = "", page = 1) => {
    if (!apiBaseUrl) return;

    try {
      setBackendLoading(true);
      const params = new URLSearchParams();
      
      if (doctorUserId) {
        params.append("doctorid", doctorUserId);
      }
      params.append("page", page);
      params.append("pagesize", ITEMS_PER_PAGE);
      
      if (searchQuery && searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const url = `${apiBaseUrl}/patients?${params.toString()}`;
      console.log("Fetching from backend:", url);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      console.log("Backend response:", data);

      if (data.items) {
        // Paged response
        setVisiblePatients(data.items);
        setTotalItems(data.totalItems || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
      } else if (Array.isArray(data)) {
        // Non-paged response
        setVisiblePatients(data);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
      setVisiblePatients([]);
    } finally {
      setBackendLoading(false);
    }
  };

  // Load initial data when dropdown opens
  useEffect(() => {
    if (open && enableBackendSearch && enablePagination && apiBaseUrl) {
      setCurrentPage(1);
      setQuery("");
      fetchPatientsFromBackend("", 1);
    }
  }, [open, enableBackendSearch, enablePagination, apiBaseUrl]);

  // Search handler with debounce - only on query change, not on dropdown open
  useEffect(() => {
    if (!enableBackendSearch || !open || query === "") {
      // Skip if no query or dropdown closed or query just cleared
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setCurrentPage(1);
    searchTimeoutRef.current = setTimeout(() => {
      fetchPatientsFromBackend(query, 1);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Local filtering for non-backend mode
  const locallyFilteredPatients = useMemo(() => {
    if (enableBackendSearch && enablePagination) {
      return visiblePatients;
    }
    return selectPatientsForDropdown(patients, query, { selectedId });
  }, [patients, query, selectedId, enableBackendSearch, enablePagination, visiblePatients]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
    setQuery("");
  }, [open]);

  const handleSelect = (id) => {
    if (disabled) return;
    onChange?.(String(id));
    
    // Find the selected patient and cache their name
    const patient = visiblePatients.find(
      (p) => String(getPatientId(p)) === String(id)
    );
    if (patient) {
      const name = buildPatientOptionLabel(patient);
      // Store name in cookie for quick display on next page load
      document.cookie = `selectedPatientName=${encodeURIComponent(
        name
      )}; expires=${new Date(Date.now() + 7 * 864e5).toUTCString()}; path=/`;
    }
    
    setOpen(false);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchPatientsFromBackend(query, currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchPatientsFromBackend(query, currentPage - 1);
    }
  };

  return (
    <div
      className={`patient-dropdown${open ? " open" : ""}${
        className ? ` ${className}` : ""
      }`}
      ref={wrapperRef}
    >
      <button
        type="button"
        className={`patient-dropdown-trigger${disabled ? " disabled" : ""}`}
        onClick={() => {
          if (!disabled) setOpen((value) => !value);
        }}
      >
        {triggerLabel}
      </button>
      {open && (
        <div className="patient-dropdown-menu">
          <input
            ref={inputRef}
            className="patient-dropdown-search"
            type="search"
            placeholder={enableBackendSearch ? "Search by name or mobile..." : "Search patient name or mobile"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={disabled || backendLoading}
          />
          <div className="patient-dropdown-list">
            {backendLoading && visiblePatients.length === 0 ? (
              <div className="patient-dropdown-loading">Loading patients...</div>
            ) : locallyFilteredPatients.length ? (
              locallyFilteredPatients.map((patient) => {
                const id = getPatientId(patient);
                if (!id) return null;
                return (
                  <button
                    type="button"
                    key={id}
                    className="patient-dropdown-option"
                    onClick={() => handleSelect(id)}
                  >
                    {buildPatientOptionLabel(patient)}
                  </button>
                );
              })
            ) : (
              <div className="patient-dropdown-empty">
                {query ? "No patients found." : "No patients available."}
              </div>
            )}
          </div>

          {enableBackendSearch && enablePagination && totalPages > 1 && (
            <div className="patient-dropdown-pagination">
              <button
                type="button"
                className="patient-pagination-btn"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || backendLoading}
              >
                ← Previous
              </button>
              <span className="patient-pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="patient-pagination-btn"
                onClick={handleNextPage}
                disabled={currentPage === totalPages || backendLoading}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
