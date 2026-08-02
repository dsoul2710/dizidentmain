package com.clinic.hms.service;

import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserSeedService {

    private final UserRepository userRepository;
    private final SuperAdminRepository superAdminRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final DoctorOrgMappingRepository doctorOrgMappingRepository;
    private final PatientOrgMappingRepository patientOrgMappingRepository;
    private final PatientDoctorMappingRepository patientDoctorMappingRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final ServiceProviderOrgMappingRepository serviceProviderOrgMappingRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Value("classpath:data/users_seed.json")
    private Resource usersSeedResource;

    public void seedFromFile() {
        UsersSeedFile seed = readSeedFile();
        if (seed == null || seed.getUsers() == null || seed.getUsers().isEmpty()) {
            log.warn("No users seed file found; skipping user seeding.");
            return;
        }

        log.info("🌱 Seeding {} users from users_seed.json (generated {})",
                seed.getUsers().size(), seed.getGeneratedAt());

        LocalDateTime now = LocalDateTime.now();
        Map<String, OrgHospital> orgByMobile = new HashMap<>();
        Map<String, Doctor> doctorByMobile = new HashMap<>();
        Map<String, Patient> patientByMobile = new HashMap<>();
        Map<String, ServiceProvider> providerByMobile = new HashMap<>();

        List<UserRole> seedOrder = List.of(
                UserRole.SUPER_ADMIN,
                UserRole.ORG_HOSPITAL,
                UserRole.DOCTOR,
                UserRole.PATIENT,
                UserRole.SERVICE_PROVIDER
        );

        List<UserSeedEntry> orderedUsers = seed.getUsers().stream()
                .sorted(Comparator.comparingInt(entry -> seedOrder.indexOf(UserRole.valueOf(entry.getRole()))))
                .toList();

        for (UserSeedEntry entry : orderedUsers) {
            UserRole role = UserRole.valueOf(entry.getRole());
            switch (role) {
                case SUPER_ADMIN -> seedSuperAdmin(entry, now);
                case ORG_HOSPITAL -> orgByMobile.put(entry.getMobile(), seedOrg(entry, now));
                case DOCTOR -> doctorByMobile.put(entry.getMobile(), seedDoctor(entry, now, orgByMobile));
                case PATIENT -> patientByMobile.put(entry.getMobile(), seedPatient(entry, now, orgByMobile, doctorByMobile));
                case SERVICE_PROVIDER -> providerByMobile.put(entry.getMobile(), seedServiceProvider(entry, now, orgByMobile));
                default -> log.warn("Unsupported seed role {} for mobile {}", entry.getRole(), entry.getMobile());
            }
        }

        migrateLegacyServiceProviderTypes();
        log.info("✅ Seeded {} users from users_seed.json", seed.getUsers().size());
    }

    private UsersSeedFile readSeedFile() {
        try (InputStream in = usersSeedResource.getInputStream()) {
            return objectMapper.readValue(in, UsersSeedFile.class);
        } catch (IOException e) {
            log.error("Failed to read users_seed.json", e);
            return null;
        }
    }

    private void seedSuperAdmin(UserSeedEntry entry, LocalDateTime now) {
        User user = upsertUser(entry, now);
        SuperAdmin profile = superAdminRepository.findById(user.getId()).orElse(null);
        if (profile == null) {
            profile = SuperAdmin.builder()
                    .user(user)
                    .fullName(entry.getSuperAdmin().getFullName())
                    .createdAt(now)
                    .updatedAt(now)
                    .createdByUserId(user.getId())
                    .build();
        } else {
            profile.setFullName(entry.getSuperAdmin().getFullName());
            profile.setUpdatedAt(now);
        }
        superAdminRepository.save(profile);
        log.info("Super Admin: {} / {}", entry.getMobile(), defaultPassword(UserRole.SUPER_ADMIN));
    }

    private OrgHospital seedOrg(UserSeedEntry entry, LocalDateTime now) {
        User user = upsertUser(entry, now);
        OrgHospitalProfileSeed profileSeed = entry.getOrgHospital();
        OrgHospital profile = orgHospitalRepository.findById(user.getId()).orElse(null);
        if (profile == null) {
            profile = OrgHospital.builder()
                    .user(user)
                    .orgName(profileSeed.getOrgName())
                    .uniqueId(profileSeed.getUniqueId())
                    .createdAt(now)
                    .updatedAt(now)
                    .createdByUserId(user.getId())
                    .isDeleted(false)
                    .build();
        } else {
            profile.setOrgName(profileSeed.getOrgName());
            profile.setUniqueId(profileSeed.getUniqueId());
            profile.setUpdatedAt(now);
            profile.setIsDeleted(false);
        }
        profile = orgHospitalRepository.save(profile);
        log.info("Org: {} / {}", entry.getMobile(), defaultPassword(UserRole.ORG_HOSPITAL));
        return profile;
    }

    private Doctor seedDoctor(UserSeedEntry entry, LocalDateTime now, Map<String, OrgHospital> orgByMobile) {
        User user = upsertUser(entry, now);
        DoctorProfileSeed profileSeed = entry.getDoctor();
        Doctor profile = doctorRepository.findById(user.getId()).orElse(null);
        if (profile == null) {
            profile = Doctor.builder()
                    .user(user)
                    .fullName(profileSeed.getFullName())
                    .uniqueId(profileSeed.getUniqueId())
                    .speciality(profileSeed.getSpeciality())
                    .operationScope(parseOperationScope(profileSeed.getOperationScope()))
                    .createdAt(now)
                    .updatedAt(now)
                    .isDeleted(false)
                    .build();
        } else {
            profile.setFullName(profileSeed.getFullName());
            profile.setUniqueId(profileSeed.getUniqueId());
            profile.setSpeciality(profileSeed.getSpeciality());
            profile.setOperationScope(parseOperationScope(profileSeed.getOperationScope()));
            profile.setUpdatedAt(now);
            profile.setIsDeleted(false);
        }
        profile = doctorRepository.save(profile);

        for (String orgMobile : optionalList(entry.getDoctorOrgMobiles())) {
            OrgHospital org = orgByMobile.get(orgMobile);
            if (org == null) {
                log.warn("Doctor {} references unknown org mobile {}", entry.getMobile(), orgMobile);
                continue;
            }
            if (!doctorOrgMappingRepository.existsByOrgAndDoctor(org, profile)) {
                doctorOrgMappingRepository.save(DoctorOrgMapping.builder()
                        .org(org)
                        .doctor(profile)
                        .status("ACTIVE")
                        .createdAt(now)
                        .updatedAt(now)
                        .createdByUserId(org.getId())
                        .build());
            }
        }

        log.info("Doctor: {} / {}", entry.getMobile(), defaultPassword(UserRole.DOCTOR));
        return profile;
    }

    private Patient seedPatient(UserSeedEntry entry, LocalDateTime now,
                                Map<String, OrgHospital> orgByMobile,
                                Map<String, Doctor> doctorByMobile) {
        User user = upsertUser(entry, now);
        PatientProfileSeed profileSeed = entry.getPatient();
        Patient profile = patientRepository.findById(user.getId()).orElse(null);
        if (profile == null) {
            profile = Patient.builder()
                    .user(user)
                    .fullName(profileSeed.getFullName())
                    .uniqueId(profileSeed.getUniqueId())
                    .ageYears(profileSeed.getAgeYears())
                    .gender(profileSeed.getGender())
                    .dob(parseDate(profileSeed.getDob()))
                    .createdAt(now)
                    .updatedAt(now)
                    .createdByUserId(user.getId())
                    .isDeleted(false)
                    .build();
        } else {
            profile.setFullName(profileSeed.getFullName());
            profile.setUniqueId(profileSeed.getUniqueId());
            profile.setAgeYears(profileSeed.getAgeYears());
            profile.setGender(profileSeed.getGender());
            profile.setDob(parseDate(profileSeed.getDob()));
            profile.setUpdatedAt(now);
            profile.setIsDeleted(false);
        }
        profile = patientRepository.save(profile);

        for (String orgMobile : optionalList(entry.getPatientOrgMobiles())) {
            OrgHospital org = orgByMobile.get(orgMobile);
            if (org == null) {
                log.warn("Patient {} references unknown org mobile {}", entry.getMobile(), orgMobile);
                continue;
            }
            if (!patientOrgMappingRepository.existsByOrgAndPatient(org, profile)) {
                patientOrgMappingRepository.save(PatientOrgMapping.builder()
                        .org(org)
                        .patient(profile)
                        .status("ACTIVE")
                        .createdAt(now)
                        .updatedAt(now)
                        .createdByUserId(org.getId())
                        .build());
            }
        }

        for (String doctorMobile : optionalList(entry.getPatientDoctorMobiles())) {
            Doctor doctor = doctorByMobile.get(doctorMobile);
            if (doctor == null) {
                log.warn("Patient {} references unknown doctor mobile {}", entry.getMobile(), doctorMobile);
                continue;
            }
            if (!patientDoctorMappingRepository.existsByDoctorAndPatient(doctor, profile)) {
                patientDoctorMappingRepository.save(PatientDoctorMapping.builder()
                        .doctor(doctor)
                        .patient(profile)
                        .status("ACTIVE")
                        .createdAt(now)
                        .updatedAt(now)
                        .createdByUserId(doctor.getId())
                        .build());
            }
        }

        log.info("Patient: {} / {}", entry.getMobile(), defaultPassword(UserRole.PATIENT));
        return profile;
    }

    private ServiceProvider seedServiceProvider(UserSeedEntry entry, LocalDateTime now,
                                                 Map<String, OrgHospital> orgByMobile) {
        User user = upsertUser(entry, now);
        ServiceProviderProfileSeed profileSeed = entry.getServiceProvider();
        ServiceProviderType primaryType = ServiceProviderType.valueOf(profileSeed.getProviderType());
        Set<ServiceProviderType> providerTypes = new HashSet<>();
        for (String typeName : optionalList(profileSeed.getProviderTypes())) {
            providerTypes.add(ServiceProviderType.valueOf(typeName));
        }
        if (providerTypes.isEmpty()) {
            providerTypes.add(primaryType);
        }

        ServiceProvider profile = serviceProviderRepository.findById(user.getId()).orElse(null);
        OrgHospital defaultOrg = orgByMobile.values().stream().findFirst().orElse(null);
        if (profile == null) {
            profile = ServiceProvider.builder()
                    .user(user)
                    .providerName(profileSeed.getProviderName())
                    .providerType(primaryType)
                    .providerTypes(providerTypes)
                    .address(profileSeed.getAddress())
                    .mobile(entry.getMobile())
                    .uniqueId(profileSeed.getUniqueId())
                    .operationScope(parseOperationScope(profileSeed.getOperationScope()))
                    .createdAt(now)
                    .updatedAt(now)
                    .createdByUserId(defaultOrg != null ? defaultOrg.getId() : user.getId())
                    .isDeleted(false)
                    .build();
        } else {
            profile.setProviderName(profileSeed.getProviderName());
            profile.setProviderType(primaryType);
            profile.setProviderTypes(providerTypes);
            profile.setAddress(profileSeed.getAddress());
            profile.setMobile(entry.getMobile());
            profile.setUniqueId(profileSeed.getUniqueId());
            profile.setOperationScope(parseOperationScope(profileSeed.getOperationScope()));
            profile.setUpdatedAt(now);
            profile.setIsDeleted(false);
        }
        profile = serviceProviderRepository.save(profile);

        for (String orgMobile : optionalList(entry.getServiceProviderOrgMobiles())) {
            OrgHospital org = orgByMobile.get(orgMobile);
            if (org == null) {
                log.warn("Service provider {} references unknown org mobile {}", entry.getMobile(), orgMobile);
                continue;
            }
            if (!serviceProviderOrgMappingRepository.existsByOrgAndServiceProvider(org, profile)) {
                serviceProviderOrgMappingRepository.save(ServiceProviderOrgMapping.builder()
                        .org(org)
                        .serviceProvider(profile)
                        .status("ACTIVE")
                        .createdAt(now)
                        .updatedAt(now)
                        .createdByUserId(org.getId())
                        .build());
            }
        }

        log.info("Service provider: {} / {}", entry.getMobile(), defaultPassword(UserRole.SERVICE_PROVIDER));
        return profile;
    }

    private User upsertUser(UserSeedEntry entry, LocalDateTime now) {
        UserRole role = UserRole.valueOf(entry.getRole());
        User user = userRepository.findByMobile(entry.getMobile()).orElse(null);
        if (user == null) {
            user = User.builder()
                    .mobile(entry.getMobile())
                    .password(passwordEncoder.encode(defaultPassword(role)))
                    .role(role)
                    .isActive(entry.getIsActive() == null || entry.getIsActive())
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
        } else {
            user.setPassword(passwordEncoder.encode(defaultPassword(role)));
            user.setRole(role);
            user.setIsActive(entry.getIsActive() == null || entry.getIsActive());
            user.setUpdatedAt(now);
        }
        return userRepository.save(user);
    }

    private void migrateLegacyServiceProviderTypes() {
        for (ServiceProvider sp : serviceProviderRepository.findAll()) {
            if ((sp.getProviderTypes() == null || sp.getProviderTypes().isEmpty()) && sp.getProviderType() != null) {
                if (sp.getProviderTypes() == null) {
                    sp.setProviderTypes(new HashSet<>());
                }
                sp.getProviderTypes().add(sp.getProviderType());
                serviceProviderRepository.save(sp);
            }
        }
    }

    private static String defaultPassword(UserRole role) {
        return switch (role) {
            case SUPER_ADMIN, SUPERADMIN -> "admin123";
            case ORG_HOSPITAL, ORG -> "org123";
            case DOCTOR -> "doctor123";
            case PATIENT -> "patient123";
            case SERVICE_PROVIDER -> "provider123";
        };
    }

    private static OperationScope parseOperationScope(String scope) {
        if (scope == null || scope.isBlank()) {
            return OperationScope.INDEPENDENT;
        }
        return OperationScope.valueOf(scope);
    }

    private static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return LocalDate.parse(value);
    }

    private static <T> List<T> optionalList(List<T> values) {
        return values == null ? List.of() : values;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UsersSeedFile {
        private String generatedAt;
        private List<UserSeedEntry> users;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UserSeedEntry {
        private String mobile;
        private String role;
        private Boolean isActive;
        private SuperAdminProfileSeed superAdmin;
        private OrgHospitalProfileSeed orgHospital;
        private DoctorProfileSeed doctor;
        private PatientProfileSeed patient;
        private ServiceProviderProfileSeed serviceProvider;
        private List<String> doctorOrgMobiles;
        private List<String> patientOrgMobiles;
        private List<String> patientDoctorMobiles;
        private List<String> serviceProviderOrgMobiles;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SuperAdminProfileSeed {
        private String fullName;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OrgHospitalProfileSeed {
        private String orgName;
        private String uniqueId;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class DoctorProfileSeed {
        private String fullName;
        private String uniqueId;
        private String speciality;
        private String operationScope;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PatientProfileSeed {
        private String fullName;
        private String uniqueId;
        private Integer ageYears;
        private String gender;
        private String dob;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ServiceProviderProfileSeed {
        private String providerName;
        private String providerType;
        private List<String> providerTypes;
        private String address;
        private String uniqueId;
        private String operationScope;
    }
}
