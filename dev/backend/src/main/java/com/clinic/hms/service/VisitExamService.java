package com.clinic.hms.service;

import com.clinic.hms.dto.request.VisitExamItemRequest;
import com.clinic.hms.dto.response.VisitExamItemResponse;
import com.clinic.hms.entity.ExamItemMaster;
import com.clinic.hms.entity.Visit;
import com.clinic.hms.entity.VisitExaminationItem;
import com.clinic.hms.repository.ExamItemMasterRepository;
import com.clinic.hms.repository.VisitExaminationItemRepository;
import com.clinic.hms.repository.VisitRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VisitExamService {

    private final VisitRepository visitRepository;
    private final ExamItemMasterRepository examItemMasterRepository;
    private final VisitExaminationItemRepository visitExaminationItemRepository;
    private final ObjectMapper objectMapper;

    @Data
    public static class VitalsPayload {
        private String odontogramMode;
        private List<String> selectedTeeth;
    }

    @Transactional(readOnly = true)
    public List<VisitExamItemResponse> getVisitExamItems(Long visitId) {
        List<VisitExaminationItem> entities =
                visitExaminationItemRepository.findByVisitId(visitId);

        return entities.stream().map(this::toDto).toList();
    }

    @Transactional
    public VisitExamItemResponse saveOrUpdate(VisitExamItemRequest request) {
        Visit visit = visitRepository.findById(request.getVisitId())
                .orElseThrow(() -> new IllegalArgumentException("Visit not found: " + request.getVisitId()));

        ExamItemMaster examItem = examItemMasterRepository.findByItemKey(request.getItemKey())
                .orElseThrow(() -> new IllegalArgumentException("Exam item not found: " + request.getItemKey()));

        VisitExaminationItem entity = visitExaminationItemRepository
                .findByVisitIdAndExamItemItemKey(visit.getId(), examItem.getItemKey())
                .orElseGet(VisitExaminationItem::new);

        LocalDateTime now = LocalDateTime.now();

        if (entity.getId() == null) {
            entity.setVisit(visit);
            entity.setExamItem(examItem);
            entity.setSection("CLINICAL_EXAM");
            entity.setItemKey(examItem.getItemKey());
            entity.setLabel(examItem.getTitle());
            entity.setCreatedAt(now);
        }

        entity.setDescription(request.getText());
        entity.setGeneralNotes(request.getText());
        entity.setIsAbnormal(Boolean.TRUE); // or logic if needed
        entity.setUpdatedAt(now);

        // Save odontogram data in vitalsJson as JSON
        VitalsPayload payload = new VitalsPayload();
        payload.setOdontogramMode(request.getOdontogramMode());
        payload.setSelectedTeeth(request.getSelectedTeeth());

        try {
            entity.setVitalsJson(objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            // Fallback: don't break save just because of JSON
            entity.setVitalsJson(null);
        }

        VisitExaminationItem saved = visitExaminationItemRepository.save(entity);
        return toDto(saved);
    }

    private VisitExamItemResponse toDto(VisitExaminationItem entity) {
        VisitExamItemResponse dto = new VisitExamItemResponse();
        dto.setId(entity.getId());
        dto.setVisitId(entity.getVisit().getId());
        dto.setItemKey(entity.getItemKey());
        dto.setTitle(entity.getLabel());
        dto.setText(entity.getDescription());
        dto.setIsAbnormal(entity.getIsAbnormal());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        // parse odontogram info
        String vitalsJson = entity.getVitalsJson();
        if (vitalsJson != null && !vitalsJson.isBlank()) {
            try {
                VitalsPayload payload =
                        objectMapper.readValue(vitalsJson, VitalsPayload.class);
                dto.setOdontogramMode(payload.getOdontogramMode());
                dto.setSelectedTeeth(
                        payload.getSelectedTeeth() != null
                                ? payload.getSelectedTeeth()
                                : Collections.emptyList()
                );
            } catch (Exception e) {
                dto.setOdontogramMode(null);
                dto.setSelectedTeeth(Collections.emptyList());
            }
        } else {
            dto.setOdontogramMode(null);
            dto.setSelectedTeeth(Collections.emptyList());
        }

        return dto;
    }
}
