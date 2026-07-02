package com.clinic.hms.service;

import com.clinic.hms.dto.request.LoginRequest;
import com.clinic.hms.dto.response.LoginResponse;
import com.clinic.hms.dto.response.ModulePermissionResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.exception.InactiveUserException;
import com.clinic.hms.exception.InvalidCredentialsException;
import com.clinic.hms.repository.*;
import com.clinic.hms.security.JwtUtil;
import com.clinic.hms.security.LegacyCompatiblePasswordEncoder;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final SuperAdminRepository superAdminRepository;
    private final ModulePermissionRepository modulePermissionRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    @Transactional
    public ResponseEntity<LoginResponse> login(LoginRequest request) {
        User user = userRepository.findByMobile(request.getMobile())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        upgradePasswordIfNeeded(user, request.getPassword());

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new InactiveUserException();
        }

        String token = jwtUtil.generateToken(user.getId(), user.getRole().name(), user.getMobile());

        ResponseCookie cookie = ResponseCookie.from("hms_token", token)
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(Duration.ofHours(1))
                .sameSite("Lax")
                .build();

        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        ProfileInfo profile = resolveProfile(user);
        List<ModulePermissionResponse> permissions = getOrBootstrapPermissions(user);

        LoginResponse body = new LoginResponse(
                user.getId(),
                user.getMobile(),
                user.getRole().name(),
                profile.name(),
                profile.providerType(),
                profile.providerTypes(),
                permissions
        );

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(body);
    }

    public ResponseEntity<Void> logout() {
        ResponseCookie cookie = ResponseCookie.from("hms_token", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

    private void upgradePasswordIfNeeded(User user, String rawPassword) {
        if (passwordEncoder instanceof LegacyCompatiblePasswordEncoder legacyEncoder
                && legacyEncoder.isLegacyEncoding(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(rawPassword));
        }
    }

    private ProfileInfo resolveProfile(User user) {
        String name = "User";
        String providerType = null;
        Set<String> providerTypes = new HashSet<>();

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
                if (sp.getProviderTypes() != null) {
                    sp.getProviderTypes().forEach(t -> providerTypes.add(t.name()));
                }
            } else {
                name = "Service Provider";
            }
        } else if (user.getRole() == UserRole.SUPER_ADMIN) {
            name = superAdminRepository.findById(user.getId()).map(SuperAdmin::getFullName).orElse("Super Admin");
        }

        return new ProfileInfo(name, providerType, providerTypes);
    }

    private List<ModulePermissionResponse> getOrBootstrapPermissions(User user) {
        List<ModulePermission> list = new ArrayList<>(modulePermissionRepository.findByUserId(user.getId()));
        if (list.isEmpty()) {
            List<String> modules = List.of();
            boolean canEdit = false;
            boolean canDelete = false;

            UserRole role = user.getRole();
            if (role == UserRole.SUPER_ADMIN || role == UserRole.SUPERADMIN) {
                modules = List.of("OVERVIEW", "PATIENTS", "DOCTORS", "LAB_ENTRY", "VENDOR_ENTRY", "APPOINTMENTS",
                        "PRESCRIPTION", "CONSENT_FORMS", "CHAT", "BILLING_FINANCE", "INVENTORY", "USER_MANAGEMENT");
                canEdit = true;
                canDelete = true;
            } else if (role == UserRole.ORG_HOSPITAL || role == UserRole.ORG) {
                modules = List.of("OVERVIEW", "PATIENTS", "DOCTORS", "LAB_ENTRY", "VENDOR_ENTRY", "APPOINTMENTS",
                        "PRESCRIPTION", "CONSENT_FORMS", "CHAT", "BILLING_FINANCE", "INVENTORY", "USER_MANAGEMENT");
                canEdit = true;
                canDelete = true;
            } else if (role == UserRole.DOCTOR) {
                modules = List.of("OVERVIEW", "PATIENTS", "APPOINTMENTS", "PRESCRIPTION", "CONSENT_FORMS", "CHAT");
                canEdit = true;
            } else if (role == UserRole.SERVICE_PROVIDER) {
                ServiceProvider sp = serviceProviderRepository.findById(user.getId()).orElse(null);
                List<String> spModules = new ArrayList<>();
                spModules.add("OVERVIEW");
                spModules.add("CHAT");
                if (sp != null && sp.getProviderTypes() != null) {
                    for (ServiceProviderType type : sp.getProviderTypes()) {
                        switch (type) {
                            case LAB -> spModules.add("LAB_ORDERS_MODULE");
                            case BED_MANAGER -> spModules.add("BED_ALLOCATION_MODULE");
                            case PHARMACY -> spModules.add("PHARMACY_ORDERS_MODULE");
                            case RADIOLOGY -> spModules.add("RADIOLOGY_MODULE");
                            case PATHOLOGY -> spModules.add("PATHOLOGY_MODULE");
                            case BLOOD_BANK -> spModules.add("BLOOD_BANK_MODULE");
                            case AMBULANCE -> spModules.add("AMBULANCE_MODULE");
                            case ORTHODONTIC_LAB -> spModules.add("ORTHODONTIC_LAB_MODULE");
                        }
                    }
                }
                modules = spModules;
                canEdit = true;
            } else if (role == UserRole.PATIENT) {
                modules = List.of("OVERVIEW", "APPOINTMENTS", "PRESCRIPTION", "BILLING_FINANCE", "CHAT");
            }

            LocalDateTime now = LocalDateTime.now();
            for (String module : modules) {
                ModulePermission mp = ModulePermission.builder()
                        .user(user)
                        .moduleName(module)
                        .canView(true)
                        .canEdit(canEdit)
                        .canDelete(canDelete)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
                modulePermissionRepository.save(mp);
                list.add(mp);
            }
        }

        return list.stream()
                .map(mp -> ModulePermissionResponse.builder()
                        .moduleName(mp.getModuleName())
                        .canView(mp.getCanView())
                        .canEdit(mp.getCanEdit())
                        .canDelete(mp.getCanDelete())
                        .build())
                .toList();
    }

    private record ProfileInfo(String name, String providerType, Set<String> providerTypes) {
    }
}
