package com.clinic.hms.service.attribution;

import com.clinic.hms.dto.response.SourceAttribution;
import com.clinic.hms.dto.response.SourceType;
import com.clinic.hms.entity.OrgHospital;
import com.pholser.junit.quickcheck.Property;
import com.pholser.junit.quickcheck.runner.JUnitQuickcheck;
import org.junit.runner.RunWith;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

/**
 * P-ATTR-1: entity sourceOrg ↔ DTO fields round-trip.
 */
@RunWith(JUnitQuickcheck.class)
public class SourceAttributionMapperPropertyTest {

    @Property
    public void hospitalRoundTrip(long orgId, String orgName) {
        if (orgName == null || orgName.isBlank()) {
            orgName = "Hospital-" + Math.abs(orgId % 1000);
        }
        OrgHospital org = OrgHospital.builder()
                .id(Math.abs(orgId % 1_000_000) + 1)
                .orgName(orgName)
                .build();

        SourceAttribution dto = SourceAttributionMapper.fromOrg(org);
        assertEquals(SourceType.HOSPITAL, dto.getSourceType());
        assertEquals(org.getId(), dto.getSourceOrgId());
        assertEquals(org.getOrgName(), dto.getSourceOrgName());

        SourceAttribution again = SourceAttributionMapper.fromOrgIdAndName(dto.getSourceOrgId(), dto.getSourceOrgName());
        assertEquals(dto.getSourceType(), again.getSourceType());
        assertEquals(dto.getSourceOrgId(), again.getSourceOrgId());
        assertEquals(dto.getSourceOrgName(), again.getSourceOrgName());
    }

    @Property
    public void nullOrgIsOwnPractice() {
        SourceAttribution dto = SourceAttributionMapper.fromOrg(null);
        assertEquals(SourceType.OWN_PRACTICE, dto.getSourceType());
        assertNull(dto.getSourceOrgId());
        assertNull(dto.getSourceOrgName());
    }
}
