package com.clinic.hms.service.hardening;

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

@RunWith(JUnitQuickcheck.class)
public class HardeningPropertyTest {

    @Property
    public void toInternalKeepsSingleActive(
            @InRange(minLong = 1, maxLong = 1000) long retainId,
            @InRange(minLong = 1, maxLong = 1000) long otherId) {
        if (retainId == otherId) {
            otherId = retainId + 1;
        }
        Doctor doctor = new Doctor();
        doctor.setId(1L);
        doctor.setOperationScope(OperationScope.INDEPENDENT);

        List<DoctorOrgMapping> store = new ArrayList<>();
        store.add(DoctorOrgMapping.builder()
                .doctor(doctor)
                .org(OrgHospital.builder().id(retainId).orgName("R").build())
                .status(AppConstants.Status.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());
        store.add(DoctorOrgMapping.builder()
                .doctor(doctor)
                .org(OrgHospital.builder().id(otherId).orgName("O").build())
                .status(AppConstants.Status.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        HardeningRulesTest.applyToInternal(store, doctor, retainId);

        long active = store.stream().filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())).count();
        assertEquals(1, active);
        assertEquals(OperationScope.INTERNAL, doctor.getOperationScope());
        assertEquals(retainId, store.stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .findFirst().get()
                .getOrg().getId().longValue());
    }
}
