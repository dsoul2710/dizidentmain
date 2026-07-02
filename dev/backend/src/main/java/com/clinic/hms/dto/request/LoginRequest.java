package com.clinic.hms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "Mobile is required")
    @Size(max = 20, message = "Mobile must be at most 20 characters")
    private String mobile;

    @NotBlank(message = "Password is required")
    @Size(max = 128, message = "Password must be at most 128 characters")
    private String password;
}
