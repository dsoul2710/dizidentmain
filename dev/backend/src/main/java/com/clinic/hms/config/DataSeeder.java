package com.clinic.hms.config;

import com.clinic.hms.entity.User;
import com.clinic.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        seedAdminUser();
    }

    private void seedAdminUser() {
        // Check if user with mobile 9999999999 exists
        User existing = userRepository.findAll().stream()
                .filter(user -> "9999999999".equals(user.getMobile()))
                .findFirst()
                .orElse(null);

        if (existing == null) {
            User admin = User.builder()
                    .mobile("9999999999")
                    .password("admin123")  // Plain text for now - should be hashed in production
                    .role("ORG")
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            userRepository.save(admin);
            log.info("✅ Default org user created:");
            log.info("   Mobile: 9999999999");
            log.info("   Password: admin123");
            log.info("   Role: ORG");
        } else {
            if (!"ORG".equalsIgnoreCase(existing.getRole())) {
                existing.setRole("ORG");
                existing.setUpdatedAt(LocalDateTime.now());
                userRepository.save(existing);
                log.info("✅ Updated existing user 9999999999 role to ORG");
            } else {
                log.info("✅ Org user already exists, skipping seed");
            }
        }
    }
}
