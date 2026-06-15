package com.clinic.hms.security;

import com.clinic.hms.entity.User;
import com.clinic.hms.repository.OrgDoctorMappingRepository;
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
    private final OrgDoctorMappingRepository orgDoctorMappingRepository;

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

        if ("ORG".equalsIgnoreCase(role)) {
            return getCurrentUserId();
        } else if ("DOCTOR".equalsIgnoreCase(role)) {
            HttpServletRequest request = getCurrentRequest();
            if (request == null) return null;

            String activeOrgHeader = request.getHeader("X-Active-Org-Id");
            if (activeOrgHeader == null || activeOrgHeader.isBlank()) {
                throw new IllegalArgumentException("X-Active-Org-Id header is missing for DOCTOR role");
            }

            try {
                Long orgId = Long.parseLong(activeOrgHeader);
                User doctor = getCurrentUser();
                User org = userRepository.findById(orgId).orElseThrow(() -> 
                    new IllegalArgumentException("Invalid clinic organization: " + orgId));
                
                if (!orgDoctorMappingRepository.existsByOrgAndDoctor(org, doctor)) {
                    throw new SecurityException("Doctor is not associated with clinic: " + orgId);
                }

                return orgId;
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid X-Active-Org-Id header value");
            }
        } else if ("PATIENT".equalsIgnoreCase(role)) {
            HttpServletRequest request = getCurrentRequest();
            if (request != null) {
                String activeOrgHeader = request.getHeader("X-Active-Org-Id");
                if (activeOrgHeader != null && !activeOrgHeader.isBlank()) {
                    return Long.parseLong(activeOrgHeader);
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
