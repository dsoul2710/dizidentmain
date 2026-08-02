package com.clinic.hms.security.logto;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class LogtoTokenClaimsTest {

    @Test
    void parsesScopesRolesAndOrganizationClaims() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "ES384")
                .subject("logto-user-123")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .claim("scope", "openid profile patients:read")
                .claim("roles", List.of("doctor"))
                .claim("organizations", List.of("org_a"))
                .claim("organization_roles", List.of("org_a:org-admin"))
                .build();

        LogtoTokenClaims claims = new LogtoTokenClaims(jwt);

        assertEquals("logto-user-123", claims.getSubject());
        assertTrue(claims.getScopes().contains("patients:read"));
        assertEquals(List.of("doctor"), claims.getRoles());
        assertEquals(List.of("org_a"), claims.getOrganizationIds());
        assertEquals(List.of("org_a:org-admin"), claims.getOrganizationRoles());
        assertTrue(claims.toAuthorities().stream()
                .anyMatch(a -> "SCOPE_patients:read".equals(a.getAuthority())));
    }

    @Test
    void handlesMissingOptionalClaims() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "ES384")
                .subject("sub-only")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        LogtoTokenClaims claims = new LogtoTokenClaims(jwt);

        assertEquals("sub-only", claims.getSubject());
        assertTrue(claims.getScopes().isEmpty());
        assertTrue(claims.getOrganizationRoles().isEmpty());
    }
}
