package com.clinic.hms.security;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.User;
import com.clinic.hms.repository.DoctorOrgMappingRepository;
import com.clinic.hms.repository.ServiceProviderOrgMappingRepository;
import com.clinic.hms.repository.PatientOrgMappingRepository;
import com.clinic.hms.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final UserRepository userRepository;
    private final DoctorOrgMappingRepository doctorOrgMappingRepository;
    private final ServiceProviderOrgMappingRepository serviceProviderOrgMappingRepository;
    private final PatientOrgMappingRepository patientOrgMappingRepository;

    public CustomUserDetails getCurrentUserDetails() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails) {
            return (CustomUserDetails) auth.getPrincipal();
        }
        return null;
    }

    public Long getCurrentUserId() {
        CustomUserDetails details = getCurrentUserDetails();
        return details != null ? details.getId() : null;
    }

    public String getCurrentUserRole() {
        CustomUserDetails details = getCurrentUserDetails();
        return details != null ? details.getRole() : null;
    }

    public User getCurrentUser() {
        Long id = getCurrentUserId();
        return id != null ? userRepository.findById(id).orElse(null) : null;
    }

    public Long getActiveOrgId() {
        String role = getCurrentUserRole();
        if (role == null) return null;

        if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role)) {
            return getCurrentUserId();
        } else if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)) {
            HttpServletRequest request = getCurrentRequest();
            if (request == null) return null;

            String activeOrgHeader = request.getHeader(AppConstants.Headers.ACTIVE_ORG_ID);
            if (activeOrgHeader == null || activeOrgHeader.isBlank()) {
                throw new IllegalArgumentException("X-Active-Org-Id header is missing for DOCTOR role");
            }

            try {
                Long orgId = Long.parseLong(activeOrgHeader);
                Long doctorId = getCurrentUserId();

                if (!doctorOrgMappingRepository.existsByOrg_IdAndDoctor_IdAndStatus(orgId, doctorId, AppConstants.Status.ACTIVE)) {
                    throw new SecurityException("Doctor is not associated with clinic: " + orgId);
                }

                return orgId;
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid X-Active-Org-Id header value");
            }
        } else if (AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
            HttpServletRequest request = getCurrentRequest();
            if (request == null) return null;

            String activeOrgHeader = request.getHeader(AppConstants.Headers.ACTIVE_ORG_ID);
            if (activeOrgHeader == null || activeOrgHeader.isBlank()) {
                throw new IllegalArgumentException("X-Active-Org-Id header is missing for SERVICE_PROVIDER role");
            }

            try {
                Long orgId = Long.parseLong(activeOrgHeader);
                Long spId = getCurrentUserId();

                if (!serviceProviderOrgMappingRepository.existsByOrg_IdAndServiceProvider_IdAndStatus(orgId, spId, AppConstants.Status.ACTIVE)) {
                    throw new SecurityException("Service Provider is not associated with clinic: " + orgId);
                }

                return orgId;
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid X-Active-Org-Id header value");
            }
        } else if (AppConstants.Roles.PATIENT.equalsIgnoreCase(role)) {
            HttpServletRequest request = getCurrentRequest();
            if (request != null) {
                String activeOrgHeader = request.getHeader(AppConstants.Headers.ACTIVE_ORG_ID);
                if (activeOrgHeader != null && !activeOrgHeader.isBlank()) {
                    try {
                        Long orgId = Long.parseLong(activeOrgHeader);
                        Long patientId = getCurrentUserId();
                        if (!patientOrgMappingRepository.existsByOrg_IdAndPatient_IdAndStatus(orgId, patientId, AppConstants.Status.ACTIVE)) {
                            throw new SecurityException("Patient is not associated with clinic: " + orgId);
                        }
                        return orgId;
                    } catch (NumberFormatException e) {
                        throw new IllegalArgumentException("Invalid X-Active-Org-Id header value");
                    }
                }
            }
            return null;
        }
        return null;
    }

    private HttpServletRequest getCurrentRequest() {
        var attrs = RequestContextHolder.getRequestAttributes();
        if (attrs instanceof ServletRequestAttributes) {
            return ((ServletRequestAttributes) attrs).getRequest();
        }
        return null;
    }
}
