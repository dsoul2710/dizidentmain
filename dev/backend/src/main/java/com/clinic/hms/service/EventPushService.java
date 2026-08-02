package com.clinic.hms.service;

import com.clinic.hms.dto.response.EventResponse;
import com.clinic.hms.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EventPushService {

    private static final String USER_TOPIC_PREFIX = "/topic/events.user.";

    private final SimpMessagingTemplate messagingTemplate;
    private final EventMapper eventMapper;

    public void publishAppointment(Appointment appointment) {
        EventResponse payload = eventMapper.fromAppointment(appointment);
        publishToTargets(payload, appointment != null ? appointment.getPatient() : null, appointment != null ? appointment.getDoctor() : null);
    }

    public void publishVisit(Visit visit) {
        EventResponse payload = eventMapper.fromVisit(visit);
        publishToTargets(payload, visit != null ? visit.getPatient() : null, visit != null ? visit.getDoctor() : null);
    }

    public void publishBill(Bill bill) {
        EventResponse payload = eventMapper.fromBill(bill);
        publishToTargets(payload, bill != null ? bill.getPatient() : null, bill != null ? bill.getDoctor() : null);
    }

    private void publishToTargets(EventResponse payload, Patient patient, Doctor doctor) {
        if (payload == null) return;

        if (patient != null && patient.getId() != null) {
            messagingTemplate.convertAndSend(USER_TOPIC_PREFIX + patient.getId(), payload);
        }
    }
}
