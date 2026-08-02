package com.clinic.hms.security.logto;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

/**
 * Validates JWT {@code aud} against configured Logto API resource and/or app id.
 */
public class LogtoAudienceValidator implements OAuth2TokenValidator<Jwt> {

    private final List<String> acceptedAudiences;

    public LogtoAudienceValidator(List<String> acceptedAudiences) {
        this.acceptedAudiences = acceptedAudiences;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        List<String> tokenAudiences = jwt.getAudience();
        if (tokenAudiences == null || tokenAudiences.isEmpty()) {
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Missing audience claim", null));
        }
        boolean match = tokenAudiences.stream().anyMatch(acceptedAudiences::contains);
        if (!match) {
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Audience mismatch", null));
        }
        return OAuth2TokenValidatorResult.success();
    }
}
