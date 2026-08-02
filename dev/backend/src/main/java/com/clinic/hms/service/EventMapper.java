package com.clinic.hms.service;

import com.clinic.hms.dto.response.EventResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.utill.TimeFormatUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EventMapper {

    public EventResponse fromAppointment(Appointment appointment) {
        if (appointment == null) return null;
        return EventResponse.builder()
                .type("APPOINTMENT_SCHEDULED")
                .title("Appointment scheduled")
                .subtitle(buildAppointmentSubtitle(appointment))
                .status(appointment.getStatus())
                .timestamp(appointment.getCreatedAt() != null ? appointment.getCreatedAt().toString() : null)
                .appointmentId(appointment.getId())
                .actorUserId(appointment.getCreatedByUserId())
                .visitId(appointment.getVisit() != null ? appointment.getVisit().getId() : null)
                .patientName(resolvePatientName(appointment.getPatient()))
                .doctorName(resolveDoctorName(appointment.getDoctor()))
                .appointmentDate(appointment.getAppointmentDate() != null ? appointment.getAppointmentDate().toString() : null)
                .appointmentTime(appointment.getStartTime() != null ? TimeFormatUtil.formatSlot(appointment.getStartTime()) : null)
                .build();
    }

    public EventResponse fromVisit(Visit visit) {
        if (visit == null) return null;
        return EventResponse.builder()
                .type("VISIT_CREATED")
                .title("Visit created")
                .subtitle("Visit ID: " + visit.getId())
                .status(visit.getStatus())
                .timestamp(visit.getCreatedAt() != null ? visit.getCreatedAt().toString() : null)
                .visitId(visit.getId())
                .actorUserId(visit.getCreatedByUserId())
                .patientName(resolvePatientName(visit.getPatient()))
                .doctorName(resolveDoctorName(visit.getDoctor()))
                .build();
    }

    public EventResponse fromBill(Bill bill) {
        if (bill == null) return null;
        return EventResponse.builder()
                .type("BILL_GENERATED")
                .title("Bill generated")
                .subtitle("Bill no: " + bill.getBillNo())
                .status(bill.getStatus())
                .timestamp(bill.getCreatedAt() != null ? bill.getCreatedAt().toString() : null)
                .billId(bill.getId())
                .actorUserId(bill.getCreatedByUserId())
                .visitId(bill.getVisit() != null ? bill.getVisit().getId() : null)
                .patientName(resolvePatientName(bill.getPatient()))
                .doctorName(resolveDoctorName(bill.getDoctor()))
                .amount(bill.getNetAmount())
                .build();
    }

    private String resolvePatientName(Patient p) {
        if (p == null) return null;
        if (p.getFullName() != null && !p.getFullName().isBlank()) {
            return p.getFullName();
        }
        return p.getUser() != null ? p.getUser().getMobile() : null;
    }

    private String resolveDoctorName(Doctor d) {
        if (d == null) return null;
        if (d.getFullName() != null && !d.getFullName().isBlank()) {
            return d.getFullName();
        }
        return d.getUser() != null ? d.getUser().getMobile() : null;
    }

    private String buildAppointmentSubtitle(Appointment appointment) {
        if (appointment.getAppointmentDate() == null && appointment.getStartTime() == null) {
            return "Appointment ID: " + appointment.getId();
        }
        String date = appointment.getAppointmentDate() != null ? appointment.getAppointmentDate().toString() : "-";
        String time = appointment.getStartTime() != null ? TimeFormatUtil.formatSlot(appointment.getStartTime()) : "-";
        return "Date: " + date + " at " + time;
    }
}
