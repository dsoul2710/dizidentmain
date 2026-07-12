package com.clinic.hms.service;

import com.clinic.hms.dto.request.VisitCreateRequest;
import com.clinic.hms.dto.request.VisitUpdateRequest;
import com.clinic.hms.dto.response.VisitResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
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
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final EventPushService eventPushService;
    private final com.clinic.hms.service.attribution.SourceOrgResolver sourceOrgResolver;

    @Transactional
    public VisitResponse createVisit(VisitCreateRequest req) {
        LocalDateTime now = LocalDateTime.now();

        Patient patient = patientRepository.findByIdAndIsDeletedFalse(req.getPatientUserId())
                .orElseThrow(() -> new IllegalArgumentException("Invalid patient user id"));

        Doctor doctor = null;
        if (req.getDoctorUserId() != null) {
            doctor = doctorRepository.findByIdAndIsDeletedFalse(req.getDoctorUserId())
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
                .sourceOrg(sourceOrgResolver.resolveSourceOrgForCreate())
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
        Patient patient = patientRepository.findByIdAndIsDeletedFalse(patientUserId)
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
                .sourceOrg(sourceOrgResolver.resolveSourceOrgForCreate())
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
            Doctor doctor = doctorRepository.findByIdAndIsDeletedFalse(req.getDoctorUserId())
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
        Patient patient = v.getPatient();
        Doctor doctor = v.getDoctor();
        var attribution = com.clinic.hms.service.attribution.SourceAttributionMapper.fromOrg(v.getSourceOrg());

        return VisitResponse.builder()
                .id(v.getId())
                .patientUserId(patient != null ? patient.getId() : null)
                .patientName(patient != null ? patient.getFullName() : null)
                .patientMobile(patient != null && patient.getUser() != null ? patient.getUser().getMobile() : null)
                .doctorUserId(doctor != null ? doctor.getId() : null)
                .doctorName(doctor != null ? doctor.getFullName() : null)
                .visitDate(v.getVisitDate().toString())
                .visitType(v.getVisitType())
                .chiefComplaint(v.getChiefComplaint())
                .notes(v.getNotes())
                .status(v.getStatus())
                .sourceOrgId(attribution.getSourceOrgId())
                .sourceOrgName(attribution.getSourceOrgName())
                .sourceType(attribution.getSourceType())
                .build();
    }
}
