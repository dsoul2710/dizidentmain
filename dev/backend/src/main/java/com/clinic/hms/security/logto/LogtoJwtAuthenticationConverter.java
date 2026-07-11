package com.clinic.hms.security.logto;

import com.clinic.hms.entity.User;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Converts a validated Logto JWT into a Spring Security authentication.
 * When an HMS user is linked via {@code logto_user_id}, uses {@link CustomUserDetails}
 * so existing {@code SecurityUtils} and {@code @PreAuthorize} keep working.
 */
@Component
@RequiredArgsConstructor
public class LogtoJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        LogtoTokenClaims claims = new LogtoTokenClaims(jwt);
        Collection<GrantedAuthority> authorities = new ArrayList<>(claims.toAuthorities());

        User linkedUser = userRepository.findByLogtoUserId(jwt.getSubject()).orElse(null);
        if (linkedUser != null) {
            CustomUserDetails userDetails = new CustomUserDetails(linkedUser);
            authorities.addAll(userDetails.getAuthorities());
            return new UsernamePasswordAuthenticationToken(userDetails, jwt, authorities);
        }

        return new UsernamePasswordAuthenticationToken(jwt, jwt, authorities);
    }
}
