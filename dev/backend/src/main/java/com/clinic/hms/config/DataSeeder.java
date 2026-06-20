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
        migrateLegacyServiceProviderTypes();
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
                        .providerTypes(new java.util.HashSet<>(java.util.List.of(spInfo.type)))
                        .address(spInfo.address)
                        .mobile(spInfo.mobile)
                        .uniqueId(spInfo.uniqueId)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdByUserId(defaultOrg.getId())
                        .isDeleted(false)
                        .build();
                profile = serviceProviderRepository.save(profile);
                log.info("o. Service provider profile seeded for {}", spInfo.name);
            } else {
                profile.setProviderName(spInfo.name);
                profile.setProviderType(spInfo.type);
                if (profile.getProviderTypes() == null) {
                    profile.setProviderTypes(new java.util.HashSet<>());
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
}
