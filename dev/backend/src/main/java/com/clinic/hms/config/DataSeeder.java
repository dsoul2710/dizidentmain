package com.clinic.hms.config;

import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SuperAdminRepository superAdminRepository;
    private final OrgHospitalRepository orgHospitalRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final DoctorOrgMappingRepository doctorOrgMappingRepository;
    private final PatientOrgMappingRepository patientOrgMappingRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    private final BillRepository billRepository;
    private final LabRepository labRepository;
    private final VendorRepository vendorRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final ServiceProviderRepository serviceProviderRepository;
    private final ServiceProviderOrgMappingRepository serviceProviderOrgMappingRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        seedSuperAdmin();
        OrgHospital defaultOrg = seedDefaultOrg();
        linkExistingData(defaultOrg);
        seedDefaultServiceProviders(defaultOrg);
    }

    private void seedSuperAdmin() {
        User superAdmin = userRepository.findByMobile("9999999999").orElse(null);

        if (superAdmin == null) {
            superAdmin = User.builder()
                    .mobile("9999999999")
                    .password(passwordEncoder.encode("admin123"))
                    .role(UserRole.SUPER_ADMIN)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            superAdmin = userRepository.save(superAdmin);
            log.info("✅ Super Admin user seeded (9999999999)");
        } else {
            superAdmin.setPassword(passwordEncoder.encode("admin123"));
            if (superAdmin.getRole() != UserRole.SUPER_ADMIN) {
                superAdmin.setRole(UserRole.SUPER_ADMIN);
            }
            superAdmin.setUpdatedAt(LocalDateTime.now());
            superAdmin = userRepository.save(superAdmin);
            log.info("✅ Migrated existing user 9999999999 to SUPER_ADMIN");
        }

        SuperAdmin profile = superAdminRepository.findById(superAdmin.getId()).orElse(null);
        if (profile == null) {
            profile = SuperAdmin.builder()
                    .user(superAdmin)
                    .fullName("System Administrator")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(superAdmin.getId())
                    .updatedByUserId(superAdmin.getId())
                    .build();
            superAdminRepository.save(profile);
            log.info("✅ Super Admin profile seeded");
        }
    }

    private OrgHospital seedDefaultOrg() {
        User defaultOrg = userRepository.findByMobile("8888888888").orElse(null);

        if (defaultOrg == null) {
            defaultOrg = User.builder()
                    .mobile("8888888888")
                    .password(passwordEncoder.encode("org123"))
                    .role(UserRole.ORG_HOSPITAL)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            defaultOrg = userRepository.save(defaultOrg);
            log.info("✅ Default Clinic Org user seeded (8888888888)");
        } else {
            defaultOrg.setPassword(passwordEncoder.encode("org123"));
            if (defaultOrg.getRole() != UserRole.ORG_HOSPITAL) {
                defaultOrg.setRole(UserRole.ORG_HOSPITAL);
            }
            defaultOrg.setUpdatedAt(LocalDateTime.now());
            defaultOrg = userRepository.save(defaultOrg);
            log.info("✅ Migrated existing user 8888888888 to ORG_HOSPITAL");
        }

        OrgHospital profile = orgHospitalRepository.findById(defaultOrg.getId()).orElse(null);
        if (profile == null) {
            profile = OrgHospital.builder()
                    .user(defaultOrg)
                    .orgName("Default Clinic Org")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(defaultOrg.getId())
                    .updatedByUserId(defaultOrg.getId())
                    .isDeleted(false)
                    .build();
            profile = orgHospitalRepository.save(profile);
            log.info("✅ Default Clinic Org profile seeded");
        }
        return profile;
    }

    private void linkExistingData(OrgHospital defaultOrg) {
        log.info("🔄 Checking and linking legacy data to Default Clinic Org...");

        // 1. Link Doctors
        List<Doctor> doctors = doctorRepository.findAll();
        for (Doctor doc : doctors) {
            if (!doctorOrgMappingRepository.existsByOrgAndDoctor(defaultOrg, doc)) {
                DoctorOrgMapping mapping = DoctorOrgMapping.builder()
                        .org(defaultOrg)
                        .doctor(doc)
                        .status("ACTIVE")
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdByUserId(defaultOrg.getId())
                        .build();
                doctorOrgMappingRepository.save(mapping);
                log.info("🔗 Linked doctor {} to default clinic org", doc.getFullName());
            }
        }

        // 2. Link Patients
        List<Patient> patients = patientRepository.findAll();
        for (Patient pat : patients) {
            boolean needsSave = false;
            if (pat.getUniqueId() == null || pat.getUniqueId().isBlank()) {
                String uniqueId = "PAT-" + String.format("%06d", (int)(Math.random() * 1000000));
                while (patientRepository.existsByUniqueId(uniqueId)) {
                    uniqueId = "PAT-" + String.format("%06d", (int)(Math.random() * 1000000));
                }
                pat.setUniqueId(uniqueId);
                needsSave = true;
                log.info("Generated unique ID {} for legacy patient {}", uniqueId, pat.getFullName());
            }
            if (needsSave) {
                patientRepository.save(pat);
            }

            if (!patientOrgMappingRepository.existsByOrgAndPatient(defaultOrg, pat)) {
                PatientOrgMapping mapping = PatientOrgMapping.builder()
                        .org(defaultOrg)
                        .patient(pat)
                        .status("ACTIVE")
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdByUserId(defaultOrg.getId())
                        .build();
                patientOrgMappingRepository.save(mapping);
                log.info("🔗 Linked patient {} to default clinic org", pat.getFullName());
            }
        }

        // 3. Link Appointments
        List<Appointment> appointments = appointmentRepository.findAll();
        for (Appointment appt : appointments) {
            if (appt.getOrg() == null) {
                appt.setOrg(defaultOrg);
                appointmentRepository.save(appt);
            }
        }

        // 4. Link Visits
        List<Visit> visits = visitRepository.findAll();
        for (Visit v : visits) {
            if (v.getOrg() == null) {
                v.setOrg(defaultOrg);
                visitRepository.save(v);
            }
        }

        // 5. Link Bills
        List<Bill> bills = billRepository.findAll();
        for (Bill b : bills) {
            if (b.getOrg() == null) {
                b.setOrg(defaultOrg);
                billRepository.save(b);
            }
        }

        // 6. Link Labs
        List<Lab> labs = labRepository.findAll();
        for (Lab lab : labs) {
            if (lab.getOrg() == null) {
                lab.setOrg(defaultOrg);
                labRepository.save(lab);
            }
        }

        // 7. Link Vendors
        List<Vendor> vendors = vendorRepository.findAll();
        for (Vendor ven : vendors) {
            if (ven.getOrg() == null) {
                ven.setOrg(defaultOrg);
                vendorRepository.save(ven);
            }
        }

        // 8. Link InventoryItems
        List<InventoryItem> items = inventoryItemRepository.findAll();
        for (InventoryItem item : items) {
            if (item.getOrg() == null) {
                item.setOrg(defaultOrg);
                inventoryItemRepository.save(item);
            }
        }

        // 9. Link Prescriptions
        List<Prescription> prescriptions = prescriptionRepository.findAll();
        for (Prescription rx : prescriptions) {
            if (rx.getOrg() == null) {
                rx.setOrg(defaultOrg);
                prescriptionRepository.save(rx);
            }
        }

        log.info("✅ Legacy data mapping checked successfully");
    }

    private void seedDefaultServiceProviders(OrgHospital defaultOrg) {
        // 1. Seed LAB provider (7777777777 / provider123)
        User labUser = userRepository.findByMobile("7777777777").orElse(null);
        if (labUser == null) {
            labUser = User.builder()
                    .mobile("7777777777")
                    .password(passwordEncoder.encode("provider123"))
                    .role(UserRole.SERVICE_PROVIDER)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            labUser = userRepository.save(labUser);
            log.info("✅ Lab service provider user seeded (7777777777)");
        } else {
            labUser.setPassword(passwordEncoder.encode("provider123"));
            if (labUser.getRole() != UserRole.SERVICE_PROVIDER) {
                labUser.setRole(UserRole.SERVICE_PROVIDER);
            }
            labUser.setUpdatedAt(LocalDateTime.now());
            labUser = userRepository.save(labUser);
            log.info("✅ Refreshed lab service provider password");
        }
        ServiceProvider labProfile = serviceProviderRepository.findById(labUser.getId()).orElse(null);
        if (labProfile == null) {
            labProfile = ServiceProvider.builder()
                    .user(labUser)
                    .providerName("Default Lab Partner")
                    .providerType(ServiceProviderType.LAB)
                    .address("Suite 101, Med Plaza")
                    .mobile("7777777777")
                    .uniqueId("SP-000001")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(defaultOrg.getId())
                    .isDeleted(false)
                    .build();
            labProfile = serviceProviderRepository.save(labProfile);
            log.info("✅ Lab service provider profile seeded");
        }
        if (!serviceProviderOrgMappingRepository.existsByOrgAndServiceProvider(defaultOrg, labProfile)) {
            ServiceProviderOrgMapping mapping = ServiceProviderOrgMapping.builder()
                    .org(defaultOrg)
                    .serviceProvider(labProfile)
                    .status("ACTIVE")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(defaultOrg.getId())
                    .build();
            serviceProviderOrgMappingRepository.save(mapping);
            log.info("🔗 Linked lab partner to Default Clinic Org");
        }

        // 2. Seed PHARMACY provider (6666666666 / provider123)
        User pharmUser = userRepository.findByMobile("6666666666").orElse(null);
        if (pharmUser == null) {
            pharmUser = User.builder()
                    .mobile("6666666666")
                    .password(passwordEncoder.encode("provider123"))
                    .role(UserRole.SERVICE_PROVIDER)
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            pharmUser = userRepository.save(pharmUser);
            log.info("✅ Pharmacy service provider user seeded (6666666666)");
        } else {
            pharmUser.setPassword(passwordEncoder.encode("provider123"));
            if (pharmUser.getRole() != UserRole.SERVICE_PROVIDER) {
                pharmUser.setRole(UserRole.SERVICE_PROVIDER);
            }
            pharmUser.setUpdatedAt(LocalDateTime.now());
            pharmUser = userRepository.save(pharmUser);
            log.info("✅ Refreshed pharmacy service provider password");
        }
        ServiceProvider pharmProfile = serviceProviderRepository.findById(pharmUser.getId()).orElse(null);
        if (pharmProfile == null) {
            pharmProfile = ServiceProvider.builder()
                    .user(pharmUser)
                    .providerName("Default Pharmacy Partner")
                    .providerType(ServiceProviderType.PHARMACY)
                    .address("Ground Floor, Clinic Wing")
                    .mobile("6666666666")
                    .uniqueId("SP-000002")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(defaultOrg.getId())
                    .isDeleted(false)
                    .build();
            pharmProfile = serviceProviderRepository.save(pharmProfile);
            log.info("✅ Pharmacy service provider profile seeded");
        }
        if (!serviceProviderOrgMappingRepository.existsByOrgAndServiceProvider(defaultOrg, pharmProfile)) {
            ServiceProviderOrgMapping mapping = ServiceProviderOrgMapping.builder()
                    .org(defaultOrg)
                    .serviceProvider(pharmProfile)
                    .status("ACTIVE")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .createdByUserId(defaultOrg.getId())
                    .build();
            serviceProviderOrgMappingRepository.save(mapping);
            log.info("🔗 Linked pharmacy partner to Default Clinic Org");
        }
    }
}
