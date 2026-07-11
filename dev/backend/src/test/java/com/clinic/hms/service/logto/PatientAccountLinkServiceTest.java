package com.clinic.hms.service.logto;

import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserRole;
import com.clinic.hms.repository.PatientRepository;
import com.clinic.hms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientAccountLinkServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PatientAccountLinkService patientAccountLinkService;

    @Test
    void linksExistingUserByMobile() {
        User existing = User.builder().id(5L).mobile("9876543210").role(UserRole.PATIENT).build();
        when(userRepository.findByLogtoUserId("logto-1")).thenReturn(Optional.empty());
        when(userRepository.findByMobile("9876543210")).thenReturn(Optional.of(existing));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User linked = patientAccountLinkService.linkOrCreatePatientUser("logto-1", "9876543210", "Ravi");

        assertEquals("logto-1", linked.getLogtoUserId());
        assertEquals(5L, linked.getId());
    }
}
