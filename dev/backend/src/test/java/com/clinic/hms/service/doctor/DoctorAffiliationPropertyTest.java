package com.clinic.hms.service.doctor;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.Doctor;
import com.clinic.hms.entity.DoctorOrgMapping;
import com.clinic.hms.entity.OperationScope;
import com.clinic.hms.entity.OrgHospital;
import com.pholser.junit.quickcheck.Property;
import com.pholser.junit.quickcheck.generator.InRange;
import com.pholser.junit.quickcheck.runner.JUnitQuickcheck;
import org.junit.runner.RunWith;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

/**
 * P-DOC-1 / P-DOC-3 property checks for affiliation invariants.
 */
@RunWith(JUnitQuickcheck.class)
public class DoctorAffiliationPropertyTest {

    @Property
    public void reactivateNeverDuplicates(
            @InRange(minLong = 1, maxLong = 10000) long doctorId,
            @InRange(minLong = 1, maxLong = 10000) long orgId) {
        Doctor doctor = new Doctor();
        doctor.setId(doctorId);
        doctor.setUniqueId("DOC-" + String.format("%06d", doctorId % 1_000_000));
        doctor.setOperationScope(OperationScope.INDEPENDENT);

        OrgHospital org = OrgHospital.builder().id(orgId).orgName("Org-" + orgId).build();
        List<DoctorOrgMapping> store = new ArrayList<>();
        DoctorOrgMapping inactive = DoctorOrgMapping.builder()
                .doctor(doctor)
                .org(org)
                .status(AppConstants.Status.INACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        store.add(inactive);

        DoctorAffiliationRulesTest.onboard(store, doctor, org);
        DoctorAffiliationRulesTest.onboard(store, doctor, org);

        long rows = store.stream()
                .filter(m -> m.getDoctor().getId().equals(doctorId) && m.getOrg().getId().equals(orgId))
                .count();
        assertEquals(1, rows);
        assertEquals(AppConstants.Status.ACTIVE, store.get(0).getStatus());
    }

    @Property
    public void foreignInternalNeverReturnsPreview(
            @InRange(minLong = 1, maxLong = 10000) long doctorId,
            @InRange(minLong = 1, maxLong = 10000) long boundOrgId,
            @InRange(minLong = 1, maxLong = 10000) long callerOrgId) {
        if (boundOrgId == callerOrgId) {
            callerOrgId = boundOrgId + 1;
        }
        Doctor doctor = new Doctor();
        doctor.setId(doctorId);
        doctor.setUniqueId("DOC-" + String.format("%06d", doctorId % 1_000_000));
        doctor.setFullName("Hidden");
        doctor.setSpeciality("HiddenSpec");
        doctor.setOperationScope(OperationScope.INTERNAL);

        OrgHospital bound = OrgHospital.builder().id(boundOrgId).orgName("Bound").build();
        List<DoctorOrgMapping> mappings = List.of(
                DoctorOrgMapping.builder()
                        .doctor(doctor)
                        .org(bound)
                        .status(AppConstants.Status.ACTIVE)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build()
        );

        assertTrue(DoctorAffiliationRulesTest.lookupPreview(doctor, callerOrgId, mappings).isEmpty());
    }
}
