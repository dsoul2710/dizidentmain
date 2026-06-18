package com.clinic.hms.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OrganizationUpdateRequest extends OrganizationCreateRequest {
    private Boolean isActive;
}
