package com.clinic.hms.service.attribution;

import com.clinic.hms.dto.response.SourceAttribution;
import com.clinic.hms.dto.response.SourceType;
import com.clinic.hms.entity.OrgHospital;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class SourceAttributionMapperTest {

    @Test
    void fromOrg_mapsHospital() {
        OrgHospital org = OrgHospital.builder().id(12L).orgName("City Dental").build();
        SourceAttribution a = SourceAttributionMapper.fromOrg(org);
        assertEquals(12L, a.getSourceOrgId());
        assertEquals("City Dental", a.getSourceOrgName());
        assertEquals(SourceType.HOSPITAL, a.getSourceType());
    }

    @Test
    void fromOrg_nullIsOwnPractice() {
        SourceAttribution a = SourceAttributionMapper.fromOrg(null);
        assertNull(a.getSourceOrgId());
        assertEquals(SourceType.OWN_PRACTICE, a.getSourceType());
    }

    /** P-ATTR-2: applying backfill twice does not change already-filled rows. */
    @Test
    void backfillIdempotent() {
        Map<Long, Long> sourceByRow = new HashMap<>();
        sourceByRow.put(1L, null);
        sourceByRow.put(2L, 99L);

        backfill(sourceByRow, Map.of(1L, 10L, 2L, 20L));
        Map<Long, Long> afterFirst = Map.copyOf(sourceByRow);
        backfill(sourceByRow, Map.of(1L, 10L, 2L, 20L));

        assertEquals(afterFirst, sourceByRow);
        assertEquals(10L, sourceByRow.get(1L));
        assertEquals(99L, sourceByRow.get(2L));
    }

    private static void backfill(Map<Long, Long> sourceByRow, Map<Long, Long> fromOwner) {
        for (Map.Entry<Long, Long> e : fromOwner.entrySet()) {
            if (sourceByRow.get(e.getKey()) == null) {
                sourceByRow.put(e.getKey(), e.getValue());
            }
        }
    }
}
