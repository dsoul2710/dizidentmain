import { useCallback, useState } from "react";
import { getPatientName } from "@/shared/utils/patientList";

/**
 * Selected patient context for clinical workflows.
 */
export function usePatient(initialPatient = null) {
  const [selectedPatient, setSelectedPatient] = useState(initialPatient);

  const selectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
  }, []);

  const clearPatient = useCallback(() => {
    setSelectedPatient(null);
  }, []);

  const displayName = selectedPatient ? getPatientName(selectedPatient) : "";

  return {
    selectedPatient,
    selectPatient,
    clearPatient,
    displayName,
  };
}
