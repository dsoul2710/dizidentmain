package com.clinic.hms.config;

import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final EntityManager entityManager;
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

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("🚀 Starting Dizident Data Seeder...");
        
        // 1. Clear legacy data (except Super Admin and Service Providers)
        clearLegacyData();
        
        // 2. Seed/Refresh Super Admin
        seedSuperAdmin();
        
        // 3. Seed new Orgs (5 credentials)
        List<OrgHospital> orgs = seedOrgs();
        OrgHospital defaultOrg = orgs.get(0); // Org #1 is default context
        
        // 4. Seed new Doctors (5 credentials)
        List<Doctor> doctors = seedDoctors(orgs);
        
        // 5. Seed new Patients (10 credentials) and establish mappings
        seedPatients(orgs, doctors);
        
        // 6. Seed Service Providers (no change)
        seedDefaultServiceProviders(defaultOrg);
        
        // 7. Migrate legacy provider types
        migrateLegacyServiceProviderTypes();
        
        log.info("🎉 Dizident Data Seeder completed successfully!");
    }

    private void clearLegacyData() {
        log.info("🧹 Clearing tables...");
        
        // Fix password column length constraint in database
        entityManager.createNativeQuery("ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(100)").executeUpdate();
        
        // 0. Drop legacy tables if they exist
        entityManager.createNativeQuery("DROP TABLE IF EXISTS user_details CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS org_doctor_mappings CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS org_patient_mappings CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS org_provider_mappings CASCADE").executeUpdate();
        entityManager.createNativeQuery("DROP TABLE IF EXISTS provider_service_price_lists CASCADE").executeUpdate();
        
        // 1. Mappings
        entityManager.createNativeQuery("DELETE FROM patient_org_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM patient_doctor_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM doctor_org_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM service_provider_org_mappings").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM patient_lab_mappings").executeUpdate();
        
        // 2. Chat messages and threads
        entityManager.createNativeQuery("DELETE FROM chat_messages").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM chat_attachments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM chat_threads").executeUpdate();
        
        // 3. Billing lines and payments
        entityManager.createNativeQuery("DELETE FROM bill_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM bill_payments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM bills").executeUpdate();
        
        // 4. Prescription items
        entityManager.createNativeQuery("DELETE FROM prescription_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM prescriptions").executeUpdate();
        
        // 5. Appointments & Service Orders
        entityManager.createNativeQuery("DELETE FROM appointments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM service_orders").executeUpdate();
        
        // 6. Inventory and vendors
        entityManager.createNativeQuery("DELETE FROM inventory_movements").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM treatment_inventory_templates").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM inventory_treatment_template_rows").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM inventory_treatment_templates").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM inventory_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM vendors").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM labs").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM procedure_price_lists").executeUpdate();
        
        // 7. Visit child items
        entityManager.createNativeQuery("DELETE FROM visit_treatment_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM visit_examination_items").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM visit_treatments").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM visits").executeUpdate();
        
        // 8. Profiles
        entityManager.createNativeQuery("DELETE FROM patients").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM doctors").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM org_hospitals").executeUpdate();
        
        // 9. Module Permissions & Users (retaining SUPER_ADMIN and SERVICE_PROVIDER roles)
        entityManager.createNativeQuery("DELETE FROM module_permissions WHERE user_id NOT IN (SELECT id FROM users WHERE role IN ('SUPER_ADMIN', 'SERVICE_PROVIDER'))").executeUpdate();
        entityManager.createNativeQuery("DELETE FROM users WHERE role NOT IN ('SUPER_ADMIN', 'SERVICE_PROVIDER')").executeUpdate();
        
        log.info("✅ Tables cleared");
    }

    private void seedSuperAdmin() {
        User superAdminUser = userRepository.findByMobile("9999999999").orElse(null);
        if (superAdminUser == null) {
            superAdminUser = User.builder()
                    .mobile("9999999999")
                    .password(passwordEncoder.encode("admin123"))
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            superAdminUser = userRepository.save(superAdminUser);
        } else {
            superAdminUser.setPassword(passwordEncoder.encode("admin123"));
            superAdminUser.setRole(UserRole.SUPER_ADMIN);
            superAdminUser = userRepository.save(superAdminUser);
        }

        SuperAdmin profile = superAdminRepository.findById(superAdminUser.getId()).orElse(null);
        if (profile == null) {
            profile = SuperAdmin.builder()
                    .user(superAdminUser)
                    .fullName("System Administrator")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(superAdminUser.getId())
                    .build();
            superAdminRepository.save(profile);
        }
        log.info("✅ Super Admin credentials: 9999999999 / admin123");
    }

    private List<OrgHospital> seedOrgs() {
        log.info("🌱 Seeding Orgs (8888888801 - 8888888805)...");
        List<OrgHospital> seededOrgs = new ArrayList<>();
        
        for (int i = 1; i <= 5; i++) {
            String mobile = String.format("888888880%d", i);
            String orgName = "Clinic Org #" + i;
            String uniqueId = "ORG-00000" + i;
            
            User user = User.builder()
                    .mobile(mobile)
                    .password(passwordEncoder.encode("org123"))
                    .role(UserRole.ORG_HOSPITAL)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            user = userRepository.save(user);
            
            OrgHospital profile = OrgHospital.builder()
                    .user(user)
                    .orgName(orgName)
                    .uniqueId(uniqueId)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(user.getId())
                    .isDeleted(false)
                    .build();
            profile = orgHospitalRepository.save(profile);
            seededOrgs.add(profile);
            
            log.info("Org: {} / org123", mobile);
        }
        return seededOrgs;
    }

    private List<Doctor> seedDoctors(List<OrgHospital> orgs) {
        log.info("🌱 Seeding Doctors (6666666601 - 6666666606)...");
        List<Doctor> seededDoctors = new ArrayList<>();
        
        for (int i = 1; i <= 5; i++) {
            String mobile = String.format("666666660%d", i);
            String docName = "Doctor #" + i;
            String uniqueId = "DOC-00000" + i;
            OrgHospital associatedOrg = orgs.get(i - 1); // Doctor i maps to Org i
            
            User user = User.builder()
                    .mobile(mobile)
                    .password(passwordEncoder.encode("doctor123"))
                    .role(UserRole.DOCTOR)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            user = userRepository.save(user);
            
            Doctor profile = Doctor.builder()
                    .user(user)
                    .fullName(docName)
                    .uniqueId(uniqueId)
                    .speciality("Clinical Doctor")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .isDeleted(false)
                    .build();
            profile = doctorRepository.save(profile);
            seededDoctors.add(profile);
            
            // Link Doctor #i to Org #i
            DoctorOrgMapping mapping = DoctorOrgMapping.builder()
                    .org(associatedOrg)
                    .doctor(profile)
                    .status("ACTIVE")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(associatedOrg.getId())
                    .build();
            doctorOrgMappingRepository.save(mapping);
            
            log.info("Doctor: {} / doctor123 (linked to {})", mobile, associatedOrg.getUniqueId());
        }

        // Seed 1 doctor NOT associated with any Org (independent doctor)
        String indMobile = "6666666606";
        String indDocName = "Independent Doctor";
        String indUniqueId = "DOC-000006";

        User indUser = User.builder()
                .mobile(indMobile)
                .password(passwordEncoder.encode("doctor123"))
                .role(UserRole.DOCTOR)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        indUser = userRepository.save(indUser);

        Doctor indProfile = Doctor.builder()
                .user(indUser)
                .fullName(indDocName)
                .uniqueId(indUniqueId)
                .speciality("Independent Practitioner")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .isDeleted(false)
                .build();
        indProfile = doctorRepository.save(indProfile);
        seededDoctors.add(indProfile);

        log.info("Doctor (Independent): {} / doctor123 (Not linked to any Org)", indMobile);

        return seededDoctors;
    }

    private void seedPatients(List<OrgHospital> orgs, List<Doctor> doctors) {
        log.info("🌱 Seeding Patients (2222220001 - 2222220010)...");
        
        for (int i = 1; i <= 10; i++) {
            String mobile = String.format("222222%04d", i);
            String name = "Patient #" + i;
            String uniqueId = String.format("PAT-%06d", i);
            
            User user = User.builder()
                    .mobile(mobile)
                    .password(passwordEncoder.encode("patient123"))
                    .role(UserRole.PATIENT)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            user = userRepository.save(user);
            
            Patient profile = Patient.builder()
                    .user(user)
                    .fullName(name)
                    .uniqueId(uniqueId)
                    .ageYears(20 + i)
                    .gender(i % 2 == 0 ? "Male" : "Female")
                    .dob(LocalDate.now().minusYears(20 + i))
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(user.getId())
                    .isDeleted(false)
                    .build();
            profile = patientRepository.save(profile);

            // Segregated Mappings: Link Patient to Org #i and Doctor #i
            // Patient 1 & 2 -> Org 1, Doc 1
            // Patient 3 & 4 -> Org 2, Doc 2, and so on...
            int targetIndex = (i - 1) / 2; // maps: 0,0,1,1,2,2,3,3,4,4
            if (targetIndex >= 0 && targetIndex < 5) {
                OrgHospital targetOrg = orgs.get(targetIndex);
                Doctor targetDoc = doctors.get(targetIndex);
                
                // Link to Org #i
                PatientOrgMapping linkOrg = PatientOrgMapping.builder()
                        .org(targetOrg)
                        .patient(profile)
                        .status("ACTIVE")
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdByUserId(targetOrg.getId())
                        .build();
                patientOrgMappingRepository.save(linkOrg);
                
                // Link to Doctor #i
                PatientDoctorMapping linkDoc = PatientDoctorMapping.builder()
                        .doctor(targetDoc)
                        .patient(profile)
                        .status("ACTIVE")
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdByUserId(targetOrg.getId())
                        .build();
                patientDoctorMappingRepository.save(linkDoc);
            }
            
            log.info("Patient: {} / patient123", mobile);
        }
    }

    private void seedDefaultServiceProviders(OrgHospital defaultOrg) {
        log.info("🌱 Seeding Service Providers (No change)...");
        List<SeedProvider> providers = List.of(
            new SeedProvider("7777777701", "Default Lab Partner", ServiceProviderType.LAB, "Suite 101, Med Plaza", "SP-000101"),
            new SeedProvider("7777777702", "Default Bed Manager", ServiceProviderType.BED_MANAGER, "Ward Accommodation Wing", "SP-000102"),
            new SeedProvider("7777777703", "Default Pharmacy Partner", ServiceProviderType.PHARMACY, "Ground Floor, Clinic Wing", "SP-000103"),
            new SeedProvider("7777777704", "Default Radiology Partner", ServiceProviderType.RADIOLOGY, "Basement X-Ray Lab", "SP-000104"),
            new SeedProvider("7777777705", "Default Pathology Partner", ServiceProviderType.PATHOLOGY, "First Floor, Diagnostics Wing", "SP-000105"),
            new SeedProvider("7777777706", "Default Blood Bank Partner", ServiceProviderType.BLOOD_BANK, "Red Cross Depot Wing", "SP-000106"),
            new SeedProvider("7777777707", "Default Ambulance Partner", ServiceProviderType.AMBULANCE, "Emergency Bay, Entrance", "SP-000107"),
            new SeedProvider("7777777708", "Default Orthodontic Lab Partner", ServiceProviderType.ORTHODONTIC_LAB, "Dental Lab, Block B", "SP-000108")
        );

        for (SeedProvider spInfo : providers) {
            User spUser = userRepository.findByMobile(spInfo.mobile).orElse(null);
            if (spUser == null) {
                spUser = User.builder()
                        .mobile(spInfo.mobile)
                        .password(passwordEncoder.encode("provider123"))
                        .role(UserRole.SERVICE_PROVIDER)
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build();
                spUser = userRepository.save(spUser);
                log.info("✅ Service provider user seeded ({})", spInfo.mobile);
            } else {
                spUser.setPassword(passwordEncoder.encode("provider123"));
                if (spUser.getRole() != UserRole.SERVICE_PROVIDER) {
                    spUser.setRole(UserRole.SERVICE_PROVIDER);
                }
                spUser.setUpdatedAt(LocalDateTime.now());
                spUser = userRepository.save(spUser);
                log.info("✅ Refreshed service provider password ({})", spInfo.mobile);
            }

            ServiceProvider profile = serviceProviderRepository.findById(spUser.getId()).orElse(null);
            if (profile == null) {
                profile = ServiceProvider.builder()
                        .user(spUser)
                        .providerName(spInfo.name)
                        .providerType(spInfo.type)
                        .providerTypes(new HashSet<>(List.of(spInfo.type)))
                        .address(spInfo.address)
                        .mobile(spInfo.mobile)
                        .uniqueId(spInfo.uniqueId)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdByUserId(defaultOrg.getId())
                        .isDeleted(false)
                        .build();
                profile = serviceProviderRepository.save(profile);
                log.info("Service provider profile seeded for {}", spInfo.name);
            } else {
                profile.setProviderName(spInfo.name);
                profile.setProviderType(spInfo.type);
                if (profile.getProviderTypes() == null) {
                    profile.setProviderTypes(new HashSet<>());
                }
                profile.getProviderTypes().add(spInfo.type);
                profile.setAddress(spInfo.address);
                profile.setMobile(spInfo.mobile);
                profile.setUniqueId(spInfo.uniqueId);
                profile.setUpdatedAt(LocalDateTime.now());
                profile = serviceProviderRepository.save(profile);
            }

            if (!serviceProviderOrgMappingRepository.existsByOrgAndServiceProvider(defaultOrg, profile)) {
                ServiceProviderOrgMapping mapping = ServiceProviderOrgMapping.builder()
                        .org(defaultOrg)
                        .serviceProvider(profile)
                        .status("ACTIVE")
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdByUserId(defaultOrg.getId())
                        .build();
                serviceProviderOrgMappingRepository.save(mapping);
                log.info("🔗 Linked partner {} to Default Clinic Org", spInfo.name);
            }
        }
    }

    private void migrateLegacyServiceProviderTypes() {
        List<ServiceProvider> providers = serviceProviderRepository.findAll();
        for (ServiceProvider sp : providers) {
            if ((sp.getProviderTypes() == null || sp.getProviderTypes().isEmpty()) && sp.getProviderType() != null) {
                sp.getProviderTypes().add(sp.getProviderType());
                serviceProviderRepository.save(sp);
                log.info("Migrated legacy provider type {} to set for service provider {}", sp.getProviderType(), sp.getProviderName());
            }
        }
    }

    private static class SeedProvider {
        String mobile;
        String name;
        ServiceProviderType type;
        String address;
        String uniqueId;

        SeedProvider(String mobile, String name, ServiceProviderType type, String address, String uniqueId) {
            this.mobile = mobile;
            this.name = name;
            this.type = type;
            this.address = address;
            this.uniqueId = uniqueId;
        }
    }
}
