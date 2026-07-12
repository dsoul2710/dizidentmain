package com.clinic.hms.service.doctor;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.Doctor;
import com.clinic.hms.entity.DoctorOrgMapping;
import com.clinic.hms.entity.OperationScope;
import com.clinic.hms.entity.OrgHospital;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure-logic tests for doctor affiliation rules (lookup privacy, onboard, unlink).
 */
class DoctorAffiliationRulesTest {

    @Test
    void foreignInternalLookupIsNotFound() {
        Doctor internal = doctor(1L, "DOC-111111", OperationScope.INTERNAL);
        OrgHospital orgA = org(10L, "Hospital A");
        OrgHospital orgB = org(20L, "Hospital B");
        List<DoctorOrgMapping> mappings = List.of(activeMapping(internal, orgA));

        assertTrue(isForeignInternal(internal, orgB.getId(), mappings));
        assertFalse(isForeignInternal(internal, orgA.getId(), mappings));
    }

    @Test
    void independentIsNeverForeignInternal() {
        Doctor independent = doctor(2L, "DOC-222222", OperationScope.INDEPENDENT);
        assertFalse(isForeignInternal(independent, 99L, List.of()));
    }

    /** P-DOC-2: unlink soft-sets INACTIVE; uniqueId remains. */
    @Test
    void unlinkKeepsAccountAndUniqueId() {
        Doctor doctor = doctor(3L, "DOC-333333", OperationScope.INDEPENDENT);
        OrgHospital org = org(30L, "Clinic");
        DoctorOrgMapping mapping = activeMapping(doctor, org);

        softUnlink(mapping);

        assertEquals(AppConstants.Status.INACTIVE, mapping.getStatus());
        assertEquals("DOC-333333", doctor.getUniqueId());
        assertFalse(Boolean.TRUE.equals(doctor.getIsDeleted()));
    }

    /** P-DOC-1: reactivate does not create a second mapping row. */
    @Test
    void reactivateDoesNotDuplicateMapping() {
        Doctor doctor = doctor(4L, "DOC-444444", OperationScope.INDEPENDENT);
        OrgHospital org = org(40L, "Clinic");
        List<DoctorOrgMapping> store = new ArrayList<>();
        store.add(inactiveMapping(doctor, org));

        onboard(store, doctor, org);
        onboard(store, doctor, org); // second call should conflict or no-op ACTIVE

        long activeCount = store.stream()
                .filter(m -> m.getDoctor().getId().equals(doctor.getId()))
                .filter(m -> m.getOrg().getId().equals(org.getId()))
                .count();
        assertEquals(1, activeCount);
        assertEquals(AppConstants.Status.ACTIVE, store.get(0).getStatus());
    }

    /** P-DOC-3: foreign INTERNAL lookup never exposes name/speciality. */
    @Test
    void foreignInternalLookupExposesNoPii() {
        Doctor internal = doctor(5L, "DOC-555555", OperationScope.INTERNAL);
        internal.setFullName("Secret Name");
        internal.setSpeciality("Secret Spec");
        OrgHospital orgA = org(50L, "A");
        List<DoctorOrgMapping> mappings = List.of(activeMapping(internal, orgA));

        Optional<Preview> preview = lookupPreview(internal, 99L, mappings);
        assertTrue(preview.isEmpty());
    }

    // --- helpers mirroring service rules ---

    static boolean isForeignInternal(Doctor doctor, Long callerOrgId, List<DoctorOrgMapping> mappings) {
        if (doctor.getOperationScope() != OperationScope.INTERNAL) {
            return false;
        }
        return mappings.stream().noneMatch(m ->
                m.getDoctor().getId().equals(doctor.getId())
                        && m.getOrg().getId().equals(callerOrgId)
                        && AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()));
    }

    static Optional<Preview> lookupPreview(Doctor doctor, Long callerOrgId, List<DoctorOrgMapping> mappings) {
        if (isForeignInternal(doctor, callerOrgId, mappings)) {
            return Optional.empty();
        }
        return Optional.of(new Preview(doctor.getUniqueId(), doctor.getFullName(), doctor.getSpeciality()));
    }

    static void softUnlink(DoctorOrgMapping mapping) {
        mapping.setStatus(AppConstants.Status.INACTIVE);
        mapping.setUpdatedAt(LocalDateTime.now());
    }

    static void onboard(List<DoctorOrgMapping> store, Doctor doctor, OrgHospital org) {
        Optional<DoctorOrgMapping> existing = store.stream()
                .filter(m -> m.getDoctor().getId().equals(doctor.getId()) && m.getOrg().getId().equals(org.getId()))
                .findFirst();
        if (existing.isPresent()) {
            DoctorOrgMapping m = existing.get();
            if (AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())) {
                return;
            }
            m.setStatus(AppConstants.Status.ACTIVE);
            m.setUpdatedAt(LocalDateTime.now());
        } else {
            store.add(activeMapping(doctor, org));
        }
    }

    record Preview(String uniqueId, String fullName, String speciality) {}

    static Doctor doctor(Long id, String uniqueId, OperationScope scope) {
        Doctor d = new Doctor();
        d.setId(id);
        d.setUniqueId(uniqueId);
        d.setOperationScope(scope);
        d.setFullName("Dr " + id);
        d.setSpeciality("Dentistry");
        d.setIsDeleted(false);
        return d;
    }

    static OrgHospital org(Long id, String name) {
        return OrgHospital.builder().id(id).orgName(name).build();
    }

    static DoctorOrgMapping activeMapping(Doctor doctor, OrgHospital org) {
        return DoctorOrgMapping.builder()
                .id(doctor.getId() * 100 + org.getId())
                .doctor(doctor)
                .org(org)
                .status(AppConstants.Status.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    static DoctorOrgMapping inactiveMapping(Doctor doctor, OrgHospital org) {
        DoctorOrgMapping m = activeMapping(doctor, org);
        m.setStatus(AppConstants.Status.INACTIVE);
        return m;
    }
}
