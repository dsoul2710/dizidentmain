package com.clinic.hms.config;

import com.clinic.hms.service.TreatmentMasterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
@Order(1)
@Slf4j
public class TreatmentMasterDataLoader implements CommandLineRunner {

    private final TreatmentMasterService treatmentMasterService;

    @Override
    public void run(String... args) {
        try {
            treatmentMasterService.seedMasterDataFromFile();
            log.info("Treatment master data seeded successfully.");
        } catch (Exception e) {
            log.error("Error seeding treatment master data", e);
        }
    }
}
