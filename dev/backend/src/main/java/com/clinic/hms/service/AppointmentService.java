// src/main/java/com/clinic/hms/service/AppointmentService.java
package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.AppointmentCreateRequest;
import com.clinic.hms.dto.request.AppointmentUpdateRequest;
import com.clinic.hms.dto.response.AppointmentResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import com.clinic.hms.utill.TimeFormatUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final PatientDoctorMappingRepository patientDoctorMappingRepository;
    private final VisitRepository visitRepository;
    private final EventPushService eventPushService;
    private final com.clinic.hms.security.SecurityUtils securityUtils;
    private final UserRepository userRepository;
    private final com.clinic.hms.service.attribution.SourceOrgResolver sourceOrgResolver;

    private Long resolveOwnerId() {
        try {
            String role = securityUtils.getCurrentUserRole();
            if (com.clinic.hms.constants.AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
                return securityUtils.getCurrentUserId();
            }
            Long orgId = securityUtils.getActiveOrgId();
            if (orgId != null) {
                return orgId;
            }
        } catch (Exception e) {
            // Ignore context exceptions
        }
        return securityUtils.getCurrentUserId();
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listAppointmentsForDate(LocalDate date) {
        Long ownerId = resolveOwnerId();
        final Long finalOwnerId = ownerId;
        return appointmentRepository.findByAppointmentDate(date)
                .stream()
                .filter(appointment -> !isCancelled(appointment))
                .filter(appointment -> finalOwnerId == null || (appointment.getOwner() != null && finalOwnerId.equals(appointment.getOwner().getId())))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listAppointmentsInRange(LocalDate fromDate, LocalDate toDate) {
        Long ownerId = resolveOwnerId();
        final Long finalOwnerId = ownerId;
        return appointmentRepository
                .findByAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(fromDate, toDate)
                .stream()
                .filter(appointment -> !isCancelled(appointment))
                .filter(appointment -> finalOwnerId == null || (appointment.getOwner() != null && finalOwnerId.equals(appointment.getOwner().getId())))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AppointmentResponse createAppointment(AppointmentCreateRequest req) {
        LocalDate date = LocalDate.parse(req.getDate()); // "YYYY-MM-DD"
        LocalTime startTime = TimeFormatUtil.parseSlot(req.getSlot());
        LocalTime endTime = startTime.plusMinutes(30);
        LocalDateTime now = LocalDateTime.now();

        // PATIENT (required)
        Patient patient = patientRepository.findById(req.getPatientUserId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient user id"));

        // DOCTOR (optional: use explicit id OR patient's assigned doctor, OR null)
        Doctor doctor = null;
        if (req.getDoctorUserId() != null) {
            doctor = doctorRepository.findById(req.getDoctorUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid doctor user id"));
        } else {
            // Try fallback: patient's assigned doctor
            List<PatientDoctorMapping> mappings = patientDoctorMappingRepository.findByPatient(patient);
            if (!mappings.isEmpty()) {
                doctor = mappings.get(0).getDoctor();
            }
        }

        Visit visit = null;
        if (req.getVisitId() != null) {
            visit = visitRepository.findById(req.getVisitId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid visit id"));
        }

        Long ownerId = resolveOwnerId();
        User owner = ownerId != null ? userRepository.findById(ownerId).orElse(null) : null;
        OrgHospital sourceOrg = sourceOrgResolver.resolveSourceOrgForCreate();

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .visit(visit)
                .owner(owner)
                .sourceOrg(sourceOrg)
                .appointmentDate(date)
                .startTime(startTime)
                .endTime(endTime)
                .status(AppConstants.AppointmentStatus.BOOKED)
                .reason(req.getDescription())
                .notes(req.getDescription())
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(req.getCreatedByUserId())
                .build();

        appointment = appointmentRepository.save(appointment);
        eventPushService.publishAppointment(appointment);

        return toDto(appointment);
    }

    @Transactional
    public void cancelAppointment(Long id) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        appt.setStatus(AppConstants.AppointmentStatus.CANCELLED);
        appt.setUpdatedAt(LocalDateTime.now());
        appointmentRepository.save(appt);
    }

    @Transactional
    public AppointmentResponse updateAppointment(Long id, AppointmentUpdateRequest req) {
        Appointment appt = appointmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        LocalDate newDate = req.getDate() != null
                ? LocalDate.parse(req.getDate())
                : appt.getAppointmentDate();
        LocalTime newStart = req.getSlot() != null
                ? TimeFormatUtil.parseSlot(req.getSlot())
                : appt.getStartTime();
        LocalTime newEnd = newStart.plusMinutes(30);

        Long doctorId = appt.getDoctor() != null ? appt.getDoctor().getId() : null;
        if (isSlotBooked(newDate, newStart, doctorId, id)) {
            throw new IllegalArgumentException("This time slot is already booked for the selected date.");
        }

        Visit visit = null;
        if (req.getVisitId() != null) {
            visit = visitRepository.findById(req.getVisitId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid visit id"));
        }

        appt.setAppointmentDate(newDate);
        appt.setStartTime(newStart);
        appt.setEndTime(newEnd);
        appt.setVisit(visit);
        if (req.getDescription() != null) {
            appt.setReason(req.getDescription());
            appt.setNotes(req.getDescription());
        }
        appt.setUpdatedAt(LocalDateTime.now());

        Appointment saved = appointmentRepository.save(appt);
        eventPushService.publishAppointment(saved);

        return toDto(saved);
    }

    private boolean isSlotBooked(LocalDate date, LocalTime startTime, Long doctorUserId, Long excludeId) {
        return appointmentRepository.findByAppointmentDate(date)
                .stream()
                .filter(appointment -> appointment.getId() != null && !appointment.getId().equals(excludeId))
                .filter(appointment -> !isCancelled(appointment))
                .filter(appointment -> {
                    Long otherDoctorId = appointment.getDoctor() != null
                            ? appointment.getDoctor().getId()
                            : null;
                    if (doctorUserId == null) {
                        return otherDoctorId == null;
                    }
                    return doctorUserId.equals(otherDoctorId);
                })
                .anyMatch(appointment -> startTime.equals(appointment.getStartTime()));
    }

    private boolean isCancelled(Appointment appointment) {
        String status = appointment.getStatus();
        if (status == null) return false;
        return status.trim().equalsIgnoreCase(AppConstants.AppointmentStatus.CANCELLED)
                || status.trim().toUpperCase().contains("CANCEL");
    }

    private AppointmentResponse toDto(Appointment a) {
        Patient patient = a.getPatient();
        Doctor doctor = a.getDoctor();
        var attribution = com.clinic.hms.service.attribution.SourceAttributionMapper.fromOrg(a.getSourceOrg());

        return AppointmentResponse.builder()
                .id(a.getId())
                .date(a.getAppointmentDate().toString())          // "YYYY-MM-DD"
                .slot(TimeFormatUtil.formatSlot(a.getStartTime()))// "1:30 PM"
                .patientUserId(patient != null ? patient.getId() : null)
                .patientName(patient != null ? patient.getFullName() : null)
                .patientMobile(patient != null && patient.getUser() != null ? patient.getUser().getMobile() : null)
                .doctorUserId(doctor != null ? doctor.getId() : null)
                .doctorName(doctor != null ? doctor.getFullName() : null)
                .visitId(a.getVisit() != null ? a.getVisit().getId() : null)
                .description(a.getReason())
                .status(a.getStatus())
                .sourceOrgId(attribution.getSourceOrgId())
                .sourceOrgName(attribution.getSourceOrgName())
                .sourceType(attribution.getSourceType())
                .build();
    }
}
