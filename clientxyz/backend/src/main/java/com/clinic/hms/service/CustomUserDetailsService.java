package com.clinic.hms.service;

import com.clinic.hms.entity.User;
import com.clinic.hms.repository.UserRepository;
import com.clinic.hms.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String mobile) throws UsernameNotFoundException {
        User user = userRepository.findByMobile(mobile)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + mobile));
        return new CustomUserDetails(user);
    }
}
