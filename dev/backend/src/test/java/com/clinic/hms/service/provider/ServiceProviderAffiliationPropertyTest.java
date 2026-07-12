package com.clinic.hms.service.provider;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.OperationScope;
import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.entity.ServiceProvider;
import com.clinic.hms.entity.ServiceProviderOrgMapping;
import com.pholser.junit.quickcheck.Property;
import com.pholser.junit.quickcheck.generator.InRange;
import com.pholser.junit.quickcheck.runner.JUnitQuickcheck;
import org.junit.runner.RunWith;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

@RunWith(JUnitQuickcheck.class)
public class ServiceProviderAffiliationPropertyTest {

    @Property
    public void reactivateNeverDuplicates(
            @InRange(minLong = 1, maxLong = 10000) long providerId,
            @InRange(minLong = 1, maxLong = 10000) long orgId) {
        ServiceProvider sp = new ServiceProvider();
        sp.setId(providerId);
        sp.setUniqueId("SP-" + String.format("%06d", providerId % 1_000_000));
        sp.setOperationScope(OperationScope.INDEPENDENT);

        OrgHospital org = OrgHospital.builder().id(orgId).orgName("Org-" + orgId).build();
        List<ServiceProviderOrgMapping> store = new ArrayList<>();
        store.add(ServiceProviderOrgMapping.builder()
                .serviceProvider(sp)
                .org(org)
                .status(AppConstants.Status.INACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build());

        ServiceProviderAffiliationRulesTest.onboard(store, sp, org);
        ServiceProviderAffiliationRulesTest.onboard(store, sp, org);

        long rows = store.stream()
                .filter(m -> m.getServiceProvider().getId().equals(providerId) && m.getOrg().getId().equals(orgId))
                .count();
        assertEquals(1, rows);
        assertEquals(AppConstants.Status.ACTIVE, store.get(0).getStatus());
    }

    @Property
    public void foreignInternalNeverReturnsPreview(
            @InRange(minLong = 1, maxLong = 10000) long providerId,
            @InRange(minLong = 1, maxLong = 10000) long boundOrgId,
            @InRange(minLong = 1, maxLong = 10000) long callerOrgId) {
        if (boundOrgId == callerOrgId) {
            callerOrgId = boundOrgId + 1;
        }
        ServiceProvider sp = new ServiceProvider();
        sp.setId(providerId);
        sp.setUniqueId("SP-" + String.format("%06d", providerId % 1_000_000));
        sp.setProviderName("Hidden");
        sp.setOperationScope(OperationScope.INTERNAL);

        OrgHospital bound = OrgHospital.builder().id(boundOrgId).orgName("Bound").build();
        List<ServiceProviderOrgMapping> mappings = List.of(
                ServiceProviderOrgMapping.builder()
                        .serviceProvider(sp)
                        .org(bound)
                        .status(AppConstants.Status.ACTIVE)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build()
        );

        assertTrue(ServiceProviderAffiliationRulesTest.lookupPreview(sp, callerOrgId, mappings).isEmpty());
    }
}
