package com.clinic.hms.security.logto;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import org.springframework.security.oauth2.jwt.Jwt;

import static org.junit.jupiter.api.Assertions.*;

class LogtoAudienceValidatorTest {

    @Test
    void acceptsMatchingAudience() {
        LogtoAudienceValidator validator = new LogtoAudienceValidator(
                List.of("http://localhost:8081/api", "saj00uitdlkjzdu8ebwgq"));

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "ES384")
                .subject("user")
                .audience(List.of("http://localhost:8081/api"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        assertTrue(validator.validate(jwt).hasErrors() == false);
    }

    @Test
    void rejectsMismatchedAudience() {
        LogtoAudienceValidator validator = new LogtoAudienceValidator(
                List.of("http://localhost:8081/api"));

        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "ES384")
                .subject("user")
                .audience(List.of("wrong-audience"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        assertTrue(validator.validate(jwt).hasErrors());
    }
}
