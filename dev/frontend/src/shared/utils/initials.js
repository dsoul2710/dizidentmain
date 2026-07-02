export const getInitials = (name) => {
  if (!name) return "U";
  // Strip Dr / Dr. prefix if present
  const clean = name.trim().replace(/^(dr|dr\.)\s+/i, "");
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
};
