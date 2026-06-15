package com.clinic.hms.config;

import com.clinic.hms.entity.*;
import com.clinic.hms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;
    private final OrgDoctorMappingRepository orgDoctorMappingRepository;
    private final OrgPatientMappingRepository orgPatientMappingRepository;
    private final AppointmentRepository appointmentRepository;
    private final VisitRepository visitRepository;
    private final BillRepository billRepository;
    private final LabRepository labRepository;
    private final VendorRepository vendorRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final PrescriptionRepository prescriptionRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        User superAdmin = seedSuperAdmin();
        User defaultOrg = seedDefaultOrg();
        linkExistingData(defaultOrg);
    }

    private User seedSuperAdmin() {
        User superAdmin = userRepository.findByMobile("9999999999").orElse(null);

        if (superAdmin == null) {
            superAdmin = User.builder()
                    .mobile("9999999999")
                    .password("admin123")
                    .role("SUPERADMIN")
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            superAdmin = userRepository.save(superAdmin);
            log.info("✅ Super Admin user seeded (9999999999)");
        } else {
            if (!"SUPERADMIN".equalsIgnoreCase(superAdmin.getRole())) {
                superAdmin.setRole("SUPERADMIN");
                superAdmin.setUpdatedAt(LocalDateTime.now());
                superAdmin = userRepository.save(superAdmin);
                log.info("✅ Migrated existing user 9999999999 to SUPERADMIN");
            }
        }
        return superAdmin;
    }

    private User seedDefaultOrg() {
        User defaultOrg = userRepository.findByMobile("8888888888").orElse(null);

        if (defaultOrg == null) {
            defaultOrg = User.builder()
                    .mobile("8888888888")
                    .password("org123")
                    .role("ORG")
                    .isActive(true)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            defaultOrg = userRepository.save(defaultOrg);

            UserDetails details = UserDetails.builder()
                    .user(defaultOrg)
                    .fullName("Default Clinic Org")
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            userDetailsRepository.save(details);

            log.info("✅ Default Clinic Org user seeded (8888888888)");
        }
        return defaultOrg;
    }

    private void linkExistingData(User defaultOrg) {
        log.info("🔄 Checking and linking legacy data to Default Clinic Org...");

        // 1. Link Doctors
        List<User> doctors = userRepository.findByRole("DOCTOR");
        for (User doc : doctors) {
            if (!orgDoctorMappingRepository.existsByOrgAndDoctor(defaultOrg, doc)) {
                OrgDoctorMapping mapping = OrgDoctorMapping.builder()
                        .org(defaultOrg)
                        .doctor(doc)
                        .createdAt(LocalDateTime.now())
                        .build();
                orgDoctorMappingRepository.save(mapping);
                log.info("🔗 Linked doctor {} to default clinic org", doc.getMobile());
            }
        }

        // 2. Link Patients
        List<User> patients = userRepository.findByRole("PATIENT");
        for (User pat : patients) {
            if (!orgPatientMappingRepository.existsByOrgAndPatient(defaultOrg, pat)) {
                OrgPatientMapping mapping = OrgPatientMapping.builder()
                        .org(defaultOrg)
                        .patient(pat)
                        .createdAt(LocalDateTime.now())
                        .build();
                orgPatientMappingRepository.save(mapping);
                log.info("🔗 Linked patient {} to default clinic org", pat.getMobile());
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
}
