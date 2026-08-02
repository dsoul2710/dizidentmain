package com.clinic.hms.service;

import com.clinic.hms.dto.request.LoginRequest;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.exception.InvalidCredentialsException;
import com.clinic.hms.repository.*;
import com.clinic.hms.security.JwtUtil;
import com.clinic.hms.security.LegacyCompatiblePasswordEncoder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

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

    private final LegacyCompatiblePasswordEncoder passwordEncoder = new LegacyCompatiblePasswordEncoder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "passwordEncoder", passwordEncoder);
        ReflectionTestUtils.setField(authService, "cookieSecure", false);
    }

    @Test
    void login_upgradesLegacyPasswordToBcrypt() {
        User user = User.builder()
                .id(1L)
                .mobile("9999999999")
                .password("plainpass")
                .role(UserRole.DOCTOR)
                .isActive(true)
                .build();

        when(userRepository.findByMobile("9999999999")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(any(), anyString(), anyString())).thenReturn("jwt-token");
        when(modulePermissionRepository.findByUserId(1L)).thenReturn(java.util.List.of());
        when(doctorRepository.findById(1L)).thenReturn(Optional.empty());

        LoginRequest request = new LoginRequest();
        request.setMobile("9999999999");
        request.setPassword("plainpass");

        authService.login(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, atLeastOnce()).save(captor.capture());
        assertTrue(captor.getValue().getPassword().startsWith("{bcrypt}"));
    }

    @Test
    void login_invalidPasswordThrows() {
        User user = User.builder()
                .id(1L)
                .mobile("9999999999")
                .password("plainpass")
                .role(UserRole.DOCTOR)
                .isActive(true)
                .build();

        when(userRepository.findByMobile("9999999999")).thenReturn(Optional.of(user));

        LoginRequest request = new LoginRequest();
        request.setMobile("9999999999");
        request.setPassword("wrong");

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
    }
}
