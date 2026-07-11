package com.clinic.hms.security;

import com.clinic.hms.entity.User;
import com.clinic.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SecurityUtils {

    private final UserRepository userRepository;
    private final AuthorizationService authorizationService;

    public CustomUserDetails getCurrentUserDetails() {
        return com.clinic.hms.security.logto.LogtoSecurityContext.linkedHmsUser().orElse(null);
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

    /**
     * Resolves HMS org id with Logto org membership validation when Bearer token is present.
     */
    public Long getActiveOrgId() {
        return authorizationService.resolveActiveHmsOrgId();
    }

    public boolean hasScope(String scope) {
        return authorizationService.hasScope(scope);
    }
}
