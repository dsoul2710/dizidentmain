package com.clinic.hms.service;

import com.clinic.hms.dto.response.EventResponse;
import com.clinic.hms.entity.Appointment;
import com.clinic.hms.entity.Bill;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.repository.AppointmentRepository;
import com.clinic.hms.repository.BillRepository;
import com.clinic.hms.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private static final int MAX_EVENTS = 50;

    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    private final BillRepository billRepository;
    private final EventMapper eventMapper;

    @Transactional(readOnly = true)
    public List<EventResponse> listEvents(Long userId, String role) {
        if (role == null || role.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String normalizedRole = role.trim().toUpperCase();
        List<Appointment> appointments;
        List<Visit> visits;
        List<Bill> bills;

        switch (normalizedRole) {
            case "ADMIN" -> {
                appointments = appointmentRepository.findTop50ByOrderByCreatedAtDesc();
                visits = visitRepository.findTop50ByOrderByCreatedAtDesc();
                bills = billRepository.findTop50ByOrderByCreatedAtDesc();
            }
            case "DOCTOR" -> {
                if (userId == null) return Collections.emptyList();
                appointments = appointmentRepository.findTop50ByDoctor_IdOrderByCreatedAtDesc(userId);
                visits = visitRepository.findTop50ByDoctor_IdOrderByCreatedAtDesc(userId);
                bills = billRepository.findTop50ByDoctor_IdOrderByCreatedAtDesc(userId);
            }
            case "PATIENT" -> {
                if (userId == null) return Collections.emptyList();
                appointments = appointmentRepository.findTop50ByPatient_IdOrderByCreatedAtDesc(userId);
                visits = visitRepository.findTop50ByPatient_IdOrderByCreatedAtDesc(userId);
                bills = billRepository.findTop50ByPatient_IdOrderByCreatedAtDesc(userId);
            }
            default -> {
                return Collections.emptyList();
            }
        }

        List<EventItem> items = new ArrayList<>();

        for (Appointment appointment : appointments) {
            LocalDateTime timestamp = appointment.getCreatedAt();
            EventResponse response = eventMapper.fromAppointment(appointment);
            items.add(new EventItem(timestamp, response));
        }

        for (Visit visit : visits) {
            LocalDateTime timestamp = visit.getCreatedAt();
            EventResponse response = eventMapper.fromVisit(visit);
            items.add(new EventItem(timestamp, response));
        }

        for (Bill bill : bills) {
            LocalDateTime timestamp = bill.getCreatedAt();
            EventResponse response = eventMapper.fromBill(bill);
            items.add(new EventItem(timestamp, response));
        }

        return items.stream()
                .sorted(Comparator.comparing(EventItem::getTimestamp, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(MAX_EVENTS)
                .map(EventItem::getResponse)
                .toList();
    }

    private static class EventItem {
        private final LocalDateTime timestamp;
        private final EventResponse response;

        private EventItem(LocalDateTime timestamp, EventResponse response) {
            this.timestamp = timestamp;
            this.response = response;
        }

        private LocalDateTime getTimestamp() {
            return timestamp;
        }

        private EventResponse getResponse() {
            return response;
        }
    }
}
