package com.clinic.hms.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    // 🔐 change this to some long random secret
    private static final String SECRET = "veryLongRandomSecretForHmsClinicJwt_ChangeMe_1234567890";
    private static final long EXPIRATION_MS = 1000L * 60 * 60; // 1 hour

    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes());

    public String generateToken(Long userId, String role, String mobile) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + EXPIRATION_MS);

        return Jwts.builder()
                .setSubject(mobile)              // username = mobile
                .claim("userId", userId)
                .claim("role", role)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public String getUsername(String token) {
        return parseClaims(token).getBody().getSubject(); // mobile
    }

    public Long getUserId(String token) {
        return parseClaims(token).getBody().get("userId", Long.class);
    }

    public String getRole(String token) {
        return parseClaims(token).getBody().get("role", String.class);
    }

    private Jws<Claims> parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token);
    }
}
