package com.clinic.hms.controller;

import com.clinic.hms.dto.request.LoginRequest;
import com.clinic.hms.dto.response.LoginResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
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
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final SuperAdminRepository superAdminRepository;
    
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {

        User user = userRepository.findByMobile(request.getMobile())
                .orElseThrow(() -> new RuntimeException("Invalid mobile or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid mobile or password");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new RuntimeException("User is inactive");
        }

        // Generate JWT
        String token = jwtUtil.generateToken(user.getId(), user.getRole().name(), user.getMobile());

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

        // Dynamic name lookup based on profile
        String name = "User";
        String providerType = null;
        if (user.getRole() == UserRole.PATIENT) {
            name = patientRepository.findById(user.getId()).map(Patient::getFullName).orElse("Patient User");
        } else if (user.getRole() == UserRole.DOCTOR) {
            name = doctorRepository.findById(user.getId()).map(Doctor::getFullName).orElse("Doctor User");
        } else if (user.getRole() == UserRole.ORG_HOSPITAL) {
            name = orgHospitalRepository.findById(user.getId()).map(OrgHospital::getOrgName).orElse("Clinic Org");
        } else if (user.getRole() == UserRole.SERVICE_PROVIDER) {
            ServiceProvider sp = serviceProviderRepository.findById(user.getId()).orElse(null);
            if (sp != null) {
                name = sp.getProviderName();
                providerType = sp.getProviderType() != null ? sp.getProviderType().name() : null;
            } else {
                name = "Service Provider";
            }
        } else if (user.getRole() == UserRole.SUPER_ADMIN) {
            name = superAdminRepository.findById(user.getId()).map(SuperAdmin::getFullName).orElse("Super Admin");
        }

        LoginResponse body = new LoginResponse(
                user.getId(),
                user.getMobile(),
                user.getRole().name(),
                name,
                providerType
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(body);
    }
}
