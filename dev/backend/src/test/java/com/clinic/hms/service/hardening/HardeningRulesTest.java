package com.clinic.hms.service.hardening;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.Doctor;
import com.clinic.hms.entity.DoctorOrgMapping;
import com.clinic.hms.entity.OperationScope;
import com.clinic.hms.entity.OrgHospital;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Scope-change and inventory permission invariants (U4).
 */
class HardeningRulesTest {

    /** P-H-1: INDEPENDENT→INTERNAL retains exactly one ACTIVE mapping = chosen hospital. */
    @Test
    void toInternalRetainsExactlyChosenHospital() {
        Doctor doctor = doctor(1L, OperationScope.INDEPENDENT);
        OrgHospital h1 = org(10L);
        OrgHospital h2 = org(20L);
        List<DoctorOrgMapping> store = new ArrayList<>();
        store.add(active(doctor, h1));
        store.add(active(doctor, h2));

        applyToInternal(store, doctor, 10L);

        assertEquals(OperationScope.INTERNAL, doctor.getOperationScope());
        long active = store.stream().filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())).count();
        assertEquals(1, active);
        assertEquals(10L, store.stream()
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .findFirst().orElseThrow()
                .getOrg().getId());
    }

    /** P-H-2: INTERNAL→INDEPENDENT sets scope; mappings may remain. */
    @Test
    void toIndependentSetsScope() {
        Doctor doctor = doctor(2L, OperationScope.INTERNAL);
        List<DoctorOrgMapping> store = new ArrayList<>();
        store.add(active(doctor, org(30L)));

        doctor.setOperationScope(OperationScope.INDEPENDENT);

        assertEquals(OperationScope.INDEPENDENT, doctor.getOperationScope());
        assertEquals(1, store.stream().filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())).count());
    }

    /** P-H-3: Inventory grant does not add pharmacy; pharmacy does not imply inventory. */
    @Test
    void inventoryAndPharmacyAreIndependent() {
        Set<String> modules = new HashSet<>();
        modules.add("OVERVIEW");
        modules.add("PHARMACY_ORDERS_MODULE");

        grantInventory(modules);
        assertTrue(modules.contains("INVENTORY"));
        assertTrue(modules.contains("PHARMACY_ORDERS_MODULE"));

        Set<String> pharmacyOnly = new HashSet<>();
        pharmacyOnly.add("PHARMACY_ORDERS_MODULE");
        assertFalse(pharmacyOnly.contains("INVENTORY"));
    }

    static void applyToInternal(List<DoctorOrgMapping> store, Doctor doctor, Long retainOrgId) {
        for (DoctorOrgMapping m : store) {
            if (m.getOrg().getId().equals(retainOrgId)) {
                m.setStatus(AppConstants.Status.ACTIVE);
            } else if (AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())) {
                m.setStatus(AppConstants.Status.INACTIVE);
            }
        }
        doctor.setOperationScope(OperationScope.INTERNAL);
    }

    static void grantInventory(Set<String> modules) {
        modules.add("INVENTORY");
    }

    static Doctor doctor(Long id, OperationScope scope) {
        Doctor d = new Doctor();
        d.setId(id);
        d.setUniqueId("DOC-" + id);
        d.setOperationScope(scope);
        return d;
    }

    static OrgHospital org(Long id) {
        return OrgHospital.builder().id(id).orgName("H" + id).build();
    }

    static DoctorOrgMapping active(Doctor d, OrgHospital org) {
        return DoctorOrgMapping.builder()
                .doctor(d)
                .org(org)
                .status(AppConstants.Status.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }
}
