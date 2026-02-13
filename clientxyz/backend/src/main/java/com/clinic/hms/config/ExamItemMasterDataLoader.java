package com.clinic.hms.config;

import com.clinic.hms.service.ExamItemMasterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Order(2)
@Slf4j
public class ExamItemMasterDataLoader implements CommandLineRunner {

    private final ExamItemMasterService examItemMasterService;

    @Override
    public void run(String... args) {
        try {
            examItemMasterService.seedExamItemsFromFile();
            log.info("Exam item master data seeded successfully.");
        } catch (Exception e) {
            log.error("Error seeding exam item master data", e);
        }
    }
}
