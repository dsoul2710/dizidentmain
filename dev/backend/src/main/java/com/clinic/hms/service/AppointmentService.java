// src/main/java/com/clinic/hms/service/AppointmentService.java
package com.clinic.hms.service;

import com.clinic.hms.dto.request.AppointmentCreateRequest;
import com.clinic.hms.dto.request.AppointmentUpdateRequest;
import com.clinic.hms.dto.response.AppointmentResponse;
import com.clinic.hms.entity.Appointment;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.repository.AppointmentRepository;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.repository.VisitRepository;
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
    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final VisitRepository visitRepository;
    private final EventPushService eventPushService;

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listAppointmentsForDate(LocalDate date) {
        return appointmentRepository.findByAppointmentDate(date)
                .stream()
                .filter(appointment -> !isCancelled(appointment))
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> listAppointmentsInRange(LocalDate fromDate, LocalDate toDate) {
        return appointmentRepository
                .findByAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(fromDate, toDate)
                .stream()
                .filter(appointment -> !isCancelled(appointment))
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
        User patient = userRepository.findById(req.getPatientUserId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient user id"));

        // DOCTOR (optional: use explicit id OR patient's assigned doctor, OR null)
        User doctor = null;
        if (req.getDoctorUserId() != null) {
            doctor = userRepository.findById(req.getDoctorUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid doctor user id"));
        } else {
            // Try fallback: patient's assigned doctor
            UserDetails patientDetails = userDetailsRepository
                    .findFirstByUser_Id(patient.getId())
                    .orElse(null);
            if (patientDetails != null && patientDetails.getAssignedDoctor() != null) {
                doctor = patientDetails.getAssignedDoctor();
            }
        }

        Visit visit = null;
        if (req.getVisitId() != null) {
            visit = visitRepository.findById(req.getVisitId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid visit id"));
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .visit(visit)
                .appointmentDate(date)
                .startTime(startTime)
                .endTime(endTime)
                .status("BOOKED")
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
        appt.setStatus("CANCELLED");
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
        return status.trim().equalsIgnoreCase("CANCELLED")
                || status.trim().toUpperCase().contains("CANCEL");
    }

    private AppointmentResponse toDto(Appointment a) {
        User patient = a.getPatient();
        User doctor = a.getDoctor();

        UserDetails patientDetails = patient != null
                ? userDetailsRepository.findFirstByUser_Id(patient.getId()).orElse(null)
                : null;

        UserDetails doctorDetails = doctor != null
                ? userDetailsRepository.findFirstByUser_Id(doctor.getId()).orElse(null)
                : null;

        return AppointmentResponse.builder()
                .id(a.getId())
                .date(a.getAppointmentDate().toString())          // "YYYY-MM-DD"
                .slot(TimeFormatUtil.formatSlot(a.getStartTime()))// "1:30 PM"
                .patientUserId(patient != null ? patient.getId() : null)
                .patientName(patientDetails != null ? patientDetails.getFullName() : null)
                .patientMobile(patient != null ? patient.getMobile() : null)
                .doctorUserId(doctor != null ? doctor.getId() : null)
                .doctorName(doctorDetails != null ? doctorDetails.getFullName() : null)
                .visitId(a.getVisit() != null ? a.getVisit().getId() : null)
                .description(a.getReason())
                .status(a.getStatus())
                .build();
    }
}
