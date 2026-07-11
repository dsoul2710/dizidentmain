package com.clinic.hms.controller;

import com.clinic.hms.dto.request.LoginRequest;
import com.clinic.hms.dto.response.LoginResponse;
import com.clinic.hms.dto.response.MeResponse;
import com.clinic.hms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.auth.legacy-enabled:true}")
    private boolean legacyAuthEnabled;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        if (!legacyAuthEnabled) {
            return ResponseEntity.status(410).build();
        }
        return authService.login(request);
    }

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.getCurrentProfile(authentication));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return authService.logout();
    }
}
