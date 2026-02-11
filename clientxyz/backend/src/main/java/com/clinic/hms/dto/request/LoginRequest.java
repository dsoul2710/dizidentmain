package com.clinic.hms.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {
    private String mobile;
    private String password;
}
