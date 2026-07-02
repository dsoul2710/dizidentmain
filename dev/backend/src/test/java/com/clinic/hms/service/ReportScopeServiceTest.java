package com.clinic.hms.service;

import com.clinic.hms.constants.AppConstants;
import com.clinic.hms.security.SecurityUtils;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportScopeServiceTest {

    @Mock private SecurityUtils securityUtils;
    @InjectMocks private ReportScopeService reportScopeService;

    @Test
    void resolveOwner_orgHospitalUsesCurrentUserId() {
        when(securityUtils.getCurrentUserRole()).thenReturn(AppConstants.Roles.ORG_HOSPITAL);
        when(securityUtils.getCurrentUserId()).thenReturn(42L);
        assertEquals(42L, reportScopeService.resolveOwnerUserIdForReports());
    }

    @Test
    void resolveOwner_superAdminReturnsNull() {
        when(securityUtils.getCurrentUserRole()).thenReturn(AppConstants.Roles.SUPER_ADMIN);
        assertNull(reportScopeService.resolveOwnerUserIdForReports());
        assertTrue(reportScopeService.isSuperAdmin());
    }
}
