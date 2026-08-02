package com.clinic.hms.service;

import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OrgContextService {

    private final SecurityUtils securityUtils;

    public Long getActiveOrgId() {
        return securityUtils.getActiveOrgId();
    }

    public Long requireActiveOrgId() {
        Long orgId = securityUtils.getActiveOrgId();
        if (orgId == null) {
            throw new IllegalArgumentException("Active organization context is required");
        }
        return orgId;
    }
}
