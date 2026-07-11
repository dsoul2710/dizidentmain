package com.clinic.hms.security.logto;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * Parsed Logto JWT claims for auth bootstrap and future authorization bridge (U3).
 */
@Getter
public class LogtoTokenClaims {

    private final String subject;
    private final List<String> scopes;
    private final List<String> roles;
    private final List<String> organizationIds;
    private final List<String> organizationRoles;

    public LogtoTokenClaims(Jwt jwt) {
        this.subject = jwt.getSubject();
        this.scopes = parseScopes(jwt);
        this.roles = readStringListClaim(jwt, "roles");
        this.organizationIds = readStringListClaim(jwt, "organizations");
        this.organizationRoles = readStringListClaim(jwt, "organization_roles");
    }

    public Collection<GrantedAuthority> toAuthorities() {
        List<GrantedAuthority> authorities = new ArrayList<>();
        for (String scope : scopes) {
            authorities.add(new SimpleGrantedAuthority("SCOPE_" + scope));
        }
        for (String role : roles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
        }
        for (String orgRole : organizationRoles) {
            authorities.add(new SimpleGrantedAuthority("ORG_ROLE_" + orgRole));
        }
        return authorities;
    }

    private static List<String> parseScopes(Jwt jwt) {
        Object scopeClaim = jwt.getClaim("scope");
        if (scopeClaim instanceof String scopeString && !scopeString.isBlank()) {
            return List.of(scopeString.split("\\s+"));
        }
        Object scpClaim = jwt.getClaim("scp");
        if (scpClaim instanceof String scpString && !scpString.isBlank()) {
            return List.of(scpString.split("\\s+"));
        }
        if (scpClaim instanceof Collection<?> collection) {
            return collection.stream().map(String::valueOf).toList();
        }
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    private static List<String> readStringListClaim(Jwt jwt, String claimName) {
        Object claim = jwt.getClaim(claimName);
        if (claim instanceof List<?> list) {
            return list.stream().map(String::valueOf).toList();
        }
        if (claim instanceof String single && !single.isBlank()) {
            return List.of(single);
        }
        return Collections.emptyList();
    }
}
