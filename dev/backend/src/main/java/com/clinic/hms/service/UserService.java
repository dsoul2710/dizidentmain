package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.dto.response.ModulePermissionResponse;
import com.clinic.hms.dto.response.UserSummaryResponse;
import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final SuperAdminRepository superAdminRepository;
    private final ModulePermissionRepository modulePermissionRepository;

    public List<UserSummaryResponse> listUsers(String role) {
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

        return users.stream().map(this::toSummary).toList();
    }

    public List<ModulePermissionResponse> getPermissions(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<ModulePermission> list = modulePermissionRepository.findByUserId(userId);
        if (list.isEmpty()) {
            list = bootstrapDefaultPermissions(user);
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

    @Transactional
    public List<ModulePermissionResponse> updatePermissions(Long userId, List<ModulePermissionResponse> requestList) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        for (ModulePermissionResponse req : requestList) {
            ModulePermission mp = modulePermissionRepository.findByUserIdAndModuleName(userId, req.getModuleName())
                    .orElse(null);

            if (mp == null) {
                mp = ModulePermission.builder()
                        .user(user)
                        .moduleName(req.getModuleName())
                        .createdAt(LocalDateTime.now())
                        .build();
            }

            mp.setCanView(req.getCanView() != null ? req.getCanView() : false);
            mp.setCanEdit(req.getCanEdit() != null ? req.getCanEdit() : false);
            mp.setCanDelete(req.getCanDelete() != null ? req.getCanDelete() : false);
            mp.setUpdatedAt(LocalDateTime.now());

            modulePermissionRepository.save(mp);
        }

        return getPermissions(userId);
    }

    @Transactional
    public UserSummaryResponse toggleStatus(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setIsActive(active);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        return toSummary(user);
    }

    private UserSummaryResponse toSummary(User user) {
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
                default -> {
                }
            }
        }

        return UserSummaryResponse.builder()
                .id(user.getId())
                .name(name)
                .mobile(user.getMobile())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .isActive(user.getIsActive())
                .build();
    }

    private List<ModulePermission> bootstrapDefaultPermissions(User user) {
        List<String> modules = Collections.emptyList();
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
            modules = List.of("OVERVIEW", "LAB_ENTRY", "CHAT");
            canEdit = true;
        } else if (role == UserRole.PATIENT) {
            modules = List.of("OVERVIEW", "APPOINTMENTS", "PRESCRIPTION", "BILLING_FINANCE", "CHAT");
        }

        LocalDateTime now = LocalDateTime.now();
        List<ModulePermission> list = new ArrayList<>();
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
        return list;
    }
}
