package com.clinic.hms.service;

import com.clinic.hms.entity.ExamItemMaster;
import com.clinic.hms.repository.ExamItemMasterRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamItemMasterService {

    private final ExamItemMasterRepository examItemMasterRepository;
    private final ObjectMapper objectMapper;

    @Value("classpath:data/exam_items_master.json")
    private Resource examItemsResource;

    @Transactional
    public void seedExamItemsFromFile() {
        List<ExamItemSeed> seeds = readSeed();
        if (seeds == null || seeds.isEmpty()) {
            log.warn("No exam item seed found; skipping seeding.");
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        for (ExamItemSeed seed : seeds) {
            if (seed.getItemKey() == null || seed.getItemKey().isBlank()) {
                continue;
            }
            ExamItemMaster item = examItemMasterRepository.findByItemKey(seed.getItemKey())
                    .orElseGet(() -> ExamItemMaster.builder()
                            .itemKey(seed.getItemKey())
                            .createdAt(now)
                            .isActive(true)
                            .build());

            item.setTitle(seed.getTitle());
            item.setDefaultText(seed.getDefaultText());
            item.setDisplayOrder(Optional.ofNullable(seed.getDisplayOrder()).orElse(0));
            item.setIsActive(Optional.ofNullable(seed.getIsActive()).orElse(true));
            item.setUpdatedAt(now);
            examItemMasterRepository.save(item);
        }
    }

    private List<ExamItemSeed> readSeed() {
        if (examItemsResource == null || !examItemsResource.exists()) {
            return Collections.emptyList();
        }
        try (InputStream is = examItemsResource.getInputStream()) {
            return objectMapper.readValue(is, new TypeReference<List<ExamItemSeed>>() {});
        } catch (IOException e) {
            log.error("Failed to read exam item seed", e);
            return Collections.emptyList();
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class ExamItemSeed {
        private String itemKey;
        private String title;
        private String defaultText;
        private Integer displayOrder;
        private Boolean isActive;
    }
}
