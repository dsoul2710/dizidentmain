package com.clinic.hms.controller;

import com.clinic.hms.dto.request.LoginRequest;
import com.clinic.hms.dto.response.LoginResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {

        User user = userRepository.findByMobile(request.getMobile())
                .orElseThrow(() -> new RuntimeException("Invalid mobile or password"));
        System.out.println("---user.getPassword()----"+user.getPassword());
        System.out.println("---request.getPassword()----"+request.getPassword());

        // plain text check for now; later use passwordEncoder.matches()
        if (!user.getPassword().equals(request.getPassword())) {
            throw new RuntimeException("Invalid mobile or password");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("User is inactive");
        }

        // Generate JWT
        String token = jwtUtil.generateToken(user.getId(), user.getRole(), user.getMobile());

        // HttpOnly cookie
        ResponseCookie cookie = ResponseCookie.from("hms_token", token)
                .httpOnly(true)
                .secure(false)          // set true when using HTTPS
                .path("/")
                .maxAge(Duration.ofHours(1))
                .sameSite("Lax")
                .build();

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        LoginResponse body = new LoginResponse(
                user.getId(),
                user.getMobile(),
                user.getRole(),
                "Clinic User" // later: fetch real name from user_details
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(body);
    }

}
