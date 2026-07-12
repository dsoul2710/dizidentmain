package com.clinic.hms.service.attribution;

import com.clinic.hms.dto.response.SourceAttribution;
import com.clinic.hms.dto.response.SourceType;
import com.clinic.hms.entity.OrgHospital;

/**
 * Maps persisted source org (or null) to API attribution fields.
 */
public final class SourceAttributionMapper {

    private SourceAttributionMapper() {}

    public static SourceAttribution fromOrg(OrgHospital org) {
        if (org == null) {
            return ownPractice();
        }
        return SourceAttribution.builder()
                .sourceOrgId(org.getId())
                .sourceOrgName(org.getOrgName())
                .sourceType(SourceType.HOSPITAL)
                .build();
    }

    public static SourceAttribution fromOrgIdAndName(Long orgId, String orgName) {
        if (orgId == null) {
            return ownPractice();
        }
        return SourceAttribution.builder()
                .sourceOrgId(orgId)
                .sourceOrgName(orgName)
                .sourceType(SourceType.HOSPITAL)
                .build();
    }

    public static SourceAttribution ownPractice() {
        return SourceAttribution.builder()
                .sourceOrgId(null)
                .sourceOrgName(null)
                .sourceType(SourceType.OWN_PRACTICE)
                .build();
    }
}
