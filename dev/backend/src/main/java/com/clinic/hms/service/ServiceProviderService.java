package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.request.ServiceProviderCreateRequest;
import com.clinic.hms.dto.request.ServiceProviderUpdateRequest;
import com.clinic.hms.dto.response.OrganizationResponse;
import com.clinic.hms.dto.response.ServiceProviderLookupResponse;
import com.clinic.hms.dto.response.ServiceProviderMyClinicsResponse;
import com.clinic.hms.dto.response.ServiceProviderResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.exception.ApiException;
import com.clinic.hms.repository.ModulePermissionRepository;
import com.clinic.hms.repository.OrgHospitalRepository;
import com.clinic.hms.repository.ServiceProviderOrgMappingRepository;
import com.clinic.hms.repository.ServiceProviderRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceProviderService {

    private final ServiceProviderOrgMappingRepository serviceProviderOrgMappingRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final UserRepository userRepository;
    private final SecurityUtils securityUtils;
    private final PasswordEncoder passwordEncoder;
    private final ModulePermissionRepository modulePermissionRepository;

    @Transactional(readOnly = true)
    public ServiceProviderMyClinicsResponse getMyClinics(Long userId) {
        ServiceProvider sp = serviceProviderRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> ApiException.notFound("Service provider profile not found"));

        List<OrganizationResponse> clinics = serviceProviderOrgMappingRepository.findByServiceProvider(sp).stream()
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

        return ServiceProviderMyClinicsResponse.builder()
                .operationScope(sp.getOperationScope() != null ? sp.getOperationScope() : OperationScope.INDEPENDENT)
                .clinics(clinics)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ServiceProviderResponse> listServiceProviders() {
        return serviceProviderRepository.findByIsDeletedFalse().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ServiceProviderResponse> listForActiveOrg() {
        Long orgId = requireActiveOrgId();
        OrgHospital org = orgHospitalRepository.findById(orgId)
                .orElseThrow(() -> ApiException.badRequest("Invalid active organization"));

        return serviceProviderOrgMappingRepository.findByOrg(org).stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(ServiceProviderOrgMapping::getServiceProvider)
                .filter(sp -> !Boolean.TRUE.equals(sp.getIsDeleted()))
                .map(this::toResponse)
                .toList();
    }

    /**
     * HA → org-scoped ACTIVE list; SA → global list.
     */
    @Transactional(readOnly = true)
    public List<ServiceProviderResponse> listForCurrentCaller() {
        String role = securityUtils.getCurrentUserRole();
        if (isSuperAdmin(role)) {
            return listServiceProviders();
        }
        requireOrgAdmin();
        return listForActiveOrg();
    }

    @Transactional
    public ServiceProviderResponse createServiceProvider(ServiceProviderCreateRequest req) {
        userRepository.findByMobile(req.getMobile())
                .ifPresent(u -> {
                    throw ApiException.badRequest("Mobile number already registered: " + req.getMobile());
                });

        LocalDateTime now = LocalDateTime.now();
        Long currentUserId = safeCurrentUserId();
        String role = securityUtils.getCurrentUserRole();
        Long activeOrgId = safeActiveOrgId();

        boolean hospitalAdmin = isOrgHospital(role);
        boolean superAdmin = isSuperAdmin(role);

        OperationScope scope;
        Long mappingOrgId;

        if (hospitalAdmin) {
            if (activeOrgId == null) {
                throw ApiException.badRequest("Active organization is required");
            }
            scope = OperationScope.INTERNAL;
            mappingOrgId = activeOrgId;
        } else if (superAdmin) {
            if (req.getOperationScope() == null) {
                throw ApiException.badRequest("operationScope is required for Super Admin create");
            }
            scope = req.getOperationScope();
            if (scope == OperationScope.INTERNAL) {
                if (req.getHospitalOrgId() == null) {
                    throw ApiException.badRequest("hospitalOrgId is required when operationScope is INTERNAL");
                }
                if (!orgHospitalRepository.existsById(req.getHospitalOrgId())) {
                    throw ApiException.badRequest("Invalid hospitalOrgId");
                }
                mappingOrgId = req.getHospitalOrgId();
            } else {
                mappingOrgId = null;
            }
        } else {
            scope = OperationScope.INDEPENDENT;
            mappingOrgId = activeOrgId;
        }

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

        ServiceProviderType primaryType = req.getProviderTypes() != null && !req.getProviderTypes().isEmpty()
                ? req.getProviderTypes().iterator().next()
                : ServiceProviderType.OTHER;

        String uniqueId = generateUniqueProviderId();

        ServiceProvider sp = ServiceProvider.builder()
                .user(user)
                .providerName(req.getProviderName())
                .providerType(primaryType)
                .providerTypes(req.getProviderTypes() != null ? req.getProviderTypes() : new java.util.HashSet<>())
                .address(req.getAddress())
                .mobile(req.getMobile())
                .uniqueId(uniqueId)
                .operationScope(scope)
                .createdAt(now)
                .updatedAt(now)
                .createdByUserId(currentUserId)
                .updatedByUserId(currentUserId)
                .isDeleted(false)
                .build();

        sp = serviceProviderRepository.save(sp);
        syncModulePermissions(user, sp.getProviderTypes());

        if (mappingOrgId != null) {
            OrgHospital org = orgHospitalRepository.findById(mappingOrgId).orElse(null);
            if (org != null) {
                ServiceProviderOrgMapping mapping = ServiceProviderOrgMapping.builder()
                        .org(org)
                        .serviceProvider(sp)
                        .status(AppConstants.Status.ACTIVE)
                        .createdAt(now)
                        .updatedAt(now)
                        .createdByUserId(currentUserId)
                        .build();
                serviceProviderOrgMappingRepository.save(mapping);
            }
        }

        log.info("sp_create actorId={} orgId={} uniqueId={} scope={} outcome=CREATED",
                currentUserId, mappingOrgId, uniqueId, scope);

        return toResponse(sp);
    }

    @Transactional
    public ServiceProviderResponse changeOperationScope(Long providerUserId,
                                                        com.clinic.hms.dto.request.OperationScopeChangeRequest req) {
        requireSuperAdmin();
        if (req == null || req.getOperationScope() == null) {
            throw ApiException.badRequest("operationScope is required");
        }

        ServiceProvider sp = serviceProviderRepository.findByIdAndIsDeletedFalse(providerUserId)
                .orElseThrow(() -> ApiException.notFound("Provider not found"));

        OperationScope target = req.getOperationScope();
        Long currentUserId = safeCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        if (target == OperationScope.INDEPENDENT) {
            sp.setOperationScope(OperationScope.INDEPENDENT);
            sp.setUpdatedAt(now);
            sp.setUpdatedByUserId(currentUserId);
            serviceProviderRepository.save(sp);
            log.info("sp_scope_change actorId={} uniqueId={} action=TO_INDEPENDENT outcome=OK",
                    currentUserId, sp.getUniqueId());
            return toResponse(sp);
        }

        Long hospitalOrgId = req.getHospitalOrgId();
        List<ServiceProviderOrgMapping> mappings = serviceProviderOrgMappingRepository.findByServiceProvider(sp);
        List<ServiceProviderOrgMapping> active = mappings.stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .toList();

        if (hospitalOrgId == null) {
            if (active.size() == 1) {
                hospitalOrgId = active.get(0).getOrg().getId();
            } else {
                throw ApiException.badRequest("hospitalOrgId is required when changing to INTERNAL");
            }
        }

        OrgHospital retainOrg = orgHospitalRepository.findById(hospitalOrgId)
                .orElseThrow(() -> ApiException.badRequest("Invalid hospitalOrgId"));

        boolean foundRetain = false;
        for (ServiceProviderOrgMapping m : mappings) {
            if (m.getOrg().getId().equals(hospitalOrgId)) {
                m.setStatus(AppConstants.Status.ACTIVE);
                m.setUpdatedAt(now);
                serviceProviderOrgMappingRepository.save(m);
                foundRetain = true;
            } else if (AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())) {
                m.setStatus(AppConstants.Status.INACTIVE);
                m.setUpdatedAt(now);
                serviceProviderOrgMappingRepository.save(m);
            }
        }
        if (!foundRetain) {
            ServiceProviderOrgMapping mapping = ServiceProviderOrgMapping.builder()
                    .org(retainOrg)
                    .serviceProvider(sp)
                    .status(AppConstants.Status.ACTIVE)
                    .createdAt(now)
                    .updatedAt(now)
                    .createdByUserId(currentUserId)
                    .build();
            serviceProviderOrgMappingRepository.save(mapping);
        }

        sp.setOperationScope(OperationScope.INTERNAL);
        sp.setUpdatedAt(now);
        sp.setUpdatedByUserId(currentUserId);
        serviceProviderRepository.save(sp);

        log.info("sp_scope_change actorId={} orgId={} uniqueId={} action=TO_INTERNAL outcome=OK",
                currentUserId, hospitalOrgId, sp.getUniqueId());
        return toResponse(sp);
    }

    @Transactional(readOnly = true)
    public ServiceProviderLookupResponse lookupForOnboard(String uniqueId) {
        requireOrgAdmin();
        Long orgId = requireActiveOrgId();

        Optional<ServiceProvider> found = serviceProviderRepository.findByUniqueIdAndIsDeletedFalse(uniqueId);
        if (found.isEmpty()) {
            log.info("sp_lookup actorId={} orgId={} uniqueId={} outcome=NOT_FOUND",
                    safeCurrentUserId(), orgId, uniqueId);
            throw ApiException.notFound("Provider not found");
        }

        ServiceProvider sp = found.get();
        if (sp.getOperationScope() == OperationScope.INTERNAL) {
            boolean boundToCaller = serviceProviderOrgMappingRepository
                    .existsByOrg_IdAndServiceProvider_IdAndStatus(orgId, sp.getId(), AppConstants.Status.ACTIVE);
            if (!boundToCaller) {
                log.info("sp_lookup actorId={} orgId={} uniqueId={} outcome=NOT_FOUND",
                        safeCurrentUserId(), orgId, uniqueId);
                throw ApiException.notFound("Provider not found");
            }
        }

        OrgHospital org = orgHospitalRepository.findById(orgId).orElseThrow();
        Optional<ServiceProviderOrgMapping> mapping =
                serviceProviderOrgMappingRepository.findByOrgAndServiceProvider(org, sp);
        boolean alreadyLinked = mapping
                .map(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .orElse(false);
        boolean linkable = sp.getOperationScope() == OperationScope.INDEPENDENT && !alreadyLinked;

        log.info("sp_lookup actorId={} orgId={} uniqueId={} outcome=OK alreadyLinked={}",
                safeCurrentUserId(), orgId, uniqueId, alreadyLinked);

        return ServiceProviderLookupResponse.builder()
                .uniqueId(sp.getUniqueId())
                .providerName(sp.getProviderName())
                .providerTypes(sp.getProviderTypes() != null
                        ? sp.getProviderTypes().stream().map(Enum::name).collect(Collectors.toSet())
                        : java.util.Collections.emptySet())
                .operationScope(sp.getOperationScope())
                .alreadyLinked(alreadyLinked)
                .linkable(linkable)
                .build();
    }

    @Transactional
    public void onboardServiceProvider(String uniqueId) {
        requireOrgAdmin();
        Long orgId = requireActiveOrgId();

        ServiceProvider sp = serviceProviderRepository.findByUniqueIdAndIsDeletedFalse(uniqueId)
                .orElseThrow(() -> ApiException.notFound("Provider not found"));

        if (sp.getOperationScope() == OperationScope.INTERNAL) {
            boolean boundToCaller = serviceProviderOrgMappingRepository
                    .existsByOrg_IdAndServiceProvider_IdAndStatus(orgId, sp.getId(), AppConstants.Status.ACTIVE);
            if (!boundToCaller) {
                log.info("sp_onboard actorId={} orgId={} uniqueId={} outcome=NOT_FOUND",
                        safeCurrentUserId(), orgId, uniqueId);
                throw ApiException.notFound("Provider not found");
            }
            throw ApiException.conflict("Provider is already onboarded at this clinic");
        }

        OrgHospital org = orgHospitalRepository.findById(orgId)
                .orElseThrow(() -> ApiException.badRequest("Invalid active organization"));
        Long currentUserId = safeCurrentUserId();

        Optional<ServiceProviderOrgMapping> existing =
                serviceProviderOrgMappingRepository.findByOrgAndServiceProvider(org, sp);
        if (existing.isPresent()) {
            ServiceProviderOrgMapping mapping = existing.get();
            if (AppConstants.Status.ACTIVE.equalsIgnoreCase(mapping.getStatus())) {
                log.info("sp_onboard actorId={} orgId={} uniqueId={} outcome=CONFLICT",
                        currentUserId, orgId, uniqueId);
                throw ApiException.conflict("Provider is already onboarded at this clinic");
            }
            mapping.setStatus(AppConstants.Status.ACTIVE);
            mapping.setUpdatedAt(LocalDateTime.now());
            serviceProviderOrgMappingRepository.save(mapping);
            log.info("sp_onboard actorId={} orgId={} uniqueId={} outcome=REACTIVATED",
                    currentUserId, orgId, uniqueId);
        } else {
            ServiceProviderOrgMapping mapping = ServiceProviderOrgMapping.builder()
                    .org(org)
                    .serviceProvider(sp)
                    .status(AppConstants.Status.ACTIVE)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(currentUserId)
                    .build();
            serviceProviderOrgMappingRepository.save(mapping);
            log.info("sp_onboard actorId={} orgId={} uniqueId={} outcome=CREATED",
                    currentUserId, orgId, uniqueId);
        }
    }

    @Transactional
    public void unlinkServiceProvider(Long providerUserId) {
        requireOrgAdmin();
        Long orgId = requireActiveOrgId();

        ServiceProvider sp = serviceProviderRepository.findByIdAndIsDeletedFalse(providerUserId)
                .orElseThrow(() -> ApiException.notFound("Provider not found"));

        OrgHospital org = orgHospitalRepository.findById(orgId)
                .orElseThrow(() -> ApiException.badRequest("Invalid active organization"));

        ServiceProviderOrgMapping mapping = serviceProviderOrgMappingRepository
                .findByOrgAndServiceProvider(org, sp)
                .orElseThrow(() -> ApiException.notFound("Provider is not linked to this clinic"));

        mapping.setStatus(AppConstants.Status.INACTIVE);
        mapping.setUpdatedAt(LocalDateTime.now());
        serviceProviderOrgMappingRepository.save(mapping);

        log.info("sp_unlink actorId={} orgId={} uniqueId={} outcome=INACTIVE",
                safeCurrentUserId(), orgId, sp.getUniqueId());
    }

    @Transactional
    public ServiceProviderResponse updateServiceProvider(Long id, ServiceProviderUpdateRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Service provider user not found: " + id));

        if (user.getRole() != UserRole.SERVICE_PROVIDER) {
            throw ApiException.badRequest("Target user is not a service provider");
        }

        if (req.getMobile() != null && !req.getMobile().trim().equals(user.getMobile())) {
            userRepository.findByMobile(req.getMobile().trim())
                    .ifPresent(u -> {
                        throw ApiException.badRequest("Mobile number already registered: " + req.getMobile());
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
                .orElseThrow(() -> ApiException.notFound("Service provider profile not found or deleted"));

        if (req.getProviderName() != null) {
            sp.setProviderName(req.getProviderName().trim());
        }

        if (req.getProviderTypes() != null) {
            sp.setProviderTypes(req.getProviderTypes());
            ServiceProviderType primaryType = req.getProviderTypes().isEmpty()
                    ? ServiceProviderType.OTHER
                    : req.getProviderTypes().iterator().next();
            sp.setProviderType(primaryType);
            syncModulePermissions(user, sp.getProviderTypes());
        }

        if (req.getAddress() != null) {
            sp.setAddress(req.getAddress().trim());
        }

        Long currentUserId = safeCurrentUserId();
        LocalDateTime now = LocalDateTime.now();
        user.setUpdatedAt(now);
        sp.setUpdatedAt(now);
        sp.setUpdatedByUserId(currentUserId);

        userRepository.save(user);
        serviceProviderRepository.save(sp);

        return toResponse(sp);
    }

    @Transactional
    public void deleteServiceProvider(Long id) {
        ServiceProvider sp = serviceProviderRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Service provider profile not found: " + id));

        Long currentUserId = safeCurrentUserId();

        sp.setIsDeleted(true);
        sp.setDeletedAt(LocalDateTime.now());
        sp.setDeletedByUserId(currentUserId);

        User user = sp.getUser();
        if (user != null) {
            user.setIsActive(false);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
        }

        List<ServiceProviderOrgMapping> mappings = serviceProviderOrgMappingRepository.findByServiceProvider(sp);
        for (ServiceProviderOrgMapping m : mappings) {
            m.setStatus(AppConstants.Status.INACTIVE);
            m.setUpdatedAt(LocalDateTime.now());
            serviceProviderOrgMappingRepository.save(m);
        }

        serviceProviderRepository.save(sp);
    }

    private ServiceProviderResponse toResponse(ServiceProvider sp) {
        return ServiceProviderResponse.builder()
                .id(sp.getId())
                .providerName(sp.getProviderName())
                .mobile(sp.getUser() != null ? sp.getUser().getMobile() : sp.getMobile())
                .providerType(sp.getProviderType() != null ? sp.getProviderType().name() : null)
                .providerTypes(sp.getProviderTypes() != null
                        ? sp.getProviderTypes().stream().map(Enum::name).collect(Collectors.toSet())
                        : java.util.Collections.emptySet())
                .address(sp.getAddress())
                .uniqueId(sp.getUniqueId())
                .isActive(sp.getUser() != null ? sp.getUser().getIsActive() : null)
                .createdAt(sp.getCreatedAt() != null ? sp.getCreatedAt().toString() : null)
                .operationScope(sp.getOperationScope())
                .build();
    }

    private void requireOrgAdmin() {
        String role = securityUtils.getCurrentUserRole();
        if (role == null || !(isOrgHospital(role) || isSuperAdmin(role))) {
            throw ApiException.forbidden("Not allowed");
        }
    }

    private void requireSuperAdmin() {
        if (!isSuperAdmin(securityUtils.getCurrentUserRole())) {
            throw ApiException.forbidden("Not allowed");
        }
    }

    private boolean isSuperAdmin(String role) {
        return AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role)
                || "SUPERADMIN".equalsIgnoreCase(role);
    }

    private boolean isOrgHospital(String role) {
        return AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)
                || "ORG".equalsIgnoreCase(role);
    }

    private Long requireActiveOrgId() {
        Long orgId = safeActiveOrgId();
        if (orgId == null) {
            throw ApiException.badRequest("Active organization is required");
        }
        return orgId;
    }

    private Long safeActiveOrgId() {
        try {
            return securityUtils.getActiveOrgId();
        } catch (Exception e) {
            return null;
        }
    }

    private Long safeCurrentUserId() {
        try {
            return securityUtils.getCurrentUserId();
        } catch (Exception e) {
            return null;
        }
    }

    private String generateUniqueProviderId() {
        String uniqueId;
        do {
            uniqueId = "SP-" + String.format("%06d", (int) (Math.random() * 1000000));
        } while (serviceProviderRepository.findByUniqueIdAndIsDeletedFalse(uniqueId).isPresent());
        return uniqueId;
    }

    private void syncModulePermissions(User user, java.util.Set<ServiceProviderType> types) {
        // Preserve inventory grant across type sync (US-S8)
        var inventoryGrant = modulePermissionRepository.findByUserIdAndModuleName(user.getId(), "INVENTORY");

        modulePermissionRepository.deleteByUserId(user.getId());
        modulePermissionRepository.flush();

        java.util.List<String> spModules = new java.util.ArrayList<>();
        spModules.add("OVERVIEW");
        spModules.add("CHAT");
        // Catalog row for grantable inventory (default off unless previously granted)
        if (types != null) {
            for (ServiceProviderType type : types) {
                switch (type) {
                    case LAB -> spModules.add("LAB_ORDERS_MODULE");
                    case BED_MANAGER -> spModules.add("BED_ALLOCATION_MODULE");
                    case PHARMACY -> spModules.add("PHARMACY_ORDERS_MODULE");
                    case RADIOLOGY -> spModules.add("RADIOLOGY_MODULE");
                    case PATHOLOGY -> spModules.add("PATHOLOGY_MODULE");
                    case BLOOD_BANK -> spModules.add("BLOOD_BANK_MODULE");
                    case AMBULANCE -> spModules.add("AMBULANCE_MODULE");
                    case ORTHODONTIC_LAB -> spModules.add("ORTHODONTIC_LAB_MODULE");
                    default -> {
                    }
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();
        for (String module : spModules) {
            ModulePermission mp = ModulePermission.builder()
                    .user(user)
                    .moduleName(module)
                    .canView(true)
                    .canEdit(true)
                    .canDelete(false)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            modulePermissionRepository.save(mp);
        }

        // Always expose INVENTORY row for SA grant UI; restore prior grant if any
        boolean inventoryView = inventoryGrant.map(ModulePermission::getCanView).orElse(false);
        boolean inventoryEdit = inventoryGrant.map(ModulePermission::getCanEdit).orElse(false);
        ModulePermission inventory = ModulePermission.builder()
                .user(user)
                .moduleName("INVENTORY")
                .canView(Boolean.TRUE.equals(inventoryView))
                .canEdit(Boolean.TRUE.equals(inventoryEdit))
                .canDelete(false)
                .createdAt(now)
                .updatedAt(now)
                .build();
        modulePermissionRepository.save(inventory);
    }
}
