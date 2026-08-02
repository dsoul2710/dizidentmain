package com.clinic.hms.security;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.ModulePermission;
import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.repository.DoctorOrgMappingRepository;
import com.clinic.hms.repository.ModulePermissionRepository;
import com.clinic.hms.repository.OrgHospitalRepository;
import com.clinic.hms.repository.PatientOrgMappingRepository;
import com.clinic.hms.repository.ServiceProviderOrgMappingRepository;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.logto.LogtoSecurityContext;
import com.clinic.hms.security.logto.LogtoTokenClaims;
import com.clinic.hms.security.logto.ModuleScopeMapping;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Bridges Logto JWT scopes/org claims with HMS domain authorization.
 * Used in {@code @PreAuthorize} SpEL and services for org-scoped access.
 */
@Component("authorizationService")
@RequiredArgsConstructor
public class AuthorizationService {

    private final OrgHospitalRepository orgHospitalRepository;
    private final DoctorOrgMappingRepository doctorOrgMappingRepository;
    private final ServiceProviderOrgMappingRepository serviceProviderOrgMappingRepository;
    private final PatientOrgMappingRepository patientOrgMappingRepository;
    private final ModulePermissionRepository modulePermissionRepository;
    private final UserRepository userRepository;

    public boolean isLogtoAuthentication() {
        return LogtoSecurityContext.isLogtoAuthentication();
    }

    public boolean hasScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return false;
        }
        Optional<LogtoTokenClaims> claims = LogtoSecurityContext.currentClaims();
        if (claims.isPresent() && claims.get().getScopes().contains(scope)) {
            return true;
        }
        return hasLegacyModulePermissionForScope(scope);
    }

    public boolean hasAnyScope(String... scopes) {
        return Arrays.stream(scopes).anyMatch(this::hasScope);
    }

    public boolean hasOrgRole(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return false;
        }
        Optional<LogtoTokenClaims> claims = LogtoSecurityContext.currentClaims();
        if (claims.isEmpty()) {
            return false;
        }
        String suffix = ":" + roleName;
        return claims.get().getOrganizationRoles().stream().anyMatch(r -> r.endsWith(suffix));
    }

    public void requireScope(String scope) {
        if (!hasScope(scope)) {
            throw new AccessDeniedException("Missing required scope: " + scope);
        }
    }

    public boolean canAccessModule(String moduleName, String action) {
        return ModuleScopeMapping.scopeFor(moduleName, action)
                .map(this::hasScope)
                .orElse(hasLegacyModulePermission(moduleName, action));
    }

    /**
     * Resolves HMS org id for the current request, validating Logto org membership when applicable.
     */
    public Long resolveActiveHmsOrgId() {
        String hmsRole = getLinkedHmsRole();
        Long userId = getLinkedHmsUserId();

        if (hmsRole != null && userId != null) {
            if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(hmsRole)
                    || "ORG".equalsIgnoreCase(hmsRole)) {
                return userId;
            }
            if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(hmsRole)) {
                return resolveMappedOrgId(userId, AppConstants.Roles.DOCTOR);
            }
            if (AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(hmsRole)) {
                return resolveMappedOrgId(userId, AppConstants.Roles.SERVICE_PROVIDER);
            }
            if (AppConstants.Roles.PATIENT.equalsIgnoreCase(hmsRole)) {
                return resolveOptionalPatientOrg(userId);
            }
        }

        return resolveOrgFromLogtoClaimsOnly();
    }

    public boolean isMemberOfLogtoOrg(String logtoOrgId) {
        if (logtoOrgId == null || logtoOrgId.isBlank()) {
            return false;
        }
        Optional<LogtoTokenClaims> claims = LogtoSecurityContext.currentClaims();
        if (claims.isEmpty()) {
            return false;
        }
        if (claims.get().getOrganizationIds().contains(logtoOrgId)) {
            return true;
        }
        return claims.get().getOrganizationRoles().stream()
                .anyMatch(r -> r.startsWith(logtoOrgId + ":"));
    }

    public Optional<Long> mapLogtoOrgToHmsOrgId(String logtoOrgId) {
        return orgHospitalRepository.findByLogtoOrgIdAndIsDeletedFalse(logtoOrgId)
                .map(OrgHospital::getId);
    }

    private Long resolveMappedOrgId(Long userId, String roleType) {
        Long orgId = readOrgIdFromHeader();
        if (orgId == null) {
            throw new IllegalArgumentException("X-Active-Org-Id header is missing for " + roleType + " role");
        }
        validateHmsOrgMembership(userId, roleType, orgId);
        return orgId;
    }

    private Long resolveOptionalPatientOrg(Long patientId) {
        Long orgId = readOrgIdFromHeader();
        if (orgId == null) {
            return null;
        }
        if (!patientOrgMappingRepository.existsByOrg_IdAndPatient_IdAndStatus(
                orgId, patientId, AppConstants.Status.ACTIVE)) {
            throw new SecurityException("Patient is not associated with clinic: " + orgId);
        }
        return orgId;
    }

    private Long resolveOrgFromLogtoClaimsOnly() {
        String header = readActiveOrgHeader();
        Optional<LogtoTokenClaims> claims = LogtoSecurityContext.currentClaims();
        if (claims.isEmpty()) {
            return null;
        }

        if (header != null && !header.isBlank()) {
            if (header.chars().allMatch(Character::isDigit)) {
                Long hmsOrgId = Long.parseLong(header);
                validateLogtoOrgAccessForHmsOrg(hmsOrgId);
                return hmsOrgId;
            }
            if (!isMemberOfLogtoOrg(header)) {
                throw new SecurityException("Not a member of organization: " + header);
            }
            return mapLogtoOrgToHmsOrgId(header)
                    .orElseThrow(() -> new SecurityException("Organization not linked in HMS: " + header));
        }

        List<String> orgIds = claims.get().getOrganizationIds();
        if (orgIds.size() == 1) {
            String logtoOrgId = orgIds.get(0);
            return mapLogtoOrgToHmsOrgId(logtoOrgId).orElse(null);
        }
        return null;
    }

    private void validateLogtoOrgAccessForHmsOrg(Long hmsOrgId) {
        Optional<LogtoTokenClaims> claims = LogtoSecurityContext.currentClaims();
        if (claims.isEmpty()) {
            return;
        }
        OrgHospital org = orgHospitalRepository.findByIdAndIsDeletedFalse(hmsOrgId)
                .orElseThrow(() -> new SecurityException("Organization not found: " + hmsOrgId));
        if (org.getLogtoOrgId() != null && !isMemberOfLogtoOrg(org.getLogtoOrgId())) {
            throw new SecurityException("Logto token is not authorized for organization: " + hmsOrgId);
        }
    }

    private void validateHmsOrgMembership(Long userId, String roleType, Long orgId) {
        if (LogtoSecurityContext.isLogtoAuthentication()) {
            validateLogtoOrgAccessForHmsOrg(orgId);
        }
        if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(roleType)) {
            if (!doctorOrgMappingRepository.existsByOrg_IdAndDoctor_IdAndStatus(
                    orgId, userId, AppConstants.Status.ACTIVE)) {
                throw new SecurityException("Doctor is not associated with clinic: " + orgId);
            }
        } else if (AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(roleType)) {
            if (!serviceProviderOrgMappingRepository.existsByOrg_IdAndServiceProvider_IdAndStatus(
                    orgId, userId, AppConstants.Status.ACTIVE)) {
                throw new SecurityException("Service Provider is not associated with clinic: " + orgId);
            }
        }
    }

    private Long readOrgIdFromHeader() {
        String header = readActiveOrgHeader();
        if (header == null || header.isBlank()) {
            return null;
        }
        if (!header.chars().allMatch(Character::isDigit)) {
            return mapLogtoOrgToHmsOrgId(header)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "X-Active-Org-Id must be HMS numeric id or linked Logto org id"));
        }
        try {
            return Long.parseLong(header);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid X-Active-Org-Id header value");
        }
    }

    private String readActiveOrgHeader() {
        HttpServletRequest request = currentRequest();
        if (request == null) {
            return null;
        }
        return request.getHeader(AppConstants.Headers.ACTIVE_ORG_ID);
    }

    private HttpServletRequest currentRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes servletAttrs) {
            return servletAttrs.getRequest();
        }
        return null;
    }

    private String getLinkedHmsRole() {
        return LogtoSecurityContext.linkedHmsUser().map(CustomUserDetails::getRole).orElse(null);
    }

    private Long getLinkedHmsUserId() {
        return LogtoSecurityContext.linkedHmsUser().map(CustomUserDetails::getId).orElse(null);
    }

    private boolean hasLegacyModulePermissionForScope(String scope) {
        if (ModuleScopeMapping.isPlatformScope(scope)) {
            return hasLegacySuperAdminRole();
        }
        Optional<Long> userId = LogtoSecurityContext.linkedHmsUser().map(CustomUserDetails::getId);
        if (userId.isEmpty()) {
            return false;
        }
        User user = userRepository.findById(userId.get()).orElse(null);
        if (user == null) {
            return false;
        }
        if (hasLegacySuperAdminRole() || isOrgAdminLegacy(user)) {
            return true;
        }
        String module = moduleNameForScope(scope);
        if (module == null) {
            return false;
        }
        String action = actionForScope(scope);
        return hasLegacyModulePermission(module, action);
    }

    private boolean hasLegacyModulePermission(String moduleName, String action) {
        Long userId = getLinkedHmsUserId();
        if (userId == null) {
            return false;
        }
        return modulePermissionRepository.findByUserId(userId).stream()
                .filter(mp -> moduleName.equals(mp.getModuleName()))
                .findFirst()
                .map(mp -> switch (action) {
                    case "read" -> Boolean.TRUE.equals(mp.getCanView());
                    case "edit" -> Boolean.TRUE.equals(mp.getCanEdit());
                    case "delete" -> Boolean.TRUE.equals(mp.getCanDelete());
                    default -> false;
                })
                .orElse(false);
    }

    private boolean hasLegacySuperAdminRole() {
        String role = getLinkedHmsRole();
        return role != null && (UserRole.SUPER_ADMIN.name().equalsIgnoreCase(role)
                || UserRole.SUPERADMIN.name().equalsIgnoreCase(role));
    }

    private boolean isOrgAdminLegacy(User user) {
        UserRole role = user.getRole();
        return role == UserRole.ORG_HOSPITAL || role == UserRole.ORG;
    }

    private String moduleNameForScope(String scope) {
        for (var entry : List.of("PATIENTS", "DOCTORS", "APPOINTMENTS", "PHARMACY_ORDERS_MODULE",
                "BED_ALLOCATION_MODULE", "INVENTORY", "LAB_ORDERS_MODULE", "BILLING_FINANCE",
                "USER_MANAGEMENT", "PRESCRIPTION")) {
            if (ModuleScopeMapping.scopeFor(entry, "read").map(scope::equals).orElse(false)
                    || ModuleScopeMapping.scopeFor(entry, "edit").map(scope::equals).orElse(false)
                    || ModuleScopeMapping.scopeFor(entry, "delete").map(scope::equals).orElse(false)) {
                return entry;
            }
        }
        if ("members:manage".equals(scope) || "members:read".equals(scope)) {
            return "USER_MANAGEMENT";
        }
        return null;
    }

    private String actionForScope(String scope) {
        if (scope.endsWith(":delete")) {
            return "delete";
        }
        if (scope.endsWith(":edit") || scope.endsWith(":manage") || scope.endsWith(":assign")) {
            return "edit";
        }
        return "read";
    }
}
