package com.clinic.hms.controller;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.response.UserSummaryResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final SuperAdminRepository superAdminRepository;

    @GetMapping
    public List<UserSummaryResponse> list(@RequestParam(value = "role", required = false) String role) {
        List<User> users;
        if (role == null || role.isBlank()) {
            users = userRepository.findAll();
        } else {
            try {
                String upperRole = role.toUpperCase();
                if (upperRole.equals("ORG")) {
                    upperRole = AppConstants.Roles.ORG_HOSPITAL;
                } else if (upperRole.equals("SUPERADMIN")) {
                    upperRole = AppConstants.Roles.SUPER_ADMIN;
                }
                UserRole userRole = UserRole.valueOf(upperRole);
                users = userRepository.findByRole(userRole);
            } catch (IllegalArgumentException e) {
                return List.of();
            }
        }

        return users.stream()
                .map(user -> {
                    String name = user.getMobile();
                    if (user.getRole() != null) {
                        switch (user.getRole()) {
                            case PATIENT -> name = patientRepository.findById(user.getId())
                                    .map(Patient::getFullName)
                                    .orElse(user.getMobile());
                            case DOCTOR -> name = doctorRepository.findById(user.getId())
                                    .map(Doctor::getFullName)
                                    .orElse(user.getMobile());
                            case ORG_HOSPITAL -> name = orgHospitalRepository.findById(user.getId())
                                    .map(OrgHospital::getOrgName)
                                    .orElse(user.getMobile());
                            case SERVICE_PROVIDER -> name = serviceProviderRepository.findById(user.getId())
                                    .map(ServiceProvider::getProviderName)
                                    .orElse(user.getMobile());
                            case SUPER_ADMIN -> name = superAdminRepository.findById(user.getId())
                                    .map(SuperAdmin::getFullName)
                                    .orElse(user.getMobile());
                        }
                    }

                    return UserSummaryResponse.builder()
                            .id(user.getId())
                            .name(name)
                            .mobile(user.getMobile())
                            .role(user.getRole() != null ? user.getRole().name() : null)
                            .build();
                })
                .toList();
    }
}
