// src/main/java/com/clinic/hms/service/VisitDiagnosisService.java
package com.clinic.hms.service;

import com.clinic.hms.dto.ExamFindingDto;
import com.clinic.hms.dto.request.VisitDiagnosisRequest;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VisitDiagnosisService {

    private final PatientRepository patientRepository;
    private final VisitRepository visitRepository;
    private final VisitExaminationItemRepository visitExamRepo;
    private final ExamItemMasterRepository examMasterRepo;
    @Transactional
    public Visit saveDiagnosis(VisitDiagnosisRequest req) {
        // 1. Resolve/Create Visit
        Visit visit;
        LocalDateTime now = LocalDateTime.now();

        if (req.getVisitId() != null) {
            visit = visitRepository.findById(req.getVisitId())
                    .orElseThrow(() -> new IllegalArgumentException("Visit not found: " + req.getVisitId()));
        } else {
            Patient patient = patientRepository.findById(req.getPatientUserId())
                    .orElseThrow(() -> new IllegalArgumentException("Patient user not found: " + req.getPatientUserId()));

            visit = new Visit();
            visit.setPatient(patient);
            visit.setDoctor(null); // TODO
            visit.setVisitDate(now);
            visit.setVisitType("NEW");
            visit.setChiefComplaint(null);
            visit.setNotes(null);
            visit.setStatus("OPEN");
            visit.setCreatedAt(now);
        }

        // 2. Update diagnosis/odontogram fields ONLY if provided
        if (req.getOdontogramMode() != null) {
            visit.setOdontogramMode(req.getOdontogramMode());
        }

        if (req.getSelectedTeeth() != null) {
            if (req.getSelectedTeeth().isEmpty()) {
                visit.setOdontogramTeethJson(null);
            } else {
                String teethCsv = req.getSelectedTeeth().stream()
                        .filter(s -> s != null && !s.isBlank())
                        .collect(Collectors.joining(","));
                visit.setOdontogramTeethJson(teethCsv);
            }
        }

        if (req.getFreeDescription() != null) {
            visit.setDiagnosisFreeText(req.getFreeDescription());
        }

        if (req.getFinalDescription() != null) {
            visit.setDiagnosisFinalText(req.getFinalDescription());
        }

        if (req.getReportType() != null) {
            visit.setDiagnosisReportType(req.getReportType());
        }

        if (req.getReportNote() != null) {
            visit.setDiagnosisReportNote(req.getReportNote());
        }

        visit.setUpdatedAt(now);
        visit = visitRepository.save(visit);

        // 3. Replace exam items ONLY when examFindings is provided
        if (req.getExamFindings() != null) {
            visitExamRepo.deleteByVisitId(visit.getId());

            for (ExamFindingDto dto : req.getExamFindings()) {
                if (dto.getItemKey() == null) continue;

                ExamItemMaster master = examMasterRepo.findByItemKey(dto.getItemKey())
                        .orElse(null);

                VisitExaminationItem vItem = new VisitExaminationItem();
                vItem.setVisit(visit);
                vItem.setExamItem(master);
                vItem.setSection(dto.getSection() != null ? dto.getSection() : "GENERAL");
                vItem.setItemKey(dto.getItemKey());
                vItem.setLabel(dto.getTitle());
                vItem.setDescription(dto.getDescription());
                vItem.setIsAbnormal(dto.getAbnormal() != null ? dto.getAbnormal() : Boolean.TRUE);
                vItem.setVitalsJson(null);
                vItem.setGeneralNotes(null);
                vItem.setCreatedAt(now);
                vItem.setUpdatedAt(now);

                visitExamRepo.save(vItem);
            }
        }

        return visit;
    }

    @Transactional(readOnly = true)
    public VisitDiagnosisRequest getDiagnosisDetail(Long visitId) {
        return visitRepository.findById(visitId)
                .map(visit -> {
                    VisitDiagnosisRequest dto = new VisitDiagnosisRequest();
                    dto.setVisitId(visit.getId());
                    dto.setPatientUserId(visit.getPatient().getId());
                    dto.setOdontogramMode(visit.getOdontogramMode());
                    dto.setSelectedTeeth(parseCsv(visit.getOdontogramTeethJson()));
                    dto.setFreeDescription(visit.getDiagnosisFreeText());
                    dto.setFinalDescription(visit.getDiagnosisFinalText());
                    dto.setReportType(visit.getDiagnosisReportType());
                    dto.setReportNote(visit.getDiagnosisReportNote());
                    return dto;
                })
                .orElseGet(VisitDiagnosisRequest::new);
    }

    private List<String> parseCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return Collections.emptyList();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

}
