package com.clinic.hms.security.logto;

import com.clinic.hms.security.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

/**
 * Reads Logto JWT from the current Spring Security context.
 */
public final class LogtoSecurityContext {

    private LogtoSecurityContext() {
    }

    public static Optional<Jwt> currentJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return Optional.empty();
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof Jwt jwt) {
            return Optional.of(jwt);
        }
        Object credentials = authentication.getCredentials();
        if (credentials instanceof Jwt jwt) {
            return Optional.of(jwt);
        }
        return Optional.empty();
    }

    public static Optional<LogtoTokenClaims> currentClaims() {
        return currentJwt().map(LogtoTokenClaims::new);
    }

    public static boolean isLogtoAuthentication() {
        return currentJwt().isPresent();
    }

    public static Optional<CustomUserDetails> linkedHmsUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails details) {
            return Optional.of(details);
        }
        return Optional.empty();
    }
}
