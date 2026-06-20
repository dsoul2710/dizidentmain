package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
public class LoginResponse {
    private Long userId;
    private String mobile;
    private String role;
    private String name; // optional, from user_details later
    private String providerType; // LAB, PHARMACY, BED_MANAGER, etc.
    private Set<String> providerTypes;
    private List<ModulePermissionResponse> permissions;
}

