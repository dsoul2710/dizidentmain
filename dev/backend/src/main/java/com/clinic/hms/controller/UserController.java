package com.clinic.hms.controller;

import com.clinic.hms.dto.response.UserSummaryResponse;
import com.clinic.hms.entity.User;
import com.clinic.hms.entity.UserDetails;
import com.clinic.hms.repository.UserDetailsRepository;
import com.clinic.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final UserDetailsRepository userDetailsRepository;

    @GetMapping
    public List<UserSummaryResponse> list(@RequestParam(value = "role", required = false) String role) {
        List<User> users = role == null || role.isBlank()
                ? userRepository.findAll()
                : userRepository.findByRole(role.toUpperCase());

        return users.stream()
                .map(user -> {
                    String name = userDetailsRepository.findByUser(user)
                            .map(UserDetails::getFullName)
                            .orElse(user.getMobile());

                    return UserSummaryResponse.builder()
                            .id(user.getId())
                            .name(name)
                            .mobile(user.getMobile())
                            .role(user.getRole())
                            .build();
                })
                .toList();
    }
}
