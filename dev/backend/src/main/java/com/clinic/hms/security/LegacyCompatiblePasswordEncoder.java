package com.clinic.hms.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

/**
 * Supports BCrypt ({bcrypt}...) and legacy plain-text passwords (no prefix) for migrate-on-login.
 */
public class LegacyCompatiblePasswordEncoder implements PasswordEncoder {

    private static final String BCRYPT_ID = "bcrypt";
    private final DelegatingPasswordEncoder delegating;

    public LegacyCompatiblePasswordEncoder() {
        delegating = new DelegatingPasswordEncoder(
                BCRYPT_ID,
                Map.of(
                        BCRYPT_ID, new BCryptPasswordEncoder(),
                        "noop", org.springframework.security.crypto.password.NoOpPasswordEncoder.getInstance()
                )
        );
    }

    @Override
    public String encode(CharSequence rawPassword) {
        return delegating.encode(rawPassword);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null) {
            return false;
        }
        if (!encodedPassword.startsWith("{")) {
            return encodedPassword.contentEquals(rawPassword);
        }
        return delegating.matches(rawPassword, encodedPassword);
    }

    public boolean isLegacyEncoding(String encodedPassword) {
        return encodedPassword != null && !encodedPassword.startsWith("{bcrypt}");
    }
}
