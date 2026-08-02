package com.clinic.hms.service;

import com.clinic.hms.dto.response.MeResponse;
import com.clinic.hms.repository.*;
import com.clinic.hms.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceLogtoProfileTest {

    private static final String LOCAL_API_RESOURCE = "http://localhost:8081/api";

    @Mock private UserRepository userRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private OrgHospitalRepository orgHospitalRepository;
    @Mock private ServiceProviderRepository serviceProviderRepository;
    @Mock private SuperAdminRepository superAdminRepository;
    @Mock private ModulePermissionRepository modulePermissionRepository;
    @Mock private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    private Authentication logtoAuth;

    @BeforeEach
    void setUp() {
        Jwt jwt = Jwt.withTokenValue("test-token")
                .header("alg", "ES384")
                .subject("logto-user-abc")
                .audience(List.of(LOCAL_API_RESOURCE))
                .claim("scope", "openid profile")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        logtoAuth = mock(Authentication.class);
        when(logtoAuth.isAuthenticated()).thenReturn(true);
        when(logtoAuth.getPrincipal()).thenReturn(jwt);
    }

    @Test
    void getCurrentProfile_returnsUnlinkedForUnknownLogtoUser() {
        when(userRepository.findByLogtoUserId("logto-user-abc")).thenReturn(Optional.empty());

        MeResponse me = authService.getCurrentProfile(logtoAuth);

        assertEquals("logto-user-abc", me.logtoSub());
        assertFalse(me.linked());
        assertNull(me.hmsUserId());
    }
}
