package com.clinic.hms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class LoginResponse {
    private Long userId;
    private String mobile;
    private String role;
    private String name; // optional, from user_details later
}
