package com.clinic.hms.controller;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.security.SecurityUtils;
import com.clinic.hms.service.logto.LogtoProvisioningService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/logto")
@RequiredArgsConstructor
public class LogtoProvisioningController {

    private final LogtoProvisioningService provisioningService;
    private final SecurityUtils securityUtils;

    @PostMapping("/organizations/{hmsOrgId}/sync")
    public ResponseEntity<Map<String, String>> syncOrganization(@PathVariable Long hmsOrgId) {
        checkSuperAdmin();
        return provisioningService.syncHmsOrganizationToLogto(hmsOrgId)
                .map(logtoOrgId -> ResponseEntity.ok(Map.of(
                        "hmsOrgId", String.valueOf(hmsOrgId),
                        "logtoOrgId", logtoOrgId)))
                .orElseGet(() -> ResponseEntity.accepted().body(Map.of(
                        "hmsOrgId", String.valueOf(hmsOrgId),
                        "status", "skipped",
                        "reason", "Management API not configured or sync failed")));
    }

    @PostMapping("/users/link")
    public ResponseEntity<Map<String, Object>> linkUser(
            @RequestParam String logtoUserId,
            @RequestParam String mobile,
            @RequestParam(defaultValue = "PATIENT") UserRole role) {
        checkSuperAdmin();
        var user = provisioningService.linkLogtoUserManually(logtoUserId, mobile, role);
        return ResponseEntity.ok(Map.of(
                "hmsUserId", user.getId(),
                "logtoUserId", user.getLogtoUserId(),
                "role", user.getRole().name()));
    }

    private void checkSuperAdmin() {
        String role = securityUtils.getCurrentUserRole();
        if (role == null || (!AppConstants.Roles.SUPER_ADMIN.equalsIgnoreCase(role)
                && !"SUPERADMIN".equalsIgnoreCase(role))) {
            throw new SecurityException("Only Super Admin can manage Logto provisioning");
        }
    }
}
