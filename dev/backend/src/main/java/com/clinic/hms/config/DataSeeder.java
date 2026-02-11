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
        // Check if any admin user exists
        boolean adminExists = userRepository.findAll().stream()
                .anyMatch(user -> "ADMIN".equalsIgnoreCase(user.getRole()));

        if (!adminExists) {
            User admin = User.builder()
                    .mobile("9999999999")
                    .password("admin123")  // Plain text for now - should be hashed in production
                    .role("ADMIN")
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            userRepository.save(admin);
            log.info("✅ Default admin user created:");
            log.info("   Mobile: 9999999999");
            log.info("   Password: admin123");
            log.info("   Role: ADMIN");
        } else {
            log.info("✅ Admin user already exists, skipping seed");
        }
    }
}
