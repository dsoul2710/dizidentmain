package com.clinic.hms.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LegacyCompatiblePasswordEncoderTest {

    private final LegacyCompatiblePasswordEncoder encoder = new LegacyCompatiblePasswordEncoder();

    @Test
    void matchesLegacyPlainTextPassword() {
        assertTrue(encoder.matches("secret123", "secret123"));
    }

    @Test
    void encodesWithBcryptPrefix() {
        String encoded = encoder.encode("secret123");
        assertTrue(encoded.startsWith("{bcrypt}"));
        assertTrue(encoder.matches("secret123", encoded));
    }

    @Test
    void isLegacyEncoding_detectsPlainText() {
        assertTrue(encoder.isLegacyEncoding("plainpassword"));
        assertFalse(encoder.isLegacyEncoding("{bcrypt}$2a$10$abcdefghijklmnopqrstuv"));
    }

    @Test
    void bcryptPasswordNotTreatedAsLegacy() {
        String encoded = encoder.encode("secret123");
        assertFalse(encoder.isLegacyEncoding(encoded));
    }
}
