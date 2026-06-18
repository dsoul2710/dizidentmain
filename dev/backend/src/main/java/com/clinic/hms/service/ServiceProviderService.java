package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.ServiceProviderCreateRequest;
import com.clinic.hms.dto.request.ServiceProviderUpdateRequest;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.dto.response.ServiceProviderResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.ServiceProviderOrgMappingRepository;
import com.clinic.hms.repository.ServiceProviderRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceProviderService {

    private final ServiceProviderOrgMappingRepository serviceProviderOrgMappingRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<OrganizationResponse> getMyClinics(Long userId) {
        ServiceProvider sp = serviceProviderRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new IllegalArgumentException("Service provider profile not found"));

        List<ServiceProviderOrgMapping> mappings = serviceProviderOrgMappingRepository.findByServiceProvider(sp);
        return mappings.stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(mapping -> {
                    OrgHospital org = mapping.getOrg();
                    User orgUser = org.getUser();

                    return OrganizationResponse.builder()
                            .id(org.getId())
                            .name(org.getOrgName())
                            .mobile(orgUser.getMobile())
                            .isActive(orgUser.getIsActive())
                            .createdAt(org.getCreatedAt() != null ? org.getCreatedAt().toString() : null)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceProviderResponse> listServiceProviders() {
        List<ServiceProvider> providers = serviceProviderRepository.findByIsDeletedFalse();
        return providers.stream()
                .map(sp -> ServiceProviderResponse.builder()
                        .id(sp.getId())
                        .providerName(sp.getProviderName())
                        .mobile(sp.getUser().getMobile())
                        .providerType(sp.getProviderType() != null ? sp.getProviderType().name() : null)
                        .address(sp.getAddress())
                        .uniqueId(sp.getUniqueId())
                        .isActive(sp.getUser().getIsActive())
                        .createdAt(sp.getCreatedAt() != null ? sp.getCreatedAt().toString() : null)
                        .build())
                .toList();
    }

    @Transactional
    public ServiceProviderResponse createServiceProvider(ServiceProviderCreateRequest req) {
        userRepository.findByMobile(req.getMobile())
                .ifPresent(u -> {
                    throw new IllegalArgumentException("Mobile number already registered: " + req.getMobile());
                });

        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        User user = User.builder()
                .mobile(req.getMobile())
                .password(passwordEncoder.encode(
                        req.getPassword() != null && !req.getPassword().isBlank()
                                ? req.getPassword()
                                : "provider123"
                ))
                .role(UserRole.SERVICE_PROVIDER)
                .isActive(true)
                .createdAt(now)
                .updatedAt(now)
                .build();

        user = userRepository.save(user);

        ServiceProvider sp = ServiceProvider.builder()
                .user(user)
                .providerName(req.getProviderName())
                .providerType(req.getProviderType())
                .address(req.getAddress())
                .mobile(req.getMobile())
                .uniqueId(generateUniqueProviderId())
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(currentUserId)
                .updatedByUserId(currentUserId)
                .isDeleted(false)
                .build();

        sp = serviceProviderRepository.save(sp);

        return ServiceProviderResponse.builder()
                .id(sp.getId())
                .providerName(sp.getProviderName())
                .mobile(user.getMobile())
                .providerType(sp.getProviderType().name())
                .address(sp.getAddress())
                .uniqueId(sp.getUniqueId())
                .isActive(user.getIsActive())
                .createdAt(sp.getCreatedAt().toString())
                .build();
    }

    @Transactional
    public ServiceProviderResponse updateServiceProvider(Long id, ServiceProviderUpdateRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service provider user not found: " + id));

        if (user.getRole() != UserRole.SERVICE_PROVIDER) {
            throw new IllegalArgumentException("Target user is not a service provider");
        }

        if (req.getMobile() != null && !req.getMobile().trim().equals(user.getMobile())) {
            userRepository.findByMobile(req.getMobile().trim())
                    .ifPresent(u -> {
                        throw new IllegalArgumentException("Mobile number already registered: " + req.getMobile());
                    });
            user.setMobile(req.getMobile().trim());
        }

        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));
        }

        if (req.getIsActive() != null) {
            user.setIsActive(req.getIsActive());
        }

        ServiceProvider sp = serviceProviderRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new IllegalArgumentException("Service provider profile not found or deleted"));

        if (req.getProviderName() != null) {
            sp.setProviderName(req.getProviderName().trim());
        }

        if (req.getProviderType() != null) {
            sp.setProviderType(req.getProviderType());
        }

        if (req.getAddress() != null) {
            sp.setAddress(req.getAddress().trim());
        }

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        LocalDateTime now = LocalDateTime.now();
        user.setUpdatedAt(now);
        sp.setUpdatedAt(now);
        sp.setUpdatedByUserId(currentUserId);

        userRepository.save(user);
        serviceProviderRepository.save(sp);

        return ServiceProviderResponse.builder()
                .id(sp.getId())
                .providerName(sp.getProviderName())
                .mobile(user.getMobile())
                .providerType(sp.getProviderType().name())
                .address(sp.getAddress())
                .uniqueId(sp.getUniqueId())
                .isActive(user.getIsActive())
                .createdAt(sp.getCreatedAt() != null ? sp.getCreatedAt().toString() : null)
                .build();
    }

    @Transactional
    public void deleteServiceProvider(Long id) {
        ServiceProvider sp = serviceProviderRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service provider profile not found: " + id));

        Long currentUserId = null;
        try {
            currentUserId = securityUtils.getCurrentUserId();
        } catch (Exception e) {}

        sp.setIsDeleted(true);
        sp.setDeletedAt(LocalDateTime.now());
        sp.setDeletedByUserId(currentUserId);

        User user = sp.getUser();
        if (user != null) {
            user.setIsActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }

        serviceProviderRepository.save(sp);
    }

    private String generateUniqueProviderId() {
        String uniqueId;
        do {
            uniqueId = "SP-" + String.format("%06d", (int) (Math.random() * 1000000));
        } while (serviceProviderRepository.findByUniqueIdAndIsDeletedFalse(uniqueId).isPresent());
        return uniqueId;
    }
}
