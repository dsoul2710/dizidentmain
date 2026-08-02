import { useCallback, useState } from "react";

/**
 * Normalizes axios/fetch errors into user-facing messages.
 */
export function useApiError() {
  const [error, setError] = useState(null);

  const handleError = useCallback((err, fallback = "Something went wrong") => {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      fallback;
    setError(message);
    return message;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
}
