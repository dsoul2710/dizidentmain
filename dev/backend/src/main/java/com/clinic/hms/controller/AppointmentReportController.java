package com.clinic.hms.controller;

import com.clinic.hms.entity.Appointment;
import com.clinic.hms.entity.Doctor;
import com.clinic.hms.entity.Patient;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.entity.VisitTreatmentItem;
import com.clinic.hms.repository.AppointmentRepository;
import com.clinic.hms.repository.VisitTreatmentItemRepository;
import com.clinic.hms.utill.TimeFormatUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Appointment reporting endpoints (Section 2).
 */
@RestController
@RequestMapping("/api/reports/appointments")
@RequiredArgsConstructor
public class AppointmentReportController {

    private final AppointmentRepository appointmentRepository;
    private final VisitTreatmentItemRepository visitTreatmentItemRepository;

    // ---------- Summary ----------
    @GetMapping("/summary")
    public Map<String, Object> summary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) Long doctorId
    ) {
        List<Appointment> appointments = filterAppointments(fromDate, toDate, doctorId);

        long completed = appointments.stream().filter(this::isCompleted).count();
        long cancelled = appointments.stream().filter(a -> isCancelled(normalizeStatus(a.getStatus()))).count();
        long noShow = appointments.stream().filter(a -> isNoShow(normalizeStatus(a.getStatus()))).count();
        long rescheduled = appointments.stream().filter(a -> isRescheduled(normalizeStatus(a.getStatus()))).count();
        long pending = Math.max(0, appointments.size() - completed - cancelled - noShow - rescheduled);

        List<Map<String, Object>> statusBreakdown = appointments.stream()
                .collect(Collectors.groupingBy(a -> normalizeStatus(a.getStatus()), Collectors.counting()))
                .entrySet()
                .stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> Map.<String, Object>of("status", e.getKey(), "count", e.getValue()))
                .toList();

        return Map.of(
                "total", appointments.size(),
                "completed", completed,
                "cancelled", cancelled,
                "noShow", noShow,
                "rescheduled", rescheduled,
                "pending", pending,
                "statusBreakdown", statusBreakdown
        );
    }

    // ---------- Doctor-wise load ----------
    @GetMapping("/doctor-load")
    public List<Map<String, Object>> doctorLoad(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Appointment> appointments = filterAppointments(fromDate, toDate, null);

        return appointments.stream()
                .collect(Collectors.groupingBy(this::doctorKey))
                .entrySet()
                .stream()
                .map(e -> {
                    List<Appointment> list = e.getValue();
                    String doc = e.getKey();
                    long total = list.size();
                    long completed = list.stream().filter(this::isCompleted).count();
                    long cancelled = list.stream().filter(a -> isCancelled(normalizeStatus(a.getStatus()))).count();
                    long noShow = list.stream().filter(a -> isNoShow(normalizeStatus(a.getStatus()))).count();
                    long rescheduled = list.stream().filter(a -> isRescheduled(normalizeStatus(a.getStatus()))).count();

                    return Map.<String, Object>of(
                            "doctor", doc,
                            "total", total,
                            "completed", completed,
                            "cancelled", cancelled,
                            "noShow", noShow,
                            "rescheduled", rescheduled
                    );
                })
                .sorted((a, b) -> Long.compare(((Number) b.get("total")).longValue(), ((Number) a.get("total")).longValue()))
                .toList();
    }

    // ---------- Procedure wise ----------
    @GetMapping("/procedures")
    public Map<String, Object> procedureReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Appointment> appointments = filterAppointments(fromDate, toDate, null);
        Map<Long, List<VisitTreatmentItem>> treatmentsByVisit = loadTreatmentsByVisit(appointments);

        Map<String, Long> counts = new HashMap<>();
        List<Map<String, Object>> rows = new ArrayList<>();

        for (Appointment appt : appointments) {
            List<VisitTreatmentItem> items = treatmentsByVisit.getOrDefault(visitId(appt), Collections.emptyList());
            String procedure = resolveProcedure(appt, items);

            counts.merge(procedure, 1L, Long::sum);

            rows.add(Map.<String, Object>of(
                    "patient", patientName(appt),
                    "doctor", doctorName(appt),
                    "date", appt.getAppointmentDate(),
                    "slot", formatSlot(appt),
                    "status", normalizeStatus(appt.getStatus()),
                    "procedure", procedure
            ));
        }

        List<Map<String, Object>> summary = counts.entrySet()
                .stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> Map.<String, Object>of("procedure", e.getKey(), "count", e.getValue()))
                .toList();

        return Map.of("summary", summary, "rows", rows);
    }

    // ---------- Outcomes ----------
    @GetMapping("/outcomes")
    public Map<String, Object> outcomeReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        List<Appointment> appointments = filterAppointments(fromDate, toDate, null);
        Map<Long, List<VisitTreatmentItem>> treatmentsByVisit = loadTreatmentsByVisit(appointments);

        Map<String, Long> counts = new HashMap<>();
        List<Map<String, Object>> rows = new ArrayList<>();

        for (Appointment appt : appointments) {
            List<VisitTreatmentItem> items = treatmentsByVisit.getOrDefault(visitId(appt), Collections.emptyList());
            String procedure = resolveProcedure(appt, items);
            String outcome = resolveOutcome(appt, items, procedure);

            counts.merge(outcome, 1L, Long::sum);

            rows.add(Map.<String, Object>of(
                    "patient", patientName(appt),
                    "doctor", doctorName(appt),
                    "date", appt.getAppointmentDate(),
                    "slot", formatSlot(appt),
                    "status", normalizeStatus(appt.getStatus()),
                    "procedure", procedure,
                    "outcome", outcome
            ));
        }

        List<Map<String, Object>> summary = counts.entrySet()
                .stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> Map.<String, Object>of("outcome", e.getKey(), "count", e.getValue()))
                .toList();

        return Map.of("summary", summary, "rows", rows);
    }

    // ---------- Helpers ----------
    private List<Appointment> filterAppointments(LocalDate from, LocalDate to, Long doctorId) {
        return appointmentRepository.findAll()
                .stream()
                .filter(a -> withinDate(a, from, to))
                .filter(a -> doctorMatches(a, doctorId))
                .toList();
    }

    private boolean withinDate(Appointment a, LocalDate from, LocalDate to) {
        if (a.getAppointmentDate() == null) return false;
        if (from != null && a.getAppointmentDate().isBefore(from)) return false;
        if (to != null && a.getAppointmentDate().isAfter(to)) return false;
        return true;
    }

    private boolean doctorMatches(Appointment a, Long doctorId) {
        if (doctorId == null) return true;
        Doctor doctor = a.getDoctor();
        return doctor != null && Objects.equals(doctor.getId(), doctorId);
    }

    private boolean isCompleted(Appointment appt) {
        String status = normalizeStatus(appt.getStatus());
        if (status.contains("COMPLETE") || status.contains("DONE")) return true;
        return appt.getVisit() != null && !isCancelled(status) && !isNoShow(status);
    }

    private boolean isCancelled(String status) {
        return status.contains("CANCEL");
    }

    private boolean isNoShow(String status) {
        return status.contains("NO_SHOW") || status.contains("NO-SHOW") || status.contains("NOSHOW");
    }

    private boolean isRescheduled(String status) {
        return status.contains("RESCHEDULE");
    }

    private String normalizeStatus(String status) {
        return Optional.ofNullable(status).orElse("UNKNOWN").trim().toUpperCase();
    }

    private String doctorKey(Appointment appt) {
        Doctor doctor = appt.getDoctor();
        if (doctor == null) return "Unassigned";
        return doctorName(appt);
    }

    private Map<Long, List<VisitTreatmentItem>> loadTreatmentsByVisit(List<Appointment> appointments) {
        Set<Long> visitIds = appointments.stream()
                .map(this::visitId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (visitIds.isEmpty()) return Collections.emptyMap();

        List<VisitTreatmentItem> allItems = visitTreatmentItemRepository.findByVisitIdIn(new ArrayList<>(visitIds));
        return allItems.stream()
                .filter(v -> v.getVisit() != null && v.getVisit().getId() != null)
                .collect(Collectors.groupingBy(v -> v.getVisit().getId()));
    }

    private Long visitId(Appointment appt) {
        Visit visit = appt.getVisit();
        return visit != null ? visit.getId() : null;
    }

    private String resolveProcedure(Appointment appt, List<VisitTreatmentItem> items) {
        if (items != null && !items.isEmpty()) {
            for (VisitTreatmentItem item : items) {
                String fromItem = normalizeProcedure(item.getProcedureName());
                if (fromItem != null) return fromItem;

                String fromCategory = normalizeProcedure(item.getCategoryTitle());
                if (fromCategory != null) return fromCategory;
            }
        }

        String fromReason = normalizeProcedure(appt.getReason());
        return fromReason != null ? fromReason : "Consultation";
    }

    private String normalizeProcedure(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String resolveOutcome(Appointment appt, List<VisitTreatmentItem> items, String procedureCategory) {
        String status = normalizeStatus(appt.getStatus());

        if (isNoShow(status)) return "No-show";
        if (isCancelled(status)) return "Refused";
        if (status.contains("PARTIAL") || status.contains("IN_PROGRESS")) return "Partial";
        if (status.contains("CONSULT")) return "Consultation-only";
        if (isRescheduled(status)) return "Refused";

        if ((items == null || items.isEmpty()) && "Consultation".equals(procedureCategory)) {
            return "Consultation-only";
        }
        if (isCompleted(appt)) return "Completed";
        return "Completed";
    }

    private String formatSlot(Appointment appt) {
        try {
            return TimeFormatUtil.formatSlot(appt.getStartTime());
        } catch (Exception ex) {
            return null;
        }
    }

    private String patientName(Appointment appt) {
        Patient patient = appt.getPatient();
        if (patient == null) return "Unknown";
        return patient.getFullName() != null ? patient.getFullName() : "Patient #" + patient.getId();
    }

    private String doctorName(Appointment appt) {
        Doctor doctor = appt.getDoctor();
        if (doctor == null) return "Unassigned";
        return doctor.getFullName() != null ? doctor.getFullName() : "Doctor #" + doctor.getId();
    }
}
