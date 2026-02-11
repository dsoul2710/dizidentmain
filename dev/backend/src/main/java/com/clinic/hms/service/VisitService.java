// src/main/java/com/clinic/hms/service/VisitService.java
package com.clinic.hms.service;

import com.clinic.hms.dto.request.VisitCreateRequest;
import com.clinic.hms.dto.request.VisitUpdateRequest;
import com.clinic.hms.dto.response.VisitResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VisitService {

    private final VisitRepository visitRepository;
    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final EventPushService eventPushService;

    @Transactional
    public VisitResponse createVisit(VisitCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();

        User patient = userRepository.findById(req.getPatientUserId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient user id"));

        User doctor = null;
        if (req.getDoctorUserId() != null) {
            doctor = userRepository.findById(req.getDoctorUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid doctor user id"));
        }

        Visit visit = Visit.builder()
                .patient(patient)
                .doctor(doctor)
                .visitDate(now)
                .visitType(req.getVisitType() != null ? req.getVisitType() : "NEW")
                .chiefComplaint(req.getChiefComplaint())
                .notes(req.getNotes())
                .status("OPEN")
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(req.getCreatedByUserId())
                .build();

        visit = visitRepository.save(visit);
        eventPushService.publishVisit(visit);

        return toDto(visit);
    }

    @Transactional(readOnly = true)
    public List<VisitResponse> listVisitsForPatient(Long patientUserId) {
        List<Visit> visits = visitRepository.findByPatient_Id(patientUserId);
        return visits.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public VisitResponse autoCreateVisit(Long patientUserId) {
        User patient = userRepository.findById(patientUserId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient user id"));

        // If patient already has a visit, return the most recent one
        List<Visit> existing = visitRepository.findByPatient_Id(patientUserId);
        if (!existing.isEmpty()) {
            Visit latest = existing.stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .findFirst()
                    .orElse(existing.get(0));
            return toDto(latest);
        }

        LocalDateTime now = LocalDateTime.now();
        Visit visit = Visit.builder()
                .patient(patient)
                .doctor(null)
                .visitDate(now)
                .visitType("NEW")
                .chiefComplaint(null)
                .notes(null)
                .status("OPEN")
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(patientUserId)
                .build();

        visit = visitRepository.save(visit);
        eventPushService.publishVisit(visit);
        return toDto(visit);
    }

    @Transactional
    public VisitResponse updateVisit(Long visitId, VisitUpdateRequest req) {
        Visit visit = visitRepository.findById(visitId)
                .orElseThrow(() -> new IllegalArgumentException("Visit not found: " + visitId));

        if (req.getDoctorUserId() != null) {
            User doctor = userRepository.findById(req.getDoctorUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid doctor user id"));
            visit.setDoctor(doctor);
        }
        if (req.getVisitType() != null) {
            visit.setVisitType(req.getVisitType());
        }
        if (req.getChiefComplaint() != null) {
            visit.setChiefComplaint(req.getChiefComplaint());
        }
        if (req.getNotes() != null) {
            visit.setNotes(req.getNotes());
        }
        if (req.getStatus() != null) {
            visit.setStatus(req.getStatus());
        }
        visit.setUpdatedAt(LocalDateTime.now());

        Visit saved = visitRepository.save(visit);
        return toDto(saved);
    }

    private VisitResponse toDto(Visit v) {
        User patient = v.getPatient();
        UserDetails patientDetails = userDetailsRepository
                .findFirstByUser_Id(patient.getId())
                .orElse(null);

        User doctor = v.getDoctor();
        UserDetails doctorDetails = null;
        if (doctor != null) {
            doctorDetails = userDetailsRepository.findFirstByUser_Id(doctor.getId())
                    .orElse(null);
        }

        return VisitResponse.builder()
                .id(v.getId())
                .patientUserId(patient.getId())
                .patientName(patientDetails != null ? patientDetails.getFullName() : null)
                .patientMobile(patient.getMobile())
                .doctorUserId(doctor != null ? doctor.getId() : null)
                .doctorName(doctorDetails != null ? doctorDetails.getFullName() : null)
                .visitDate(v.getVisitDate().toString())
                .visitType(v.getVisitType())
                .chiefComplaint(v.getChiefComplaint())
                .notes(v.getNotes())
                .status(v.getStatus())
                .build();
    }
}
