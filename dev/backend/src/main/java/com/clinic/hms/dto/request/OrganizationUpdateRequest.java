package com.clinic.hms.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizationUpdateRequest {
    private String name;
    private String mobile;
    private String password;
    private Boolean isActive;
}
