package com.clinic.hms.service;

import com.clinic.hms.dto.response.EventResponse;
import com.clinic.hms.entity.Appointment;
import com.clinic.hms.entity.Bill;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.utill.TimeFormatUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EventMapper {

    private final UserDetailsRepository userDetailsRepository;

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
                .patientName(resolveName(appointment.getPatient()))
                .doctorName(resolveName(appointment.getDoctor()))
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
                .patientName(resolveName(visit.getPatient()))
                .doctorName(resolveName(visit.getDoctor()))
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
                .patientName(resolveName(bill.getPatient()))
                .doctorName(resolveName(bill.getDoctor()))
                .amount(bill.getNetAmount())
                .build();
    }

    private String resolveName(User user) {
        if (user == null) return null;
        UserDetails details = userDetailsRepository.findFirstByUser_Id(user.getId()).orElse(null);
        if (details != null && details.getFullName() != null && !details.getFullName().isBlank()) {
            return details.getFullName();
        }
        return user.getMobile();
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
