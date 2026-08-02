package com.clinic.hms.service.attribution;

import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.repository.OrgHospitalRepository;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Resolves active org for write-path attribution from security context / X-Active-Org-Id.
 * Invalid or missing org → empty (OWN_PRACTICE); authz may still reject the request separately.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SourceOrgResolver {

    private final SecurityUtils securityUtils;
    private final OrgHospitalRepository orgHospitalRepository;

    public OrgHospital resolveSourceOrgForCreate() {
        Long orgId = null;
        try {
            orgId = securityUtils.getActiveOrgId();
        } catch (Exception e) {
            log.debug("No active org for attribution: {}", e.toString());
        }
        if (orgId == null) {
            log.debug("attribution sourceOrg=null reason=no_active_org");
            return null;
        }
        OrgHospital org = orgHospitalRepository.findById(orgId).orElse(null);
        if (org == null) {
            log.debug("attribution sourceOrg=null reason=unknown_org_id orgId={}", orgId);
            return null;
        }
        log.debug("attribution sourceOrg set orgId={}", orgId);
        return org;
    }
}
