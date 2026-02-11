package com.clinic.hms.service;

import com.clinic.hms.dto.response.TreatmentCategoryResponse;
import com.clinic.hms.dto.response.TreatmentProcedureResponse;
import com.clinic.hms.entity.TreatmentCategoryMaster;
import com.clinic.hms.entity.TreatmentProcedureMaster;
import com.clinic.hms.repository.TreatmentCategoryMasterRepository;
import com.clinic.hms.repository.TreatmentProcedureMasterRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TreatmentMasterService {

    private final TreatmentCategoryMasterRepository categoryRepository;
    private final TreatmentProcedureMasterRepository procedureRepository;
    private final ObjectMapper objectMapper;

    @Value("classpath:data/treatment_master.json")
    private Resource treatmentMasterResource;

    @Transactional(readOnly = true)
    public List<TreatmentCategoryResponse> getAllActiveCategoriesWithProcedures() {
        List<TreatmentCategoryMaster> categories =
                categoryRepository.findByIsActiveTrueOrderByDisplayOrderAscTitleAsc();

        return categories.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void seedMasterDataFromFile() {
        MasterSeed seed = readMasterSeed();
        if (seed == null || seed.getCategories() == null) {
            log.warn("No treatment master seed found; skipping seeding.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        seed.getCategories().forEach(catSeed -> {
            TreatmentCategoryMaster category = categoryRepository
                    .findByCategoryKey(catSeed.getKey())
                    .orElseGet(() -> TreatmentCategoryMaster.builder()
                            .categoryKey(catSeed.getKey())
                            .createdAt(now)
                            .isActive(true)
                            .build());

            category.setTitle(catSeed.getTitle());
            category.setDisplayOrder(Optional.ofNullable(catSeed.getDisplayOrder()).orElse(0));
            category.setIsActive(true);
            category.setUpdatedAt(now);
            TreatmentCategoryMaster savedCategory = categoryRepository.save(category);

            List<ProcedureSeed> procedures = Optional.ofNullable(catSeed.getProcedures())
                    .orElse(Collections.emptyList());

            for (ProcedureSeed pSeed : procedures) {
                TreatmentProcedureMaster procedure = procedureRepository
                        .findByCategoryAndNameIgnoreCase(savedCategory, pSeed.getName())
                        .orElseGet(() -> TreatmentProcedureMaster.builder()
                                .category(savedCategory)
                                .name(pSeed.getName())
                                .createdAt(now)
                                .isActive(true)
                                .build());

                procedure.setGuidelineText(pSeed.getGuidelineText());
                procedure.setConsentText(pSeed.getConsentText());
                procedure.setDisplayOrder(Optional.ofNullable(pSeed.getDisplayOrder()).orElse(0));
                procedure.setIsActive(true);
                procedure.setName(pSeed.getName());
                procedure.setUpdatedAt(now);
                procedureRepository.save(procedure);
            }
        });
    }

    private MasterSeed readMasterSeed() {
        if (treatmentMasterResource == null || !treatmentMasterResource.exists()) {
            return null;
        }
        try (InputStream is = treatmentMasterResource.getInputStream()) {
            return objectMapper.readValue(is, MasterSeed.class);
        } catch (IOException e) {
            log.error("Failed to read treatment master seed", e);
            return null;
        }
    }

    private TreatmentCategoryResponse toResponse(TreatmentCategoryMaster category) {
        List<TreatmentProcedureMaster> procedures =
                procedureRepository.findByCategoryIdAndIsActiveTrueOrderByDisplayOrderAscNameAsc(category.getId());

        List<TreatmentProcedureResponse> procDtos = procedures.stream()
                .map(p -> TreatmentProcedureResponse.builder()
                        .id(p.getId())
                        .name(p.getName())
                        .consentText(p.getConsentText())
                        .guidelineText(p.getGuidelineText())
                        .displayOrder(p.getDisplayOrder())
                        .build())
                .collect(Collectors.toList());

        return TreatmentCategoryResponse.builder()
                .id(category.getId())
                .key(category.getCategoryKey())
                .title(category.getTitle())
                .displayOrder(category.getDisplayOrder())
                .procedures(procDtos)
                .build();
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class MasterSeed {
        private List<CategorySeed> categories;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class CategorySeed {
        private String key;
        private String title;
        private Integer displayOrder;
        private List<ProcedureSeed> procedures;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ProcedureSeed {
        private String name;
        private String consentText;
        private String guidelineText;
        private Integer displayOrder;
    }
}
