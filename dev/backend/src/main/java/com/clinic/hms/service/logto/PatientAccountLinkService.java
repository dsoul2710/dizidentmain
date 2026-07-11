package com.clinic.hms.service.logto;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.Patient;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.repository.PatientRepository;
import com.clinic.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PatientAccountLinkService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public User linkOrCreatePatientUser(String logtoUserId, String phone, String displayName) {
        if (logtoUserId == null || logtoUserId.isBlank()) {
            throw new IllegalArgumentException("logtoUserId is required");
        }

        Optional<User> alreadyLinked = userRepository.findByLogtoUserId(logtoUserId);
        if (alreadyLinked.isPresent()) {
            return alreadyLinked.get();
        }

        String normalizedPhone = normalizePhone(phone);
        if (normalizedPhone != null) {
            Optional<User> byMobile = userRepository.findByMobile(normalizedPhone);
            if (byMobile.isPresent()) {
                User existing = byMobile.get();
                if (existing.getLogtoUserId() != null
                        && !existing.getLogtoUserId().equals(logtoUserId)) {
                    throw new IllegalStateException("Mobile already linked to another Logto user");
                }
                existing.setLogtoUserId(logtoUserId);
                existing.setUpdatedAt(LocalDateTime.now());
                return userRepository.save(existing);
            }

            Optional<Patient> orphanPatient = findPatientByMobile(normalizedPhone);
            if (orphanPatient.isPresent()) {
                User user = orphanPatient.get().getUser();
                user.setLogtoUserId(logtoUserId);
                user.setUpdatedAt(LocalDateTime.now());
                return userRepository.save(user);
            }
        }

        return createPatientStub(logtoUserId, normalizedPhone, displayName);
    }

    private User createPatientStub(String logtoUserId, String phone, String displayName) {
        LocalDateTime now = LocalDateTime.now();
        String mobile = phone != null ? phone : "logto-" + logtoUserId.substring(0, Math.min(8, logtoUserId.length()));

        userRepository.findByMobile(mobile).ifPresent(u -> {
            throw new IllegalStateException("Generated mobile collision: " + mobile);
        });

        User user = User.builder()
                .mobile(mobile)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(UserRole.PATIENT)
                .logtoUserId(logtoUserId)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
        user = userRepository.save(user);

        Patient patient = Patient.builder()
                .id(user.getId())
                .user(user)
                .fullName(displayName != null && !displayName.isBlank() ? displayName : "Patient")
                .uniqueId(generatePatientUniqueId())
                .createdAt(now)
                .updatedAt(now)
                .isDeleted(false)
                .build();
        patientRepository.save(patient);
        return user;
    }

    private Optional<Patient> findPatientByMobile(String mobile) {
        return userRepository.findByMobile(mobile)
                .filter(u -> u.getRole() == UserRole.PATIENT)
                .flatMap(u -> patientRepository.findById(u.getId()));
    }

    private String normalizePhone(String phone) {
        if (phone == null) {
            return null;
        }
        String trimmed = phone.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String generatePatientUniqueId() {
        int suffix = (int) (Math.random() * AppConstants.PatientId.RANGE);
        return AppConstants.PatientId.PREFIX + String.format(AppConstants.PatientId.FORMAT, suffix);
    }
}
