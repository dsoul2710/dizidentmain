package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Resolves data-owner scope for reporting endpoints (org / doctor / super-admin).
 */
@Service
@RequiredArgsConstructor
public class ReportScopeService {

    private final SecurityUtils securityUtils;

    /**
     * Owner user id for org-scoped entities (bills, visits, inventory). Null for super-admin global view.
     */
    public Long resolveOwnerUserIdForReports() {
        String role = securityUtils.getCurrentUserRole();
        if (role == null) {
            return null;
        }
        if (AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role) || "SUPERADMIN".equalsIgnoreCase(role)) {
            return null;
        }
        if (AppConstants.Roles.ORG_HOSPITAL.equalsIgnoreCase(role) || "ORG".equalsIgnoreCase(role)) {
            return securityUtils.getCurrentUserId();
        }
        if (AppConstants.Roles.DOCTOR.equalsIgnoreCase(role)
                || AppConstants.Roles.SERVICE_PROVIDER.equalsIgnoreCase(role)) {
            return securityUtils.getActiveOrgId();
        }
        if (AppConstants.Roles.PATIENT.equalsIgnoreCase(role)) {
            return securityUtils.getActiveOrgId();
        }
        return securityUtils.getCurrentUserId();
    }

    public boolean isSuperAdmin() {
        String role = securityUtils.getCurrentUserRole();
        return role != null && (AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role)
                || "SUPERADMIN".equalsIgnoreCase(role));
    }
}
