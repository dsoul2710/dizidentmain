package com.clinic.hms.controller;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.OrganizationCreateRequest;
import com.clinic.hms.dto.request.OrganizationUpdateRequest;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.repository.OrgHospitalRepository;
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
    private final OrgHospitalRepository orgHospitalRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;

    private void checkSuperAdmin() {
        String role = securityUtils.getCurrentUserRole();
        if (!AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role)) {
            throw new SecurityException("Only Super Admins can manage organizations");
        }
    }

    @GetMapping
    public ResponseEntity<List<OrganizationResponse>> list() {
        checkSuperAdmin();
        List<OrgHospital> orgs = orgHospitalRepository.findByIsDeletedFalse();
        List<OrganizationResponse> responses = orgs.stream()
                .map(org -> OrganizationResponse.builder()
                        .id(org.getId())
                        .name(org.getOrgName())
                        .mobile(org.getUser().getMobile())
                        .isActive(org.getUser().getIsActive())
                        .createdAt(org.getCreatedAt() != null ? org.getCreatedAt().toString() : null)
                        .build())
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
        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        User orgUser = User.builder()
                .mobile(req.getMobile())
                .password(passwordEncoder.encode(
                        req.getPassword() != null && !req.getPassword().isBlank()
                                ? req.getPassword()
                                : "admin123"
                ))
                .role(UserRole.ORG_HOSPITAL)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        orgUser = userRepository.save(orgUser);

        OrgHospital orgHospital = OrgHospital.builder()
                .id(orgUser.getId())
                .user(orgUser)
                .orgName(req.getName())
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(currentUserId)
                .updatedByUserId(currentUserId)
                .isDeleted(false)
                .build();

        orgHospitalRepository.save(orgHospital);

        OrganizationResponse response = OrganizationResponse.builder()
                .id(orgUser.getId())
                .name(orgHospital.getOrgName())
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
                .orElseThrow(() -> new IllegalArgumentException("Organization user not found: " + id));

        if (orgUser.getRole() != UserRole.ORG_HOSPITAL) {
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

        OrgHospital orgHospital = orgHospitalRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("Organization profile not found or deleted"));

        if (req.getName() != null) {
            orgHospital.setOrgName(req.getName().trim());
        }

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        LocalDateTime now = LocalDateTime.now();
        orgUser.setUpdatedAt(now);
        orgHospital.setUpdatedAt(now);
        orgHospital.setUpdatedByUserId(currentUserId);

        userRepository.save(orgUser);
        orgHospitalRepository.save(orgHospital);

        OrganizationResponse response = OrganizationResponse.builder()
                .id(orgUser.getId())
                .name(orgHospital.getOrgName())
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

        OrgHospital orgHospital = orgHospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + id));

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        // HIPAA: Soft delete profile and de-activate login
        orgHospital.setIsDeleted(true);
        orgHospital.setDeletedAt(LocalDateTime.now());
        orgHospital.setDeletedByUserId(currentUserId);
        
        User orgUser = orgHospital.getUser();
        if (orgUser != null) {
            orgUser.setIsActive(false);
            orgUser.setUpdatedAt(LocalDateTime.now());
            userRepository.save(orgUser);
        }

        orgHospitalRepository.save(orgHospital);

        return ResponseEntity.noContent().build();
    }
}
