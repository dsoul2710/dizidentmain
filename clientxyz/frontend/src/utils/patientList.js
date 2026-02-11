const DEFAULT_PATIENT_LIMIT = 30;
const SEARCH_PATIENT_LIMIT = 60;

const normalizeQuery = (value) => (value || "").trim().toLowerCase();

export const getPatientId = (patient) =>
  patient?.patientUserId ??
  patient?.userId ??
  patient?.user?.id ??
  patient?.id ??
  null;

export const getPatientName = (patient) => {
  if (!patient) return "";
  const direct = patient.patientName || patient.fullName || patient.name;
  if (direct) return String(direct).trim();
  const first = patient.firstName || "";
  const last = patient.lastName || "";
  return `${first} ${last}`.trim();
};

export const getPatientMobile = (patient) =>
  patient?.patientMobile || patient?.mobile || patient?.phone || "";

export const getPatientCreatedAt = (patient) =>
  patient?.createdAt ||
  patient?.createdDate ||
  patient?.createdOn ||
  patient?.created_at ||
  patient?.created_date ||
  "";

const parseDateValue = (value) => {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
};

export const sortPatientsByCreatedDesc = (list = []) =>
  [...list].sort((a, b) => {
    const dateA = parseDateValue(getPatientCreatedAt(a));
    const dateB = parseDateValue(getPatientCreatedAt(b));
    if (dateA || dateB) return dateB - dateA;
    const idA = Number(getPatientId(a)) || 0;
    const idB = Number(getPatientId(b)) || 0;
    return idB - idA;
  });

export const filterPatientsByQuery = (list = [], query) => {
  const q = normalizeQuery(query);
  if (!q) return list;
  return list.filter((patient) => {
    const name = getPatientName(patient).toLowerCase();
    const mobile = String(getPatientMobile(patient) || "");
    return name.includes(q) || mobile.includes(q);
  });
};

export const buildPatientOptionLabel = (patient) => {
  const name = getPatientName(patient) || "Unknown";
  const mobile = getPatientMobile(patient);
  return mobile ? `${name} (${mobile})` : name;
};

export const selectPatientsForDropdown = (list, query, options = {}) => {
  const sorted = sortPatientsByCreatedDesc(list);
  const filtered = filterPatientsByQuery(sorted, query);
  const limit = normalizeQuery(query)
    ? options.searchLimit || SEARCH_PATIENT_LIMIT
    : options.defaultLimit || DEFAULT_PATIENT_LIMIT;
  const sliced = filtered.slice(0, limit);
  const selectedId = options.selectedId != null ? String(options.selectedId) : null;
  if (!selectedId) return sliced;
  const hasSelected = sliced.some(
    (patient) => String(getPatientId(patient)) === selectedId
  );
  if (hasSelected) return sliced;
  const selectedPatient =
    filtered.find((patient) => String(getPatientId(patient)) === selectedId) ||
    sorted.find((patient) => String(getPatientId(patient)) === selectedId);
  if (!selectedPatient) return sliced;
  return [selectedPatient, ...sliced];
};
