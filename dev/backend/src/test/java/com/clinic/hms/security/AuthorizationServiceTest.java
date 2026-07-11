package com.clinic.hms.security;

import com.clinic.hms.entity.OrgHospital;
import com.clinic.hms.repository.DoctorOrgMappingRepository;
import com.clinic.hms.repository.ModulePermissionRepository;
import com.clinic.hms.repository.OrgHospitalRepository;
import com.clinic.hms.repository.PatientOrgMappingRepository;
import com.clinic.hms.repository.ServiceProviderOrgMappingRepository;
import com.clinic.hms.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthorizationServiceTest {

    @Mock
    private OrgHospitalRepository orgHospitalRepository;
    @Mock
    private DoctorOrgMappingRepository doctorOrgMappingRepository;
    @Mock
    private ServiceProviderOrgMappingRepository serviceProviderOrgMappingRepository;
    @Mock
    private PatientOrgMappingRepository patientOrgMappingRepository;
    @Mock
    private ModulePermissionRepository modulePermissionRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AuthorizationService authorizationService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void hasScopeReturnsTrueWhenScopeInJwt() {
        Jwt jwt = jwtWithScope("patients:read");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, jwt, List.of()));

        assertTrue(authorizationService.hasScope("patients:read"));
        assertFalse(authorizationService.hasScope("pharmacy:manage"));
    }

    @Test
    void isMemberOfLogtoOrgChecksOrganizationsClaim() {
        Jwt jwt = Jwt.withTokenValue("t")
                .header("alg", "ES384")
                .subject("user-1")
                .claim("organizations", List.of("org_logto_a"))
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, jwt, List.of()));

        assertTrue(authorizationService.isMemberOfLogtoOrg("org_logto_a"));
        assertFalse(authorizationService.isMemberOfLogtoOrg("org_other"));
    }

    @Test
    void mapLogtoOrgToHmsOrgIdUsesRepository() {
        OrgHospital org = new OrgHospital();
        org.setId(42L);
        when(orgHospitalRepository.findByLogtoOrgIdAndIsDeletedFalse("org_logto_a"))
                .thenReturn(Optional.of(org));

        assertEquals(Optional.of(42L), authorizationService.mapLogtoOrgToHmsOrgId("org_logto_a"));
    }

    private static Jwt jwtWithScope(String scope) {
        return Jwt.withTokenValue("token")
                .header("alg", "ES384")
                .subject("sub")
                .claim("scope", "openid " + scope)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }
}
