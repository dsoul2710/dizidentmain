package com.clinic.hms.config;

import com.clinic.hms.service.UserSeedService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final EntityManager entityManager;
    private final UserSeedService userSeedService;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("🚀 Starting Dizident Data Seeder...");

        clearLegacyData();
        userSeedService.seedFromFile();

        log.info("🎉 Dizident Data Seeder completed successfully!");
    }

    private void clearLegacyData() {
        log.info("🧹 Clearing tables...");

        entityManager.createNativeQuery("ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(100)").executeUpdate();

        entityManager.createNativeQuery("DROP TABLE IF EXISTS user_details CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS org_doctor_mappings CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS org_patient_mappings CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS org_provider_mappings CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS provider_service_price_lists CASCADE").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM patient_org_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM patient_doctor_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM doctor_org_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM service_provider_org_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM patient_lab_mappings").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM chat_messages").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM chat_attachments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM chat_threads").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM bill_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM bill_payments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM bills").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM prescription_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM prescriptions").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM appointments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM service_orders").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM inventory_movements").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM treatment_inventory_templates").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM inventory_treatment_template_rows").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM inventory_treatment_templates").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM inventory_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM vendors").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM labs").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM procedure_price_lists").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM visit_treatment_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM visit_examination_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM visit_treatments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM visits").executeUpdate();

        entityManager.createNativeQuery("DELETE FROM patients").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM doctors").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM org_hospitals").executeUpdate();

        entityManager.createNativeQuery(
                "DELETE FROM module_permissions WHERE user_id NOT IN (SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'SERVICE_PROVIDER'))"
        ).executeUpdate();
        entityManager.createNativeQuery(
                "DELETE FROM users WHERE role NOT IN ('SUPER_ADMIN', 'SERVICE_PROVIDER')"
        ).executeUpdate();

        log.info("✅ Tables cleared");
    }
}
