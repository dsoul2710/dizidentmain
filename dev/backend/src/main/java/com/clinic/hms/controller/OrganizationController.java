package com.clinic.hms.controller;

import com.clinic.hms.dto.request.OrganizationCreateRequest;
import com.clinic.hms.dto.request.OrganizationUpdateRequest;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;

    private void checkSuperAdmin() {
        String role = securityUtils.getCurrentUserRole();
        if (!"SUPERADMIN".equalsIgnoreCase(role)) {
            throw new SecurityException("Only Super Admins can manage organizations");
        }
    }

    @GetMapping
    public ResponseEntity<List<OrganizationResponse>> list() {
        checkSuperAdmin();
        List<User> orgs = userRepository.findByRole("ORG");
        List<OrganizationResponse> responses = orgs.stream()
                .map(user -> {
                    String name = userDetailsRepository.findByUser(user)
                            .map(UserDetails::getFullName)
                            .orElse("Clinic Org");

                    return OrganizationResponse.builder()
                            .id(user.getId())
                            .name(name)
                            .mobile(user.getMobile())
                            .isActive(user.getIsActive())
                            .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                            .build();
                })
                .toList();

        return ResponseEntity.ok(responses);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<OrganizationResponse> create(@RequestBody OrganizationCreateRequest req) {
        checkSuperAdmin();

        userRepository.findByMobile(req.getMobile())
                .ifPresent(u -> {
                    throw new IllegalArgumentException("Mobile number already registered: " + req.getMobile());
                });

        LocalDateTime now = LocalDateTime.now();
        User orgUser = User.builder()
                .mobile(req.getMobile())
                .password(passwordEncoder.encode(
                        req.getPassword() != null && !req.getPassword().isBlank()
                                ? req.getPassword()
                                : "admin123"
                ))
                .role("ORG")
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        orgUser = userRepository.save(orgUser);

        UserDetails details = UserDetails.builder()
                .user(orgUser)
                .fullName(req.getName())
                .createdAt(now)
                .updatedAt(now)
                .build();

        userDetailsRepository.save(details);

        OrganizationResponse response = OrganizationResponse.builder()
                .id(orgUser.getId())
                .name(details.getFullName())
                .mobile(orgUser.getMobile())
                .isActive(orgUser.getIsActive())
                .createdAt(orgUser.getCreatedAt().toString())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<OrganizationResponse> update(@PathVariable Long id, @RequestBody OrganizationUpdateRequest req) {
        checkSuperAdmin();

        User orgUser = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + id));

        if (!"ORG".equalsIgnoreCase(orgUser.getRole())) {
            throw new IllegalArgumentException("Target user is not an organization");
        }

        if (req.getMobile() != null && !req.getMobile().trim().equals(orgUser.getMobile())) {
            userRepository.findByMobile(req.getMobile().trim())
                    .ifPresent(u -> {
                        throw new IllegalArgumentException("Mobile number already registered: " + req.getMobile());
                    });
            orgUser.setMobile(req.getMobile().trim());
        }

        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            orgUser.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        if (req.getIsActive() != null) {
            orgUser.setIsActive(req.getIsActive());
        }

        UserDetails details = userDetailsRepository.findByUser(orgUser)
                .orElseGet(() -> UserDetails.builder().user(orgUser).createdAt(LocalDateTime.now()).build());

        if (req.getName() != null) {
            details.setFullName(req.getName().trim());
        }

        LocalDateTime now = LocalDateTime.now();
        orgUser.setUpdatedAt(now);
        details.setUpdatedAt(now);

        userRepository.save(orgUser);
        userDetailsRepository.save(details);

        OrganizationResponse response = OrganizationResponse.builder()
                .id(orgUser.getId())
                .name(details.getFullName())
                .mobile(orgUser.getMobile())
                .isActive(orgUser.getIsActive())
                .createdAt(orgUser.getCreatedAt() != null ? orgUser.getCreatedAt().toString() : null)
                .build();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        checkSuperAdmin();

        User orgUser = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + id));

        if (!"ORG".equalsIgnoreCase(orgUser.getRole())) {
            throw new IllegalArgumentException("Target user is not an organization");
        }

        orgUser.setIsActive(false);
        orgUser.setUpdatedAt(LocalDateTime.now());
        userRepository.save(orgUser);

        return ResponseEntity.noContent().build();
    }
}
