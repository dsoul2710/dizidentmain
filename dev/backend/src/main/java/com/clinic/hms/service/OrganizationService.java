package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.OrganizationCreateRequest;
import com.clinic.hms.dto.request.OrganizationUpdateRequest;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.repository.OrgHospitalRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.SecurityUtils;
import com.clinic.hms.service.logto.LogtoProvisioningService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final UserRepository userRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;
    private final LogtoProvisioningService logtoProvisioningService;

    @Transactional(readOnly = true)
    public List<OrganizationResponse> listOrganizations() {
        checkSuperAdmin();
        return orgHospitalRepository.findByIsDeletedFalse().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrganizationResponse createOrganization(OrganizationCreateRequest req) {
        checkSuperAdmin();

        userRepository.findByMobile(req.getMobile())
                .ifPresent(u -> {
                    throw new IllegalArgumentException("Mobile number already registered: " + req.getMobile());
                });

        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = resolveCurrentUserId();

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

        logtoProvisioningService.syncHmsOrganizationToLogto(orgHospital.getId());

        return toResponse(orgHospital);
    }

    @Transactional
    public OrganizationResponse updateOrganization(Long id, OrganizationUpdateRequest req) {
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

        Long currentUserId = resolveCurrentUserId();
        LocalDateTime now = LocalDateTime.now();
        orgUser.setUpdatedAt(now);
        orgHospital.setUpdatedAt(now);
        orgHospital.setUpdatedByUserId(currentUserId);

        userRepository.save(orgUser);
        orgHospitalRepository.save(orgHospital);

        return toResponse(orgHospital);
    }

    @Transactional
    public void deleteOrganization(Long id) {
        checkSuperAdmin();

        OrgHospital orgHospital = orgHospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + id));

        Long currentUserId = resolveCurrentUserId();

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
    }

    private void checkSuperAdmin() {
        String role = securityUtils.getCurrentUserRole();
        if (!AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role)) {
            throw new SecurityException("Only Super Admins can manage organizations");
        }
    }

    private Long resolveCurrentUserId() {
        try {
            return securityUtils.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }

    private OrganizationResponse toResponse(OrgHospital org) {
        User orgUser = org.getUser();
        return OrganizationResponse.builder()
                .id(org.getId())
                .name(org.getOrgName())
                .mobile(orgUser != null ? orgUser.getMobile() : null)
                .isActive(orgUser != null ? orgUser.getIsActive() : null)
                .createdAt(org.getCreatedAt() != null ? org.getCreatedAt().toString() : null)
                .build();
    }
}
