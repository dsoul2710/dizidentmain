package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.Patient;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.repository.PatientRepository;
import com.clinic.hms.repository.PatientDoctorMappingRepository;
import com.clinic.hms.repository.VisitRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Patient reporting endpoints (read-only) for Section 1 reports.
 * Uses existing patient + visit data only.
 */
@RequiredArgsConstructor
@Service
public class PatientReportService {

    private final PatientRepository patientRepository;
    private final PatientDoctorMappingRepository patientDoctorMappingRepository;
    private final VisitRepository visitRepository;
    private final com.clinic.hms.security.SecurityUtils securityUtils;

    // ---------- helpers ----------

    private Map<Long, PatientSnapshot> loadSnapshots() {
        String role = null;
        try {
            role = securityUtils.getCurrentUserRole();
        } catch (Exception e) {}

        if (role == null) {
            return Collections.emptyMap();
        }

        Long orgId = null;
        Long doctorId = null;
        Long providerId = null;

        if (AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role) || "SUPERADMIN".equalsIgnoreCase(role)) {
            orgId = null;
            doctorId = null;
            providerId = null;
        } else if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)) {
            orgId = securityUtils.getCurrentUserId();
            providerId = null;
        } else if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)) {
            doctorId = securityUtils.getCurrentUserId();
            try {
                orgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}
            providerId = null;
        } else if (AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
            providerId = securityUtils.getCurrentUserId();
            try {
                orgId = securityUtils.getActiveOrgId();
            } catch (Exception e) {}
        } else if (AppConstants.Roles.PATIENT.equalsIgnoreCase(role)) {
            Long patientId = securityUtils.getCurrentUserId();
            Patient p = patientRepository.findByIdAndIsDeletedFalse(patientId).orElse(null);
            if (p == null) return Collections.emptyMap();
            List<Patient> patients = List.of(p);
            return buildSnapshotsForPatients(patients, null, null);
        } else {
            return Collections.emptyMap();
        }

        List<Patient> patients = patientRepository.listPatients(orgId, doctorId, providerId);
        return buildSnapshotsForPatients(patients, orgId, doctorId);
    }

    private Map<Long, PatientSnapshot> buildSnapshotsForPatients(List<Patient> patients, Long orgId, Long doctorId) {
        List<Visit> scopedVisits = loadVisitsForPatients(patients, orgId, doctorId);

        Map<Long, List<Visit>> visitsByPatient = scopedVisits.stream()
                .filter(v -> v.getPatient() != null)
                .collect(Collectors.groupingBy(v -> v.getPatient().getId()));

        Map<Long, PatientSnapshot> map = new HashMap<>();
        for (Patient p : patients) {
            User u = p.getUser();
            List<Visit> vlist = visitsByPatient.getOrDefault(p.getId(), Collections.emptyList());

            LocalDate firstVisit = vlist.stream()
                    .map(v -> v.getVisitDate().toLocalDate())
                    .min(LocalDate::compareTo)
                    .orElse(null);
            LocalDate lastVisit = vlist.stream()
                    .map(v -> v.getVisitDate().toLocalDate())
                    .max(LocalDate::compareTo)
                    .orElse(null);

            Long primaryDocId = patientDoctorMappingRepository.findByPatient(p)
                    .stream()
                    .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                    .map(m -> m.getDoctor().getId())
                    .findFirst()
                    .orElse(null);

            map.put(p.getId(), PatientSnapshot.builder()
                    .patientUserId(p.getId())
                    .name(p.getFullName())
                    .mobile(u.getMobile())
                    .gender(p.getGender())
                    .city(p.getCity())
                    .referredBy(p.getReferredBy())
                    .dob(p.getDob())
                    .ageYears(p.getAgeYears())
                    .assignedDoctorId(primaryDocId)
                    .firstVisit(firstVisit)
                    .lastVisit(lastVisit)
                    .visitCount(vlist.size())
                    .build());
        }
        return map;
    }

    private List<Visit> loadVisitsForPatients(List<Patient> patients, Long orgId, Long doctorId) {
        if (patients.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> patientIds = patients.stream().map(Patient::getId).collect(Collectors.toSet());
        List<Visit> scoped;
        if (orgId != null) {
            scoped = visitRepository.findByOwner_Id(orgId);
        } else if (doctorId != null) {
            scoped = visitRepository.findByDoctor_Id(doctorId);
        } else {
            scoped = visitRepository.findByPatient_IdIn(patientIds);
        }
        return scoped.stream()
                .filter(v -> v.getPatient() != null && patientIds.contains(v.getPatient().getId()))
                .toList();
    }

    private Integer resolveAge(PatientSnapshot p) {
        if (p.getAgeYears() != null) return p.getAgeYears();
        if (p.getDob() != null) {
            return Period.between(p.getDob(), LocalDate.now()).getYears();
        }
        return null;
    }

    private boolean withinDate(LocalDate date, LocalDate from, LocalDate to) {
        if (date == null) return false;
        if (from != null && date.isBefore(from)) return false;
        if (to != null && date.isAfter(to)) return false;
        return true;
    }

    private AgeRange parseAgeRange(String range) {
        if (range == null || range.isBlank()) return null;
        String cleaned = range.replace("+", "");
        if (!cleaned.contains("-")) {
            try {
                int val = Integer.parseInt(cleaned.trim());
                return new AgeRange(val, val);
            } catch (NumberFormatException ignored) {
            }
        }
        try {
            String[] parts = cleaned.split("-");
            int min = Integer.parseInt(parts[0].trim());
            int max = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : Integer.MAX_VALUE;
            return new AgeRange(min, max);
        } catch (Exception ex) {
            return null;
        }
    }

    private boolean matchesAge(PatientSnapshot p, AgeRange range) {
        if (range == null) return true;
        Integer age = resolveAge(p);
        if (age == null) return false;
        return age >= range.min && age <= range.max;
    }

    private boolean matchesGender(PatientSnapshot p, String gender) {
        if (gender == null || gender.isBlank()) return true;
        if (p.getGender() == null) return false;
        return p.getGender().equalsIgnoreCase(gender);
    }

    private boolean matchesDoctor(PatientSnapshot p, Long doctorId) {
        if (doctorId == null) return true;
        return Objects.equals(p.getAssignedDoctorId(), doctorId);
    }

    private boolean matchesArea(PatientSnapshot p, String area) {
        if (area == null || area.isBlank()) return true;
        if (p.getCity() == null) return false;
        return p.getCity().toLowerCase().contains(area.toLowerCase());
    }

    // ---------- API: Age / Age Range ----------
    public Map<String, Object> ageReport(
            LocalDate fromDate,
            LocalDate toDate,
            String ageGroup,
            Long doctorId,
            String gender
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();
        AgeRange range = parseAgeRange(ageGroup);

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> {
                    // date filter: either first or last visit in range
                    if (fromDate != null || toDate != null) {
                        if (!withinDate(p.getFirstVisit(), fromDate, toDate)
                                && !withinDate(p.getLastVisit(), fromDate, toDate)) {
                            return false;
                        }
                    }
                    return matchesAge(p, range)
                            && matchesDoctor(p, doctorId)
                            && matchesGender(p, gender);
                })
                .toList();

        List<BracketCount> summary = buildAgeBrackets(map.values());
        return Map.of(
                "summary", summary,
                "patients", filtered.stream().map(this::toPatientRow).toList()
        );
    }

    // ---------- API: Area wise ----------
    public Map<String, Object> areaReport(
            LocalDate fromDate,
            LocalDate toDate,
            String area,
            Long doctorId,
            String newExisting
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> {
                    if (fromDate != null || toDate != null) {
                        if (!withinDate(p.getFirstVisit(), fromDate, toDate)
                                && !withinDate(p.getLastVisit(), fromDate, toDate)) {
                            return false;
                        }
                    }
                    if (!matchesArea(p, area)) return false;
                    if (!matchesDoctor(p, doctorId)) return false;

                    if ("new".equalsIgnoreCase(newExisting)) {
                        return withinDate(p.getFirstVisit(), fromDate, toDate);
                    }
                    if ("existing".equalsIgnoreCase(newExisting)) {
                        return !withinDate(p.getFirstVisit(), fromDate, toDate);
                    }
                    return true;
                })
                .toList();

        Map<String, Long> grouped = filtered.stream()
                .collect(Collectors.groupingBy(
                        p -> Optional.ofNullable(p.getCity()).orElse("Unknown"),
                        Collectors.counting()
                ));

        List<Map<String, Object>> summary = grouped.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> Map.<String, Object>of("area", e.getKey(), "count", e.getValue()))
                .toList();

        List<Map<String, Object>> rows = filtered.stream()
                .map(p -> Map.<String, Object>of(
                        "patient", p.getName(),
                        "area", p.getCity(),
                        "firstVisit", p.getFirstVisit(),
                        "lastVisit", p.getLastVisit(),
                        "type", withinDate(p.getFirstVisit(), fromDate, toDate) ? "New" : "Existing"
                ))
                .toList();

        return Map.of("summary", summary, "patients", rows);
    }

    // ---------- API: Birthday wise ----------
    public Map<String, Object> birthdayReport(
            String scope,
            LocalDate date,
            String ageRange,
            boolean activeOnly
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();
        AgeRange range = parseAgeRange(ageRange);
        LocalDate ref = date != null ? date : LocalDate.now();

        LocalDate start;
        LocalDate end;
        switch (scope.toLowerCase()) {
            case "today" -> {
                start = ref;
                end = ref;
            }
            case "week" -> {
                start = ref.minusDays(7);
                end = ref.plusDays(7);
            }
            case "month" -> {
                start = ref.withDayOfMonth(1);
                end = ref.withDayOfMonth(ref.lengthOfMonth());
            }
            default -> {
                start = ref;
                end = ref;
            }
        }

        LocalDate activeCutoff = LocalDate.now().minusMonths(12);
        List<Map<String, Object>> rows = map.values().stream()
                .filter(p -> p.getDob() != null)
                .filter(p -> matchesAge(p, range))
                .filter(p -> {
                    LocalDate dob = p.getDob();
                    LocalDate dobThisYear = dob.withYear(ref.getYear());
                    return !dobThisYear.isBefore(start) && !dobThisYear.isAfter(end);
                })
                .filter(p -> !activeOnly || (p.getLastVisit() != null && !p.getLastVisit().isBefore(activeCutoff)))
                .map(p -> Map.<String, Object>of(
                        "patient", p.getName(),
                        "dob", p.getDob(),
                        "age", resolveAge(p),
                        "mobile", p.getMobile()
                ))
                .toList();

        return Map.of("patients", rows);
    }

    // ---------- API: Gender wise ----------
    public Map<String, Object> genderReport(
            LocalDate fromDate,
            LocalDate toDate,
            String ageRange,
            String area
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();
        AgeRange range = parseAgeRange(ageRange);

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> {
                    if (fromDate != null || toDate != null) {
                        if (!withinDate(p.getFirstVisit(), fromDate, toDate)
                                && !withinDate(p.getLastVisit(), fromDate, toDate)) {
                            return false;
                        }
                    }
                    return matchesAge(p, range) && matchesArea(p, area);
                })
                .toList();

        Map<String, Long> grouped = filtered.stream()
                .collect(Collectors.groupingBy(p -> Optional.ofNullable(p.getGender()).orElse("Unknown"), Collectors.counting()));

        List<Map<String, Object>> summary = grouped.entrySet().stream()
                .map(e -> Map.<String, Object>of("gender", e.getKey(), "count", e.getValue()))
                .toList();

        return Map.of(
                "summary", summary,
                "patients", filtered.stream().map(this::toPatientRow).toList()
        );
    }

    // ---------- API: Active patients ----------
    public Map<String, Object> activeReport(
            int windowMonths,
            Long doctorId,
            String area,
            String ageRange,
            String gender
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();
        AgeRange range = parseAgeRange(ageRange);
        LocalDate cutoff = LocalDate.now().minusMonths(windowMonths);

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> p.getLastVisit() != null && !p.getLastVisit().isBefore(cutoff))
                .filter(p -> matchesDoctor(p, doctorId))
                .filter(p -> matchesArea(p, area))
                .filter(p -> matchesAge(p, range))
                .filter(p -> matchesGender(p, gender))
                .toList();

        return Map.of(
                "count", filtered.size(),
                "patients", filtered.stream().map(this::toPatientRow).toList()
        );
    }

    // ---------- API: Inactive patients ----------
    public Map<String, Object> inactiveReport(
            LocalDate lastVisitBefore,
            Long doctorId,
            String area,
            String ageRange,
            String gender
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();
        AgeRange range = parseAgeRange(ageRange);

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> p.getLastVisit() == null || p.getLastVisit().isBefore(lastVisitBefore))
                .filter(p -> matchesDoctor(p, doctorId))
                .filter(p -> matchesArea(p, area))
                .filter(p -> matchesAge(p, range))
                .filter(p -> matchesGender(p, gender))
                .toList();

        return Map.of(
                "count", filtered.size(),
                "patients", filtered.stream().map(this::toPatientRow).toList()
        );
    }

    // ---------- API: Referral wise ----------
    public Map<String, Object> referralReport(
            LocalDate fromDate,
            LocalDate toDate,
            String source,
            String newExisting,
            Long doctorId
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> {
                    if (fromDate != null || toDate != null) {
                        if (!withinDate(p.getFirstVisit(), fromDate, toDate)
                                && !withinDate(p.getLastVisit(), fromDate, toDate)) {
                            return false;
                        }
                    }
                    if (source != null && !source.isBlank()) {
                        if (p.getReferredBy() == null || !p.getReferredBy().equalsIgnoreCase(source)) {
                            return false;
                        }
                    }
                    if (!matchesDoctor(p, doctorId)) return false;

                    if ("new".equalsIgnoreCase(newExisting)) {
                        return withinDate(p.getFirstVisit(), fromDate, toDate);
                    }
                    if ("existing".equalsIgnoreCase(newExisting)) {
                        return !withinDate(p.getFirstVisit(), fromDate, toDate);
                    }
                    return true;
                })
                .toList();

        Map<String, Long> grouped = filtered.stream()
                .collect(Collectors.groupingBy(p -> Optional.ofNullable(p.getReferredBy()).orElse("Unknown"), Collectors.counting()));

        List<Map<String, Object>> summary = grouped.entrySet().stream()
                .map(e -> Map.<String, Object>of(
                        "source", e.getKey(),
                        "patients", e.getValue(),
                        "newPatients", filtered.stream()
                                .filter(p -> withinDate(p.getFirstVisit(), fromDate, toDate))
                                .filter(p -> Objects.equals(Optional.ofNullable(p.getReferredBy()).orElse("Unknown"), e.getKey()))
                                .count()
                ))
                .toList();

        return Map.of(
                "summary", summary,
                "patients", filtered.stream().map(this::toPatientRow).toList()
        );
    }

    // ---------- API: New patients ----------
    public Map<String, Object> newPatientsReport(
            LocalDate fromDate,
            LocalDate toDate,
            Long doctorId,
            String referral,
            String area,
            String gender,
            String ageRange
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();
        AgeRange range = parseAgeRange(ageRange);

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> withinDate(p.getFirstVisit(), fromDate, toDate))
                .filter(p -> matchesDoctor(p, doctorId))
                .filter(p -> matchesArea(p, area))
                .filter(p -> matchesGender(p, gender))
                .filter(p -> matchesAge(p, range))
                .filter(p -> {
                    if (referral == null || referral.isBlank()) return true;
                    return p.getReferredBy() != null && p.getReferredBy().equalsIgnoreCase(referral);
                })
                .toList();

        return Map.of(
                "count", filtered.size(),
                "patients", filtered.stream().map(this::toPatientRow).toList()
        );
    }

    // ---------- API: Patient master ----------
    public Map<String, Object> masterReport(
            String search,
            String ageRange,
            String gender,
            String area,
            LocalDate firstVisitFrom,
            LocalDate firstVisitTo,
            LocalDate lastVisitFrom,
            LocalDate lastVisitTo,
            String referral,
            String status
    ) {
        Map<Long, PatientSnapshot> map = loadSnapshots();
        AgeRange range = parseAgeRange(ageRange);

        List<PatientSnapshot> filtered = map.values().stream()
                .filter(p -> {
                    if (search != null && !search.isBlank()) {
                        String s = search.toLowerCase();
                        boolean matchName = p.getName() != null && p.getName().toLowerCase().contains(s);
                        boolean matchMobile = p.getMobile() != null && p.getMobile().contains(search);
                        if (!matchName && !matchMobile) return false;
                    }
                    if (!matchesAge(p, range)) return false;
                    if (!matchesGender(p, gender)) return false;
                    if (!matchesArea(p, area)) return false;
                    if (firstVisitFrom != null && (p.getFirstVisit() == null || p.getFirstVisit().isBefore(firstVisitFrom))) return false;
                    if (firstVisitTo != null && (p.getFirstVisit() == null || p.getFirstVisit().isAfter(firstVisitTo))) return false;
                    if (lastVisitFrom != null && (p.getLastVisit() == null || p.getLastVisit().isBefore(lastVisitFrom))) return false;
                    if (lastVisitTo != null && (p.getLastVisit() == null || p.getLastVisit().isAfter(lastVisitTo))) return false;
                    if (referral != null && !referral.isBlank()) {
                        if (p.getReferredBy() == null || !p.getReferredBy().equalsIgnoreCase(referral)) return false;
                    }
                    if ("active".equalsIgnoreCase(status)) {
                        LocalDate cutoff = LocalDate.now().minusMonths(12);
                        if (p.getLastVisit() == null || p.getLastVisit().isBefore(cutoff)) return false;
                    }
                    if ("inactive".equalsIgnoreCase(status)) {
                        LocalDate cutoff = LocalDate.now().minusMonths(12);
                        if (p.getLastVisit() != null && !p.getLastVisit().isBefore(cutoff)) return false;
                    }
                    return true;
                })
                .toList();

        return Map.of(
                "patients", filtered.stream().map(p -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("patient", p.getName());
                    row.put("mobile", p.getMobile());
                    row.put("age", resolveAge(p));
                    row.put("gender", p.getGender());
                    row.put("area", p.getCity());
                    row.put("firstVisit", p.getFirstVisit());
                    row.put("lastVisit", p.getLastVisit());
                    row.put("referral", p.getReferredBy());
                    row.put("status", statusLabel(p.getLastVisit()));
                    return row;
                }).toList()
        );
    }

    // ---------- utilities ----------
    private List<BracketCount> buildAgeBrackets(Collection<PatientSnapshot> values) {
        List<BracketCount> brackets = new ArrayList<>();
        List<String> labels = List.of("0-12", "13-19", "20-30", "31-45", "46-60", "60+");
        for (String l : labels) {
            AgeRange r = parseAgeRange(l);
            long count = values.stream()
                    .filter(p -> matchesAge(p, r))
                    .count();
            brackets.add(new BracketCount(l, count));
        }
        return brackets;
    }

    private Map<String, Object> toPatientRow(PatientSnapshot p) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("patient", p.getName());
        row.put("age", resolveAge(p));
        row.put("gender", p.getGender());
        row.put("city", p.getCity());
        row.put("firstVisit", p.getFirstVisit());
        row.put("lastVisit", p.getLastVisit());
        row.put("referredBy", p.getReferredBy());
        row.put("visitCount", p.getVisitCount());
        return row;
    }

    private String statusLabel(LocalDate lastVisit) {
        if (lastVisit == null) return "Inactive";
        LocalDate cutoff = LocalDate.now().minusMonths(12);
        return lastVisit.isBefore(cutoff) ? "Inactive" : "Active";
    }

    // ---------- DTOs ----------
    @Data
    @Builder
    @AllArgsConstructor
    static class PatientSnapshot {
        private Long patientUserId;
        private String name;
        private String mobile;
        private String gender;
        private String city;
        private String referredBy;
        private LocalDate dob;
        private Integer ageYears;
        private Long assignedDoctorId;
        private LocalDate firstVisit;
        private LocalDate lastVisit;
        private Integer visitCount;
    }

    record BracketCount(String bracket, long count) {}

    record AgeRange(int min, int max) {}
}
