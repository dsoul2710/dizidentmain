package com.clinic.hms.dto.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrganizationResponse {
    private Long id;
    private String name;
    private String mobile;
    private Boolean isActive;
    private String createdAt;
}
