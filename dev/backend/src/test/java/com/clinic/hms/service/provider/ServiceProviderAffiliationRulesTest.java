package com.clinic.hms.service.provider;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.OperationScope;
import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.entity.ServiceProvider;
import com.clinic.hms.entity.ServiceProviderOrgMapping;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class ServiceProviderAffiliationRulesTest {

    @Test
    void foreignInternalLookupIsNotFound() {
        ServiceProvider internal = provider(1L, "SP-111111", OperationScope.INTERNAL);
        OrgHospital orgA = org(10L, "Hospital A");
        List<ServiceProviderOrgMapping> mappings = List.of(activeMapping(internal, orgA));

        assertTrue(isForeignInternal(internal, 20L, mappings));
        assertFalse(isForeignInternal(internal, 10L, mappings));
    }

    @Test
    void unlinkKeepsAccountAndUniqueId() {
        ServiceProvider sp = provider(3L, "SP-333333", OperationScope.INDEPENDENT);
        OrgHospital org = org(30L, "Clinic");
        ServiceProviderOrgMapping mapping = activeMapping(sp, org);

        softUnlink(mapping);

        assertEquals(AppConstants.Status.INACTIVE, mapping.getStatus());
        assertEquals("SP-333333", sp.getUniqueId());
        assertFalse(Boolean.TRUE.equals(sp.getIsDeleted()));
    }

    @Test
    void reactivateDoesNotDuplicateMapping() {
        ServiceProvider sp = provider(4L, "SP-444444", OperationScope.INDEPENDENT);
        OrgHospital org = org(40L, "Clinic");
        List<ServiceProviderOrgMapping> store = new ArrayList<>();
        store.add(inactiveMapping(sp, org));

        onboard(store, sp, org);
        onboard(store, sp, org);

        long rows = store.stream()
                .filter(m -> m.getServiceProvider().getId().equals(sp.getId()))
                .filter(m -> m.getOrg().getId().equals(org.getId()))
                .count();
        assertEquals(1, rows);
        assertEquals(AppConstants.Status.ACTIVE, store.get(0).getStatus());
    }

    @Test
    void foreignInternalLookupExposesNoPii() {
        ServiceProvider internal = provider(5L, "SP-555555", OperationScope.INTERNAL);
        internal.setProviderName("Secret Lab");
        OrgHospital orgA = org(50L, "A");
        List<ServiceProviderOrgMapping> mappings = List.of(activeMapping(internal, orgA));

        assertTrue(lookupPreview(internal, 99L, mappings).isEmpty());
    }

    /** NFR-T3: org-scoped list only includes ACTIVE mappings for caller org. */
    @Test
    void orgScopedListExcludesOtherOrgProviders() {
        ServiceProvider a = provider(1L, "SP-000001", OperationScope.INDEPENDENT);
        ServiceProvider b = provider(2L, "SP-000002", OperationScope.INDEPENDENT);
        OrgHospital orgA = org(10L, "A");
        OrgHospital orgB = org(20L, "B");
        List<ServiceProviderOrgMapping> store = List.of(
                activeMapping(a, orgA),
                activeMapping(b, orgB)
        );

        List<Long> forOrgA = store.stream()
                .filter(m -> m.getOrg().getId().equals(10L))
                .filter(m -> AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()))
                .map(m -> m.getServiceProvider().getId())
                .collect(Collectors.toList());

        assertEquals(List.of(1L), forOrgA);
        assertFalse(forOrgA.contains(2L));
    }

    static boolean isForeignInternal(ServiceProvider sp, Long callerOrgId, List<ServiceProviderOrgMapping> mappings) {
        if (sp.getOperationScope() != OperationScope.INTERNAL) {
            return false;
        }
        return mappings.stream().noneMatch(m ->
                m.getServiceProvider().getId().equals(sp.getId())
                        && m.getOrg().getId().equals(callerOrgId)
                        && AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus()));
    }

    static Optional<Preview> lookupPreview(ServiceProvider sp, Long callerOrgId, List<ServiceProviderOrgMapping> mappings) {
        if (isForeignInternal(sp, callerOrgId, mappings)) {
            return Optional.empty();
        }
        return Optional.of(new Preview(sp.getUniqueId(), sp.getProviderName()));
    }

    static void softUnlink(ServiceProviderOrgMapping mapping) {
        mapping.setStatus(AppConstants.Status.INACTIVE);
        mapping.setUpdatedAt(LocalDateTime.now());
    }

    static void onboard(List<ServiceProviderOrgMapping> store, ServiceProvider sp, OrgHospital org) {
        Optional<ServiceProviderOrgMapping> existing = store.stream()
                .filter(m -> m.getServiceProvider().getId().equals(sp.getId()) && m.getOrg().getId().equals(org.getId()))
                .findFirst();
        if (existing.isPresent()) {
            ServiceProviderOrgMapping m = existing.get();
            if (AppConstants.Status.ACTIVE.equalsIgnoreCase(m.getStatus())) {
                return;
            }
            m.setStatus(AppConstants.Status.ACTIVE);
            m.setUpdatedAt(LocalDateTime.now());
        } else {
            store.add(activeMapping(sp, org));
        }
    }

    record Preview(String uniqueId, String providerName) {}

    static ServiceProvider provider(Long id, String uniqueId, OperationScope scope) {
        ServiceProvider sp = new ServiceProvider();
        sp.setId(id);
        sp.setUniqueId(uniqueId);
        sp.setOperationScope(scope);
        sp.setProviderName("Provider " + id);
        sp.setIsDeleted(false);
        return sp;
    }

    static OrgHospital org(Long id, String name) {
        return OrgHospital.builder().id(id).orgName(name).build();
    }

    static ServiceProviderOrgMapping activeMapping(ServiceProvider sp, OrgHospital org) {
        return ServiceProviderOrgMapping.builder()
                .id(sp.getId() * 100 + org.getId())
                .serviceProvider(sp)
                .org(org)
                .status(AppConstants.Status.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    static ServiceProviderOrgMapping inactiveMapping(ServiceProvider sp, OrgHospital org) {
        ServiceProviderOrgMapping m = activeMapping(sp, org);
        m.setStatus(AppConstants.Status.INACTIVE);
        return m;
    }
}
